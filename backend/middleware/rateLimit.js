import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import jwt from 'jsonwebtoken';
import { client } from '../config/redisClient.js';

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
 * Senior Utility: Safe Redis Command Executor
 * Waits for the Redis client to be ready before executing commands.
 * This prevents 'ClientClosedError' during server startup.
 */
const safeSendCommand = async (...args) => {
    try {
        // Wait up to 5 seconds for Redis to connect and be ready if it's not
        let attempts = 0;
        while (!client.isReady && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!client.isReady) {
            console.error('❌ Redis RateLimit: Client not ready after 5s. Falling back to memory.');
            throw new Error('Redis not ready');
        }

        return await client.sendCommand(args);
    } catch (error) {
        // Fallback or rethrow based on strategy
        throw error;
    }
};

/**
 * Extracts User ID from JWT in cookies
 */
const getUserId = (req) => {
    const token = req.cookies?.accessToken;
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded?.id;
    } catch {
        return null;
    }
};

/**
 * Shared configuration for all limiters
 */
const commonOptions = {
    standardHeaders: true,
    legacyHeaders: false,
    validate: { default: false }, // Suppress IPv6 warning as we handle key generation safely
};

/**
 * Base configuration for Redis-backed rate limiters
 */
const createRedisStore = (prefix) => new RedisStore({
    sendCommand: safeSendCommand,
    prefix: `rl:${prefix}:`,
});

/**
 * Main API Limiter
 */
export const apiLimiter = rateLimit({
    ...commonOptions,
    store: createRedisStore('api'),
    windowMs: CONFIG.api.windowMs,
    max: (req) => {
        const userId = getUserId(req);
        return userId ? CONFIG.api.authenticated : CONFIG.api.guest;
    },
    keyGenerator: (req) => {
        const userId = getUserId(req);
        return userId ? `user:${userId}` : `ip:${req.ip}`;
    },
    skip: (req) => {
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
    store: createRedisStore('strict'),
    windowMs: CONFIG.strict.windowMs,
    max: CONFIG.strict.max,
    keyGenerator: (req) => {
        const userId = getUserId(req);
        return userId ? `user:${userId}` : `ip:${req.ip}`;
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
    store: createRedisStore('login'),
    windowMs: CONFIG.login.windowMs,
    max: CONFIG.login.max,
    keyGenerator: (req) => {
        const identifier = req.body.username || req.body.email || req.ip;
        return `login:${identifier}`;
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
