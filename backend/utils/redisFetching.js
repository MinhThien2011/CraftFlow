import { client, getRedisHealth, getLastLatency } from '../config/redisClient.js';

const CACHE_PREFIX = 'user:role:';
const DATA_CACHE_PREFIX = 'cache:';
const DEFAULT_EXPIRY = 3600; // 1 hour
const LIST_EXPIRY = 300; // 5 minutes
const CACHE_TIMEOUT_MS = Number(process.env.REDIS_CACHE_TIMEOUT_MS || 50);
const MAX_CACHE_LATENCY_MS = Number(process.env.REDIS_CACHE_MAX_LATENCY_MS || 250);
const GOOD_LATENCY_MS = Number(process.env.REDIS_GOOD_LATENCY_MS || 40);
const WARN_LATENCY_MS = Number(process.env.REDIS_WARN_LATENCY_MS || 120);
const LOG_COOLDOWN_MS = Number(process.env.REDIS_LOG_COOLDOWN_MS || 15_000);
const MIN_EFFECTIVE_TIMEOUT_MS = Number(process.env.REDIS_MIN_EFFECTIVE_TIMEOUT_MS || 120);
const MAX_EFFECTIVE_TIMEOUT_MS = Number(process.env.REDIS_MAX_EFFECTIVE_TIMEOUT_MS || 800);
const REDIS_BREAKER_TIMEOUT_THRESHOLD = Number(process.env.REDIS_BREAKER_TIMEOUT_THRESHOLD || 5);
const REDIS_BREAKER_COOLDOWN_MS = Number(process.env.REDIS_BREAKER_COOLDOWN_MS || 20_000);

const inMemoryFallback = new Map(); // key -> { value: string, expiresAt: number }
const logCooldownMap = new Map();   // key -> lastLogAt
let redisTimeoutStreak = 0;
let breakerOpenUntil = 0;

const now = () => Date.now();

const readMemoryFallback = (key) => {
    const row = inMemoryFallback.get(key);
    if (!row) return null;
    if (row.expiresAt <= now()) {
        inMemoryFallback.delete(key);
        return null;
    }
    return row.value;
};

const writeMemoryFallback = (key, value, expirySeconds) => {
    const expiresAt = now() + Math.max(1, expirySeconds) * 1000;
    inMemoryFallback.set(key, { value, expiresAt });
};

