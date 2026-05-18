import rateLimit, { ipKeyGenerator, MemoryStore } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import jwt from 'jsonwebtoken';
import { client, getRedisHealth, getLastLatency } from '../config/redisClient.js';

const parseRateLimitConfig = () => {
    if (!process.env.RATE_LIMIT_CONFIG) return {};

    try {
        return JSON.parse(process.env.RATE_LIMIT_CONFIG);
    } catch (error) {
        console.error('[RateLimit] Invalid RATE_LIMIT_CONFIG JSON, using defaults:', error.message);
        return {};
    }
};

const CONFIG = {
    api: {
        windowMs: 15 * 60 * 1000,
        authenticated: 1200,
        guest: 200,
    },
    strict: {
        windowMs: 5 * 60 * 1000,
        max: 10,
    },
    login: {
        windowMs: 5 * 60 * 1000,
        max: 5,
    },
    ...parseRateLimitConfig(),
};
const MAX_REDIS_LATENCY_MS = Number(process.env.RATE_LIMIT_REDIS_MAX_LATENCY_MS || 250);

const VALID_USER_ID_RE = /^[a-f0-9]{24}$/i;
const MAX_TOKEN_LENGTH = 2048;

const getUserId = (req) => {
    if (req._rateLimitUserId !== undefined) return req._rateLimitUserId;

    const token = req.cookies?.accessToken;
    if (!token || token.length > MAX_TOKEN_LENGTH || token.split('.').length !== 3) {
        return (req._rateLimitUserId = null);
    }

    try {
        const decoded = jwt.decode(token);
        const id = decoded?.id;
        return (req._rateLimitUserId = id && VALID_USER_ID_RE.test(String(id)) ? String(id) : null);
    } catch {
        return (req._rateLimitUserId = null);
    }
};

const shouldSkip = (req) => {
    const whitelist = process.env.IP_WHITELIST?.split(',').map(s => s.trim()).filter(Boolean) ?? [];
    return whitelist.includes(ipKeyGenerator(req.ip));
};

class HybridRateLimitStore {
    constructor(prefix) {
        this.prefix = prefix;
        this.localKeys = false;
        this.memoryStore = new MemoryStore();
        this.redisStore = new RedisStore({
            sendCommand: (...args) => client.sendCommand(args),
            prefix,
        });
        this.options = null;
        this.redisReady = false;
        this.redisInitPromise = null;
        this.lastRedisErrorLog = 0;
        this.keyStores = new Map();
        this.keyStoreCleanupTimer = null;
    }

    init(options) {
        this.options = options;
        this.memoryStore.init(options);

        if (this.keyStoreCleanupTimer) clearInterval(this.keyStoreCleanupTimer);
        this.keyStoreCleanupTimer = setInterval(() => {
            this.keyStores.clear();
        }, options.windowMs);
        this.keyStoreCleanupTimer.unref?.();
    }

    logRedisFallback(error) {
        const now = Date.now();
        if (now - this.lastRedisErrorLog < 30_000) return;

        this.lastRedisErrorLog = now;
        console.error(`[RateLimit] Redis unavailable for ${this.prefix}; using MemoryStore:`, error.message);
    }

    async getActiveStore() {
        if (!client.isOpen || !getRedisHealth() || getLastLatency() > MAX_REDIS_LATENCY_MS) {
            this.redisReady = false;
            return this.memoryStore;
        }

        if (this.redisReady) return this.redisStore;

        if (!this.redisInitPromise) {
            this.redisInitPromise = this.redisStore
                .init(this.options)
                .then(() => {
                    this.redisReady = true;
                    console.log(`[RateLimit] RedisStore active for ${this.prefix}`);
                })
                .catch((error) => {
                    this.redisReady = false;
                    this.redisInitPromise = null;
                    this.logRedisFallback(error);
                });
        }

        await this.redisInitPromise;
        return this.redisReady ? this.redisStore : this.memoryStore;
    }

    async increment(key) {
        const store = await this.getActiveStore();

        try {
            const result = await store.increment(key);
            this.keyStores.set(key, store === this.redisStore ? 'redis' : 'memory');
            return result;
        } catch (error) {
            this.redisReady = false;
            this.redisInitPromise = null;
            this.logRedisFallback(error);
            const result = await this.memoryStore.increment(key);
            this.keyStores.set(key, 'memory');
            return result;
        }
    }

    async decrement(key) {
        const storeName = this.keyStores.get(key);
        this.keyStores.delete(key);

        if (storeName === 'redis' && this.redisReady) {
            await this.redisStore.decrement(key);
            return;
        }

        await this.memoryStore.decrement(key);
    }

    async resetKey(key) {
        this.keyStores.delete(key);
        await Promise.allSettled([
            this.memoryStore.resetKey(key),
            this.redisReady ? this.redisStore.resetKey(key) : Promise.resolve(),
        ]);
    }
}

const createRateLimitHandler = (message, retryAfter) => (req, res) => {
    res.status(429).json({
        success: false,
        message,
        ...(retryAfter && { retryAfter }),
    });
};

const commonOptions = {
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    passOnStoreError: false,
    skip: shouldSkip,
};

const createLimiter = (name, options) => rateLimit({
    ...commonOptions,
    store: new HybridRateLimitStore(`rl:${name}:`),
    handler: createRateLimitHandler('Too many requests. Please try again later.'),
    ...options,
});

export const apiLimiter = createLimiter('api', {
    windowMs: CONFIG.api.windowMs,
    limit: (req) => getUserId(req) ? CONFIG.api.authenticated : CONFIG.api.guest,
    keyGenerator: (req) => {
        const userId = getUserId(req);
        return userId ? `u:${userId}` : `i:${ipKeyGenerator(req.ip)}`;
    },
    handler: createRateLimitHandler(
        'Too many requests. Please try again later.',
        Math.ceil(CONFIG.api.windowMs / 1000)
    ),
});

export const strictLimiter = createLimiter('strict', {
    windowMs: CONFIG.strict.windowMs,
    limit: CONFIG.strict.max,
    keyGenerator: (req) => {
        const userId = getUserId(req);
        return userId ? `u:${userId}` : `i:${ipKeyGenerator(req.ip)}`;
    },
    handler: createRateLimitHandler('High traffic detected. Please slow down.'),
});

export const loginLimiter = createLimiter('login', {
    windowMs: CONFIG.login.windowMs,
    limit: CONFIG.login.max,
    keyGenerator: (req) => {
        const ip = ipKeyGenerator(req.ip);
        const raw = req.body?.identifier || req.body?.username || req.body?.email || '';
        const identifier = String(raw).trim().toLowerCase().slice(0, 100);
        return identifier ? `l:${ip}:${identifier}` : `l:${ip}`;
    },
    skipSuccessfulRequests: true,
    handler: createRateLimitHandler('Too many failed login attempts. Account temporarily throttled.'),
});

export const logRateLimitStatus = () => {
    console.log('Rate limiting initialized: Hybrid Redis store with MemoryStore fallback');
    console.log(`   - API limit: ${CONFIG.api.guest} guest / ${CONFIG.api.authenticated} authenticated`);
    console.log(`   - Strict limit: ${CONFIG.strict.max} per ${Math.ceil(CONFIG.strict.windowMs / 1000)}s`);
    console.log(`   - Login protection active`);
};
