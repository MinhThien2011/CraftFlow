import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import jwt from 'jsonwebtoken';
import { client, getRedisHealth } from '../config/redisClient.js';

/**
 * Rate Limit Configuration
 */
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
        prefix: 'rl:login-fail:',
    },
};

/**
 * Optimized command sender with Circuit Breaker pattern.
 */
const fastSendCommand = async (...args) => {
    // Wait for connection if it's currently connecting
    if (!client.isOpen && getRedisHealth()) {
        try {
            // node-redis v4 throw ClientClosedError if not connected.
            // We'll catch and wait or skip if it's during startup
            if (args[0] === 'SCRIPT') {
                // For SCRIPT LOAD during startup, wait for ready
                let waitTime = 0;
                while (!client.isOpen && waitTime < 2000) {
                    await new Promise(r => setTimeout(r, 200));
                    waitTime += 200;
                }
            }
        } catch (e) {
            // Silently ignore waiting errors
        }
    }

    // Final check before sending
    if (!client.isOpen) {
        // Only throw for critical commands like SCRIPT LOAD or EVAL
        // For INCR/HINCRBY, we can still return 1 as a safe default if we want to bypass
        if (args[0] === 'INCR' || args[0] === 'HINCRBY') return 1;
        throw new Error('Redis client is closed');
    }

    try {
        return await Promise.race([
            client.sendCommand(args),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 1000))
        ]);
    } catch (error) {
        if (!global._lastRedisErrorLog || Date.now() - global._lastRedisErrorLog > 10000) {
            console.error(`⚠️ Redis Command Error (RateLimit): ${error.message}`);
            global._lastRedisErrorLog = Date.now();
        }

        // Rethrow for script commands, but return 1 for increments
        if (args[0] === 'INCR' || args[0] === 'HINCRBY') return 1;
        throw error;
    }
};

/**
 * Extracts User ID from JWT in cookies. 
 * Using jwt.decode for performance as full verification is handled in jwtAuth middleware.
 */
const getUserId = (req) => {
    // Check if we already extracted it in this request
    if (req._rateLimitUserId !== undefined) return req._rateLimitUserId;

    const token = req.cookies?.accessToken;
    if (!token) {
        req._rateLimitUserId = null;
        return null;
    }
    try {
        // Use decode instead of verify for rate limiting to save CPU
        const decoded = jwt.decode(token);
        req._rateLimitUserId = decoded?.id || null;
        return req._rateLimitUserId;
    } catch {
        req._rateLimitUserId = null;
        return null;
    }
};

/**
 * Shared configuration for all limiters
 */
const commonOptions = {
    standardHeaders: true,
    legacyHeaders: false,
    validate: { default: false },
};

/**
 * Base configuration for Redis-backed rate limiters with memory fallback
 */
const createStore = (prefix) => {
    // If we're sure Redis is down (max retries reached or health check failed)
    // we use MemoryStore. Otherwise we try RedisStore.
    if (!getRedisHealth()) {
        console.warn(`ℹ️ Using MemoryStore for ${prefix} rate limiting (Redis is unhealthy)`);
        return undefined;
    }

    try {
        return new RedisStore({
            sendCommand: async (...args) => {
                try {
                    return await fastSendCommand(...args);
                } catch (err) {
                    // If sendCommand fails, we throw so rate-limit-redis knows something is wrong
                    throw err;
                }
            },
            prefix: `rl:${prefix}:`,
        });
    } catch (error) {
        console.error(`⚠️ Failed to initialize RedisStore for ${prefix}, falling back to MemoryStore`);
        return undefined;
    }
};

/**
 * Main API Limiter
 */
export const apiLimiter = rateLimit({
    ...commonOptions,
    store: createStore('api'),
    windowMs: CONFIG.api.windowMs,
    max: (req) => {
        const userId = getUserId(req);
        return userId ? CONFIG.api.authenticated : CONFIG.api.guest;
    },
    keyGenerator: (req) => {
        const userId = getUserId(req);
        // Optimize key length for Redis RAM
        return userId ? `u:${userId}` : `i:${req.ip}`;
    },
    skip: (req) => {
        // Skip rate limiting if Redis is down to prevent blocking legitimate traffic
        if (!getRedisHealth() || !client.isOpen) return true;

        const whitelist = process.env.IP_WHITELIST?.split(',') || [];
        return whitelist.includes(req.ip) || req.path.startsWith('/public');
    },
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil(CONFIG.api.windowMs / 1000),
        });
    },
});

/**
 * Strict Limiter
 */
export const strictLimiter = rateLimit({
    ...commonOptions,
    store: createStore('strict'),
    windowMs: CONFIG.strict.windowMs,
    max: CONFIG.strict.max,
    skip: (req) => !getRedisHealth() || !client.isOpen,
    keyGenerator: (req) => {
        const userId = getUserId(req);
        return userId ? `u:${userId}` : `i:${req.ip}`;
    },
    message: {
        success: false,
        message: 'High traffic detected. Please slow down.',
    },
});

/**
 * Login Limiter
 */
export const loginLimiter = rateLimit({
    ...commonOptions,
    store: createStore('login'),
    windowMs: CONFIG.login.windowMs,
    max: CONFIG.login.max,
    skip: (req) => !getRedisHealth() || !client.isOpen,
    keyGenerator: (req) => {
        const identifier = req.body.username || req.body.email || req.ip;
        return `l:${identifier}`;
    },
    skipSuccessfulRequests: true,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many failed login attempts. Account temporarily throttled.',
            nextAllowedAt: new Date(Date.now() + CONFIG.login.windowMs),
        });
    },
});
