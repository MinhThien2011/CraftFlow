import { client, getRedisHealth, getLastLatency } from '../config/redisClient.js';

const CACHE_PREFIX = 'user:role:';
const DATA_CACHE_PREFIX = 'cache:';
const DEFAULT_EXPIRY = 3600; // 1 hour
const LIST_EXPIRY = 300; // 5 minutes
const CACHE_TIMEOUT_MS = Number(process.env.REDIS_CACHE_TIMEOUT_MS || 50);
const MAX_CACHE_LATENCY_MS = Number(process.env.REDIS_CACHE_MAX_LATENCY_MS || 250);

const canUseRedisCache = () => {
    if (process.env.DISABLE_REDIS_CACHE === 'true') return false;
    if (!client.isOpen || !getRedisHealth()) return false;
    return getLastLatency() <= MAX_CACHE_LATENCY_MS;
};

const withTimeout = (promise, timeoutMs = CACHE_TIMEOUT_MS) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Redis Timeout')), timeoutMs))
]);

/**
 * Get data from Redis cache.
 */
export const getCachedData = async (key) => {
    if (!canUseRedisCache()) return null;
    try {
        const data = await withTimeout(client.get(`${DATA_CACHE_PREFIX}${key}`));
        if (!data) return null;
        return JSON.parse(data);
    } catch (error) {
        if (error.message !== 'Redis Timeout') {
            console.error(`[Redis] Error getting cached data for ${key}:`, error.message);
        }
        return null;
    }
};

/**
 * Set data in Redis cache with TTL.
 */
export const setCachedData = async (key, data, expiry = LIST_EXPIRY) => {
    if (!canUseRedisCache()) return;
    try {
        await withTimeout(
            client.set(`${DATA_CACHE_PREFIX}${key}`, JSON.stringify(data), {
                EX: expiry
            })
        );
    } catch (error) {
        if (error.message !== 'Redis Timeout') {
            console.error(`[Redis] Error setting cached data for ${key}:`, error.message);
        }
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
    if (!canUseRedisCache()) return null;
    try {
        const data = await withTimeout(client.get(`${CACHE_PREFIX}${userId}`));
        if (!data) return null;
        return JSON.parse(data);
    } catch (error) {
        console.error(`[Redis] Error getting user access info for ${userId}:`, error);
        return null;
    }
};

/**
 * Set user access info in Redis cache.
 * @param {string} userId - The user ID.
 * @param {Object} accessInfo - { roleName, isActive }
 * @param {number} expiry - Expiry time in seconds.
 */
export const setUserAccessInfo = async (userId, accessInfo, expiry = DEFAULT_EXPIRY) => {
    if (!canUseRedisCache()) return;
    try {
        await withTimeout(client.set(`${CACHE_PREFIX}${userId}`, JSON.stringify(accessInfo), {
            EX: expiry
        }));
    } catch (error) {
        console.error(`[Redis] Error setting user access info for ${userId}:`, error);
    }
};

/**
 * Delete user access info from Redis cache (Invalidation).
 * @param {string} userId - The user ID.
 */
export const delUserAccessInfo = async (userId) => {
    if (!canUseRedisCache()) return;
    try {
        await withTimeout(client.del(`${CACHE_PREFIX}${userId}`));
    } catch (error) {
        console.log(`[Redis] Error deleting user access info for ${userId}:`, error);
    }
};

export const roleFetching = async (role) => {
    if (!canUseRedisCache()) return null;
    try {
        const data = await withTimeout(client.get(`role:${role}`));
        if (!data) return null;
        return JSON.parse(data);
    } catch (error) {
        console.log(`[Redis] Error getting role for ${role}:`, error);
        return null;
    }
}