const safeParseJSON = (raw) => {
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const logWithCooldown = (bucket, level, message) => {
    const t = now();
    const last = logCooldownMap.get(bucket) || 0;
    if (t - last < LOG_COOLDOWN_MS) return;
    logCooldownMap.set(bucket, t);

    if (level === 'error') console.error(message);
    else if (level === 'warn') console.warn(message);
    else console.log(message);
};

const canUseRedisCache = () => {
    if (breakerOpenUntil > now()) {
        logWithCooldown(
            'redis-breaker-open',
            'warn',
            `[Redis][breaker:open] cooldown active for ${Math.ceil((breakerOpenUntil - now()) / 1000)}s; fallback mode active`
        );
        return false;
    }

    if (process.env.DISABLE_REDIS_CACHE === 'true') {
        logWithCooldown(
            'redis-disabled-cache',
            'warn',
            '[Redis][health:degraded] cache disabled by DISABLE_REDIS_CACHE=true; fallback mode active'
        );
        return false;
    }

    const isOpen = client.isOpen;
    const healthy = getRedisHealth();
    const latency = getLastLatency();

    if (!isOpen || !healthy) {
        logWithCooldown(
            'redis-health-down',
            'warn',
            `[Redis][health:down] isOpen=${isOpen} healthy=${healthy} latency=${latency}ms; fallback mode active`
        );
        return false;
    }

    if (latency > MAX_CACHE_LATENCY_MS) {
        logWithCooldown(
            'redis-latency-over-limit',
            'warn',
            `[Redis][health:degraded] latency=${latency}ms > max=${MAX_CACHE_LATENCY_MS}ms; fallback mode active`
        );
        return false;
    }

    return true;
};

const safeRedisOp = async (operation, opName, key, timeoutMs = CACHE_TIMEOUT_MS) => {
    const startedAt = now();
    try {
        const latency = getLastLatency();
        const dynamicTimeout = Math.min(
            MAX_EFFECTIVE_TIMEOUT_MS,
            Math.max(timeoutMs, MIN_EFFECTIVE_TIMEOUT_MS, Math.ceil((latency || 0) * 3))
        );

        const timeoutToken = Symbol('timeout');
        const result = await Promise.race([
            operation(),
            new Promise((resolve) => setTimeout(() => resolve(timeoutToken), dynamicTimeout))
        ]);

        const opLatency = now() - startedAt;
        if (result === timeoutToken) {
            redisTimeoutStreak += 1;
            if (redisTimeoutStreak >= REDIS_BREAKER_TIMEOUT_THRESHOLD) {
                breakerOpenUntil = now() + REDIS_BREAKER_COOLDOWN_MS;
                logWithCooldown(
                    'redis-breaker-trip',
                    'warn',
                    `[Redis][breaker:trip] ${redisTimeoutStreak} consecutive timeouts; open ${REDIS_BREAKER_COOLDOWN_MS}ms`
                );
            }
            logWithCooldown(
                `redis-timeout:${opName}:${key}`,
                'warn',
                `[Redis][timeout] ${opName} key=${key} timeout>${dynamicTimeout}ms; fallback enabled`
            );
            return { ok: false, timedOut: true, result: null, latency: opLatency };
        }

        redisTimeoutStreak = 0;
        if (opLatency >= WARN_LATENCY_MS) {
            logWithCooldown(
                `redis-latency-warn:${opName}`,
                'warn',
                `[Redis][latency:bad] ${opName} latency=${opLatency}ms key=${key}`
            );
        } else if (opLatency <= GOOD_LATENCY_MS) {
            logWithCooldown(
                `redis-latency-good:${opName}`,
                'log',
                `[Redis][latency:good] ${opName} latency=${opLatency}ms`
            );
        }

        return { ok: true, timedOut: false, result, latency: opLatency };
    } catch (error) {
        redisTimeoutStreak = 0;
        const msg = error?.message || 'Unknown redis error';
        logWithCooldown(
            `redis-error:${opName}:${key}`,
            'warn',
            `[Redis][error] ${opName} key=${key} msg="${msg}"; fallback enabled`
        );
        return { ok: false, timedOut: false, result: null, latency: now() - startedAt };
    }
};

/**
 * Get data from Redis cache.
 */
export const getCachedData = async (key) => {
    const fullKey = `${DATA_CACHE_PREFIX}${key}`;
    if (!canUseRedisCache()) return safeParseJSON(readMemoryFallback(fullKey));

    const redis = await safeRedisOp(() => client.get(fullKey), 'getCachedData', key);
    if (!redis.ok) return safeParseJSON(readMemoryFallback(fullKey));

    const data = redis.result;
    if (!data) return null;
    return safeParseJSON(data);
};

/**
 * Set data in Redis cache with TTL.
 */
export const setCachedData = async (key, data, expiry = LIST_EXPIRY) => {
    const fullKey = `${DATA_CACHE_PREFIX}${key}`;
    const payload = JSON.stringify(data);

    if (!canUseRedisCache()) {
        writeMemoryFallback(fullKey, payload, expiry);
        return;
    }

    const redis = await safeRedisOp(
        () => client.set(fullKey, payload, { EX: expiry }),
        'setCachedData',
        key
    );
    if (!redis.ok) {
        writeMemoryFallback(fullKey, payload, expiry);
    }
};

/**
 * Clear Redis cache by pattern (using scanIterator for performance).
 * @param {string} pattern - e.g., 'user:list:*'
 */
export const clearCacheByPattern = async (pattern) => {
    if (!canUseRedisCache()) return;
    try {
        const fullPattern = `${DATA_CACHE_PREFIX}${pattern}`;
        console.log(`[Redis] Scanning with pattern: ${fullPattern}`);
        let keys = [];

        for await (const key of client.scanIterator({
            MATCH: fullPattern,
            COUNT: 100
        })) {
            if (Array.isArray(key)) {
                keys.push(...key);
            } else if (key) {
                keys.push(key);
            }
        }
        keys = keys.filter(k => typeof k === 'string' && k.length > 0);
        if (keys.length > 0) {
            await client.unlink(keys);
            console.log(`[Redis] Cache cleared for pattern: ${fullPattern} (${keys.length} keys)`);
        } else {
            console.log(`[Redis] No keys found for pattern: ${fullPattern}`);
        }
    } catch (error) {
        console.log(`[Redis] Error clearing cache pattern ${pattern}:`, error);
    }
};

/**
 * Get user access info (role and isActive) from Redis cache.
 * @param {string} userId - The user ID.
 * @returns {Promise<Object|null>} - The cached access info or null.
 */

export const getUserAccessInfo = async (userId) => {
    const fullKey = `${CACHE_PREFIX}${userId}`;
    if (!canUseRedisCache()) return safeParseJSON(readMemoryFallback(fullKey));

    const redis = await safeRedisOp(() => client.get(fullKey), 'getUserAccessInfo', userId);
    if (!redis.ok) return safeParseJSON(readMemoryFallback(fullKey));

    const data = redis.result;
    if (!data) return null;
    return safeParseJSON(data);
};

/**
 * Set user access info in Redis cache.
 * @param {string} userId - The user ID.
 * @param {Object} accessInfo - { roleName, isActive }
 * @param {number} expiry - Expiry time in seconds.
 */
export const setUserAccessInfo = async (userId, accessInfo, expiry = DEFAULT_EXPIRY) => {
    const fullKey = `${CACHE_PREFIX}${userId}`;
    const payload = JSON.stringify(accessInfo);

    if (!canUseRedisCache()) {
        writeMemoryFallback(fullKey, payload, expiry);
        return;
    }

    const redis = await safeRedisOp(
        () => client.set(fullKey, payload, { EX: expiry }),
        'setUserAccessInfo',
        userId
    );
    if (!redis.ok) {
        writeMemoryFallback(fullKey, payload, expiry);
    }
};

/**
 * Delete user access info from Redis cache (Invalidation).
 * @param {string} userId - The user ID.
 */
export const delUserAccessInfo = async (userId) => {
    const fullKey = `${CACHE_PREFIX}${userId}`;
    inMemoryFallback.delete(fullKey);
    if (!canUseRedisCache()) return;
    await safeRedisOp(() => client.del(fullKey), 'delUserAccessInfo', userId);
};

export const roleFetching = async (role) => {
    const key = `role:${role}`;
    if (!canUseRedisCache()) return safeParseJSON(readMemoryFallback(key));

    const redis = await safeRedisOp(() => client.get(key), 'roleFetching', role);
    if (!redis.ok) return safeParseJSON(readMemoryFallback(key));

    return safeParseJSON(redis.result);
}
