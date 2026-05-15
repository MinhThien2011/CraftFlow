import { ipKeyGenerator } from 'express-rate-limit';

// ====================== CONFIGURATION ======================
const CONFIG = {
    requestTimeoutMs: 30_000,           // 30 giây
    maxBodySize: 1 * 1024 * 1024,       // 1MB
    maxConcurrentRequests: 500,

    subnet: {
        windowMs: 60_000,               // 1 phút
        maxRequests: 300,
    },

    userIdAbuse: {
        windowMs: 5 * 60_000,           // 5 phút
        maxUniqueIds: 10_000,
    },
};

// ====================== SECURITY GUARDS INITIALIZATION ======================
console.log('🛡️ Security Request Guards initialized - Ready to protect');

// ====================== 1. SLOW BODY / SLOW LORIS DEFENSE ======================
export const slowBodyGuard = (req, res, next) => {
    // Global request timeout
    res.setTimeout(CONFIG.requestTimeoutMs, () => {
        res.status(408).json({ message: 'Request timeout' });
    });

    // Prevent oversized payload
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > CONFIG.maxBodySize) {
        return res.status(413).json({ message: 'Payload too large' });
    }

    // Additional dangerous headers protection
    if (req.headers['transfer-encoding'] && req.headers['content-length']) {
        return res.status(400).json({ message: 'Bad request' });
    }

    next();
};

// ====================== 2. CONCURRENT REQUEST LIMITER ======================
let activeRequests = 0;

export const concurrentLimiter = (req, res, next) => {
    if (activeRequests >= CONFIG.maxConcurrentRequests) {
        console.warn(`⚠️ Concurrent limit reached: ${activeRequests} active requests`);
        return res.status(503).json({
            message: 'Server is busy. Please try again later.',
            retryAfter: 5,
        });
    }

    activeRequests++;
    const cleanup = () => { activeRequests = Math.max(0, activeRequests - 1); };

    res.once('finish', cleanup);
    res.once('close', cleanup);

    next();
};

// ====================== 3. SUBNET RATE LIMITER (ANTI-BOTNET) ======================
const subnetCounters = new Map();

const getSubnetKey = (ip) => {
    if (!ip) return 'unknown';

    // IPv4
    const ipv4Match = ip.match(/(?:^|:)(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
    if (ipv4Match) return `s4:${ipv4Match[1]}`;

    // IPv6 /48
    const parts = ip.split(':');
    if (parts.length >= 3) return `s6:${parts.slice(0, 3).join(':')}`;

    return `s:${ip}`;
};

// Periodic cleanup
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of subnetCounters) {
        if (now > entry.resetAt) subnetCounters.delete(key);
    }
}, 60_000).unref();

export const subnetLimiter = (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const subnet = getSubnetKey(ip);
    const now = Date.now();

    let entry = subnetCounters.get(subnet);

    if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + CONFIG.subnet.windowMs };
        subnetCounters.set(subnet, entry);
    }

    entry.count++;

    if (entry.count > CONFIG.subnet.maxRequests) {
        res.set('Retry-After', Math.ceil(CONFIG.subnet.windowMs / 1000));
        return res.status(429).json({
            message: 'Too many requests from your network.',
        });
    }

    next();
};

// ====================== 4. JWT KEY ABUSE GUARD ======================
const seenUserIds = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [userId, timestamp] of seenUserIds) {
        if (now - timestamp > CONFIG.userIdAbuse.windowMs) {
            seenUserIds.delete(userId);
        }
    }
}, 60_000).unref();

export const jwtKeyAbuseGuard = (req, res, next) => {
    if (!req.userId) return next();

    const now = Date.now();

    if (!seenUserIds.has(req.userId)) {
        if (seenUserIds.size >= CONFIG.userIdAbuse.maxUniqueIds) {
            if (!global._lastKeyAbuseWarn || now - global._lastKeyAbuseWarn > 30_000) {
                console.warn(`🚨 SECURITY ALERT: Possible account_overflow attack! Unique userIds: ${seenUserIds.size}`);
                global._lastKeyAbuseWarn = now;
            }
            return res.status(429).json({ message: 'Too many requests.' });
        }
        seenUserIds.set(req.userId, now);
    }

    next();
};

// ====================== STATUS LOGGER ======================
export const logSecurityStatus = () => {
    console.log('🔒 All security guards are active and protecting:');
    console.log(`   • Slow Body + Timeout Guard`);
    console.log(`   • Concurrent Request Limit (${CONFIG.maxConcurrentRequests})`);
    console.log(`   • Subnet Flood Protection (/24)`);
    console.log(`   • JWT Key Abuse Prevention`);
    console.log('🛡️ Server is ready for production traffic');
};