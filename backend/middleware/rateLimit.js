import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import jwt from 'jsonwebtoken';
import { client, getRedisHealth } from '../config/redisClient.js';

// ─── Config ───────────────────────────────────────────────────────────────────
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
};

// ─── Redis Command Wrapper ────────────────────────────────────────────────────
/**
 * Gửi lệnh tới Redis với timeout + circuit breaker.
 * ✅ Trả về giá trị fallback thay vì throw để tránh unhandled rejection.
 */
const fastSendCommand = async (...args) => {
    if (!client.isOpen || !getRedisHealth()) {
        // Fallback an toàn: trả về 1 để rate limiter không bị crash
        return args[0] === 'GET' ? null : 1;
    }

    try {
        // ✅ Dùng Promise.race nhưng đảm bảo cả 2 nhánh đều được handle
        const timeoutPromise = new Promise((_, reject) => {
            const t = setTimeout(() => reject(new Error('Redis timeout')), 1000);
            // Quan trọng: clear timeout nếu lệnh thành công để tránh leak
            timeoutPromise._clear = () => clearTimeout(t);
        });

        const result = await Promise.race([
            client.sendCommand(args),
            timeoutPromise,
        ]);

        return result;
    } catch (err) {
        // Throttle log — không spam mỗi request
        const now = Date.now();
        if (!global._lastRLErrorLog || now - global._lastRLErrorLog > 10000) {
            console.warn(`⚠️ Redis RateLimit command failed: ${err.message}`);
            global._lastRLErrorLog = now;
        }

        // ✅ Trả về fallback thay vì throw → tránh unhandled rejection
        return args[0] === 'GET' ? null : 1;
    }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Lấy userId từ JWT trong cookie (dùng decode thay verify để tiết kiệm CPU).
 * Kết quả được cache trên req object để tránh decode lại nhiều lần.
 */
const getUserId = (req) => {
    if (req._rateLimitUserId !== undefined) return req._rateLimitUserId;

    const token = req.cookies?.accessToken;
    if (!token) return (req._rateLimitUserId = null);

    try {
        const decoded = jwt.decode(token);
        return (req._rateLimitUserId = decoded?.id ?? null);
    } catch {
        return (req._rateLimitUserId = null);
    }
};

/**
 * Kiểm tra xem nên skip rate limiting không:
 * - Redis không khỏe → skip (không block traffic hợp lệ)
 * - IP trong whitelist → skip
 * - Path bắt đầu /public → skip
 */
const shouldSkip = (req) => {
    if (!getRedisHealth() || !client.isOpen) return true;
    const whitelist = process.env.IP_WHITELIST?.split(',') ?? [];
    return whitelist.includes(req.ip) || req.path.startsWith('/public');
};

// ─── Store Factory ────────────────────────────────────────────────────────────
/**
 * Tạo RedisStore. Nếu Redis không khỏe thì trả về undefined → dùng MemoryStore.
 */
const createStore = (prefix) => {
    if (!getRedisHealth()) {
        console.warn(`ℹ️  RateLimit [${prefix}]: Redis unhealthy → using MemoryStore`);
        return undefined;
    }

    try {
        return new RedisStore({
            sendCommand: fastSendCommand,
            prefix: `rl:${prefix}:`,
        });
    } catch (err) {
        console.error(`⚠️  RateLimit [${prefix}]: Failed to init RedisStore → using MemoryStore`, err.message);
        return undefined;
    }
};

// ─── Common Options ───────────────────────────────────────────────────────────
const commonOptions = {
    standardHeaders: true,
    legacyHeaders: false,
    validate: { default: false },
    skip: shouldSkip,
};

// ─── Limiters ─────────────────────────────────────────────────────────────────
export const apiLimiter = rateLimit({
    ...commonOptions,
    store: createStore('api'),
    windowMs: CONFIG.api.windowMs,
    max: (req) => getUserId(req) ? CONFIG.api.authenticated : CONFIG.api.guest,
    keyGenerator: (req) => {
        const userId = getUserId(req);
        return userId ? `u:${userId}` : `i:${req.ip}`;
    },
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil(CONFIG.api.windowMs / 1000),
        });
    },
});

export const strictLimiter = rateLimit({
    ...commonOptions,
    store: createStore('strict'),
    windowMs: CONFIG.strict.windowMs,
    max: CONFIG.strict.max,
    keyGenerator: (req) => {
        const userId = getUserId(req);
        return userId ? `u:${userId}` : `i:${req.ip}`;
    },
    message: {
        success: false,
        message: 'High traffic detected. Please slow down.',
    },
});

export const loginLimiter = rateLimit({
    ...commonOptions,
    store: createStore('login'),
    windowMs: CONFIG.login.windowMs,
    max: CONFIG.login.max,
    keyGenerator: (req) => {
        const identifier = req.body?.username || req.body?.email || req.ip;
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