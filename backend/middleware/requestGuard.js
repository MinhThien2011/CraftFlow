import { ipKeyGenerator } from 'express-rate-limit';

const CONFIG = {
    requestTimeoutMs: 30_000,
    maxBodySize: 1 * 1024 * 1024,
    maxConcurrentRequests: 500,
    subnet: {
        windowMs: 60_000,
        maxRequests: 300,
        maxTrackedSubnets: 20_000,
    },
    userIdAbuse: {
        windowMs: 5 * 60_000,
        maxUniqueIds: 10_000,
    },
};

const subnetCounters = new Map();
const seenUserIds = new Map();

const normalizeIp = (ip) => {
    try {
        return ipKeyGenerator(ip);
    } catch {
        return ip || 'unknown';
    }
};

const getClientIp = (req) => normalizeIp(req.ip || req.connection?.remoteAddress || 'unknown');

const getSubnetKey = (ip) => {
    if (!ip) return 'unknown';

    const ipv4Match = ip.match(/(?:^|:)(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
    if (ipv4Match) return `s4:${ipv4Match[1]}`;

    const parts = ip.split(':').filter(Boolean);
    if (parts.length >= 3) return `s6:${parts.slice(0, 3).join(':')}`;

    return `s:${ip}`;
};

const isResponseWritable = (res) => !res.headersSent && !res.writableEnded;

export const slowBodyGuard = (req, res, next) => {
    res.setTimeout(CONFIG.requestTimeoutMs, () => {
        if (isResponseWritable(res)) {
            res.status(408).json({ message: 'Request timeout' });
        }
        req.destroy();
    });

    const contentLength = Number.parseInt(req.headers['content-length'] || '0', 10);
    if (Number.isFinite(contentLength) && contentLength > CONFIG.maxBodySize) {
        return res.status(413).json({ message: 'Payload too large' });
    }

    if (req.headers['transfer-encoding'] && req.headers['content-length']) {
        return res.status(400).json({ message: 'Bad request' });
    }

    next();
};

let activeRequests = 0;

export const concurrentLimiter = (req, res, next) => {
    if (activeRequests >= CONFIG.maxConcurrentRequests) {
        res.set('Retry-After', '5');
        return res.status(503).json({
            message: 'Server is busy. Please try again later.',
            retryAfter: 5,
        });
    }

    activeRequests++;
    let cleanedUp = false;
    const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        activeRequests = Math.max(0, activeRequests - 1);
    };

    res.once('finish', cleanup);
    res.once('close', cleanup);

    next();
};

setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of subnetCounters) {
        if (now > entry.resetAt) subnetCounters.delete(key);
    }
}, 60_000).unref();

export const subnetLimiter = (req, res, next) => {
    const subnet = getSubnetKey(getClientIp(req));
    const now = Date.now();

    let entry = subnetCounters.get(subnet);
    if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + CONFIG.subnet.windowMs };
        subnetCounters.set(subnet, entry);
    }

    entry.count++;

    if (subnetCounters.size > CONFIG.subnet.maxTrackedSubnets) {
        const oldestKey = subnetCounters.keys().next().value;
        if (oldestKey) subnetCounters.delete(oldestKey);
    }

    if (entry.count > CONFIG.subnet.maxRequests) {
        res.set('Retry-After', Math.ceil(CONFIG.subnet.windowMs / 1000).toString());
        return res.status(429).json({
            message: 'Too many requests from your network.',
        });
    }

    next();
};

setInterval(() => {
    const now = Date.now();
    for (const [userId, timestamp] of seenUserIds) {
        if (now - timestamp > CONFIG.userIdAbuse.windowMs) {
            seenUserIds.delete(userId);
        }
    }
}, 60_000).unref();

export const trackJwtUserId = (req, res) => {
    if (!req.userId) return true;

    const now = Date.now();
    if (seenUserIds.has(req.userId)) {
        seenUserIds.set(req.userId, now);
        return true;
    }

    if (seenUserIds.size >= CONFIG.userIdAbuse.maxUniqueIds) {
        if (!global._lastKeyAbuseWarn || now - global._lastKeyAbuseWarn > 30_000) {
            console.warn(`SECURITY ALERT: possible account_overflow attack. Unique userIds: ${seenUserIds.size}`);
            global._lastKeyAbuseWarn = now;
        }
        res.status(429).json({ message: 'Too many requests.' });
        return false;
    }

    seenUserIds.set(req.userId, now);
    return true;
};

export const jwtKeyAbuseGuard = (req, res, next) => {
    if (!trackJwtUserId(req, res)) return;
    next();
};

export const logSecurityStatus = () => {
    console.log('Security request guards initialized:');
    console.log(`   - Request timeout: ${CONFIG.requestTimeoutMs}ms`);
    console.log(`   - Max body size: ${CONFIG.maxBodySize} bytes`);
    console.log(`   - Concurrent request limit: ${CONFIG.maxConcurrentRequests}`);
    console.log(`   - Subnet flood protection: ${CONFIG.subnet.maxRequests}/${CONFIG.subnet.windowMs}ms`);
    console.log(`   - JWT unique user guard: ${CONFIG.userIdAbuse.maxUniqueIds}/${CONFIG.userIdAbuse.windowMs}ms`);
};
