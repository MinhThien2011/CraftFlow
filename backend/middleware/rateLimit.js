import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import jwt from 'jsonwebtoken';
import { client, getRedisHealth } from '../config/redisClient.js';

// ====================== CONFIGURATION ======================
const CONFIG = {
    api: {
        windowMs: 15 * 60 * 1000,      // 15 phút
        authenticated: 1200,           // ~2 req/giây
        guest: 200,                    // ~13 req/phút
    },
    strict: {
        windowMs: 5 * 60 * 1000,       // 5 phút
        max: 10,
    },
    login: {
        windowMs: 5 * 60 * 1000,       // 5 phút
        max: 5,
    },
    // Có thể override từ env
    ...JSON.parse(process.env.RATE_LIMIT_CONFIG || '{}'),
};

// ====================== HELPERS ======================
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
        const isValid = id && VALID_USER_ID_RE.test(String(id));
        return (req._rateLimitUserId = isValid ? id : null);
    } catch {
        return (req._rateLimitUserId = null);
    }
};

const shouldSkip = (req) => {
    const whitelist = process.env.IP_WHITELIST?.split(',').map(s => s.trim()).filter(Boolean) ?? [];
    return whitelist.includes(ipKeyGenerator(req.ip));
};

// ====================== REDIS STORE (Lazy + Safe) ======================
let redisStore = null;

const getRedisStore = () => {
    if (redisStore) return redisStore;

    if (!client.isOpen || !getRedisHealth()) {
        return undefined; // fallback MemoryStore
    }

    try {
        redisStore = new RedisStore({
            sendCommand: (...args) => client.sendCommand(args),
            prefix: 'rl:',
        });

        console.log('✅ Redis Rate Limiting Store activated successfully');
        return redisStore;
    } catch (err) {
        console.error('❌ Failed to initialize RedisStore:', err.message);
        return undefined;
    }
};

// ====================== COMMON OPTIONS ======================
const commonOptions = {
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    passOnStoreError: true,
    skip: shouldSkip,
};

// ====================== COMMON HANDLER ======================
const createRateLimitHandler = (message, retryAfter) => (req, res) => {
    res.status(429).json({
        success: false,
        message,
        ...(retryAfter && { retryAfter }),
    });
};

// ====================== DYNAMIC LIMITER FACTORY ======================
const createLimiter = (options) => rateLimit({
    ...commonOptions,
    store: getRedisStore(),
    handler: createRateLimitHandler('Too many requests. Please try again later.'),
    ...options,
});

// ====================== LIMITERS ======================
export const apiLimiter = createLimiter({
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

export const strictLimiter = createLimiter({
    windowMs: CONFIG.strict.windowMs,
    limit: CONFIG.strict.max,
    keyGenerator: (req) => {
        const userId = getUserId(req);
        return userId ? `u:${userId}` : `i:${ipKeyGenerator(req.ip)}`;
    },
    handler: createRateLimitHandler('High traffic detected. Please slow down.'),
});

export const loginLimiter = createLimiter({
    windowMs: CONFIG.login.windowMs,
    limit: CONFIG.login.max,
    keyGenerator: (req) => {
        const ip = ipKeyGenerator(req.ip);
        const raw = req.body?.username || req.body?.email || '';
        const identifier = String(raw).trim().toLowerCase().slice(0, 100);
        return identifier ? `l:${ip}:${identifier}` : `l:${ip}`;
    },
    skipSuccessfulRequests: true,
    handler: createRateLimitHandler('Too many failed login attempts. Account temporarily throttled.'),
});

// ====================== STATUS LOGGER ======================
export const logRateLimitStatus = () => {
    const usingRedis = redisStore !== null;
    console.log('🔒 Rate Limiting System initialized:');
    console.log(`   • Mode: ${usingRedis ? 'Redis (Persistent)' : 'Memory (Fallback)'}`);
    console.log(`   • API Limit : ${CONFIG.api.guest} (guest) / ${CONFIG.api.authenticated} (auth)`);
    console.log(`   • Login Protection active`);
    console.log(`   • Subnet + JWT Abuse Protection enabled`);
};