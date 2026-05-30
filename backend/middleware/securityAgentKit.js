import { ipKeyGenerator } from 'express-rate-limit';
import { client, getRedisHealth } from '../config/redisClient.js';

const CONFIG = {
    threatThreshold: 60,
    criticalThreshold: 85,
    behaviorWindowMs: 60 * 60 * 1000,
    blockTtlMs: 2 * 60 * 60 * 1000,
    registration: {
        windowMs: 60 * 60 * 1000,
        maxPerIPPerHour: 5,
        maxPerDomainPerHour: 8,
        maxTotalPerHour: 60,
        suspiciousDomains: [
            'tempmail', 'throwaway', 'guerrilla', '10minutemail', 'mailinator',
            'sharklasers', 'dispostable', 'yopmail', 'trashmail'
        ],
    },
    maxReqPer10s: 30,
    maxPathsPerMinute: 20,
    suspiciousUAKeywords: ['bot', 'crawler', 'scanner', 'python', 'requests', 'curl', 'wget', 'nikto', 'sqlmap'],
};

const ipThreatScore = new Map();
const ipBehavior = new Map();
const registrationTracker = new Map();
const domainTracker = new Map();

let totalRegistrationsThisHour = 0;
const blockedIPs = new Map();
const blockedSubnets = new Set();

const normalizeIp = (ip) => {
    try {
        return ipKeyGenerator(ip);
    } catch {
        return ip || 'unknown';
    }
};

const getIP = (req) => normalizeIp(req.ip || req.connection?.remoteAddress || 'unknown');
const getSubnet = (ip) => ip.includes('.')
    ? ip.split('.').slice(0, 3).join('.')
    : ip.split(':').filter(Boolean).slice(0, 3).join(':');

const getEmailDomain = (email) => {
    if (!email) return null;
    return String(email).toLowerCase().split('@')[1]?.trim() || null;
};

const generateFingerprint = (req) => {
    const ua = req.headers['user-agent'] || '';
    const accept = req.headers['accept'] || '';
    const lang = req.headers['accept-language'] || '';
    const encoding = req.headers['accept-encoding'] || '';
    return Buffer.from(`${ua}|${accept}|${lang}|${encoding}`.slice(0, 300)).toString('base64').slice(0, 80);
};

const increaseThreatScore = (ip, points, reason, fingerprint = null) => {
    const score = Math.min((ipThreatScore.get(ip) || 0) + points, 100);
    ipThreatScore.set(ip, score);

    if (score >= CONFIG.threatThreshold) {
        void blockIP(ip, reason, score, fingerprint);
    }

    return score;
};

const blockIP = async (ip, reason, score, fingerprint = null) => {
    if (blockedIPs.has(ip)) return;

    blockedIPs.set(ip, Date.now() + CONFIG.blockTtlMs);
    const subnet = getSubnet(ip);

    console.log(`SECURITY AGENT BLOCKED -> IP: ${ip} | Score: ${score} | Reason: ${reason}`);

    if (getRedisHealth()) {
        try {
            await client.sAdd('security:blocked:ips', ip);
            await client.expire('security:blocked:ips', Math.ceil(CONFIG.blockTtlMs / 1000));
        } catch (error) {
            console.error('[SecurityAgent] Failed to persist blocked IP:', error.message);
        }
    }

    if (score >= CONFIG.criticalThreshold && subnet) {
        blockedSubnets.add(subnet);
    }
};

const detectRegistrationFlood = (req) => {
    if (!req.path.match(/\/(register|signup|create-account)/i)) return;

    const ip = getIP(req);
    const email = req.body?.email || req.body?.username;
    const now = Date.now();
    const fingerprint = generateFingerprint(req);

    if (!registrationTracker.has(ip)) {
        registrationTracker.set(ip, { count: 0, windowStart: now });
    }

    const reg = registrationTracker.get(ip);
    if (now - reg.windowStart > CONFIG.registration.windowMs) {
        reg.count = 0;
        reg.windowStart = now;
    }

    reg.count++;
    totalRegistrationsThisHour++;

    if (reg.count > CONFIG.registration.maxPerIPPerHour) {
        increaseThreatScore(ip, 45, 'Registration flood from single IP', fingerprint);
    }

    if (totalRegistrationsThisHour > CONFIG.registration.maxTotalPerHour) {
        increaseThreatScore(ip, 35, 'Global registration spike detected', fingerprint);
    }

    const domain = getEmailDomain(email);
    if (domain) {
        if (!domainTracker.has(domain)) domainTracker.set(domain, { count: 0, windowStart: now });

        const domainEntry = domainTracker.get(domain);
        if (now - domainEntry.windowStart > CONFIG.registration.windowMs) {
            domainEntry.count = 0;
            domainEntry.windowStart = now;
        }

        domainEntry.count++;

        if (domainEntry.count > CONFIG.registration.maxPerDomainPerHour) {
            increaseThreatScore(ip, 30, `High registration from domain: ${domain}`, fingerprint);
        }

        if (CONFIG.registration.suspiciousDomains.some(s => domain.includes(s))) {
            increaseThreatScore(ip, 40, `Disposable email domain: ${domain}`, fingerprint);
        }
    }

    const ua = (req.headers['user-agent'] || '').toLowerCase();
    if (CONFIG.suspiciousUAKeywords.some(k => ua.includes(k)) || ua.length < 30) {
        increaseThreatScore(ip, 25, 'Suspicious User-Agent during registration', fingerprint);
    }
};

const analyzeBehavior = (req) => {
    const ip = getIP(req);
    const now = Date.now();
    const fingerprint = generateFingerprint(req);

    if (!ipBehavior.has(ip)) {
        ipBehavior.set(ip, {
            requests: 0,
            paths: new Set(),
            fingerprints: new Set(),
            firstSeen: now,
            lastSeen: now,
        });
    }

    const behavior = ipBehavior.get(ip);
    behavior.requests++;
    behavior.lastSeen = now;
    behavior.paths.add(req.path);
    behavior.fingerprints.add(fingerprint);

    const elapsed = Math.max((now - behavior.firstSeen) / 1000, 1);
    if (behavior.requests / elapsed > CONFIG.maxReqPer10s) {
        increaseThreatScore(ip, 25, 'Extremely high request rate', fingerprint);
    }

    if (behavior.paths.size > CONFIG.maxPathsPerMinute && elapsed < 60) {
        increaseThreatScore(ip, 20, 'Path scanning / reconnaissance', fingerprint);
    }

    if (behavior.fingerprints.size > 8) {
        increaseThreatScore(ip, 30, 'Multiple device fingerprints from same IP', fingerprint);
    }
};

export const securityAgent = (req, res, next) => {
    const ip = getIP(req);
    const expiresAt = blockedIPs.get(ip);

    if (expiresAt && Date.now() <= expiresAt) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Your IP has been temporarily blocked.'
        });
    }

    if (blockedSubnets.has(getSubnet(ip))) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Your network has been temporarily blocked.'
        });
    }

    detectRegistrationFlood(req);
    analyzeBehavior(req);

    const originalEnd = res.end;
    res.end = function (...args) {
        if (res.statusCode >= 400 && res.statusCode < 500) {
            increaseThreatScore(ip, 10, 'High client error rate', generateFingerprint(req));
        }
        originalEnd.apply(this, args);
    };

    next();
};

export const unblockIP = async (ip) => {
    blockedIPs.delete(ip);

    if (getRedisHealth()) {
        try {
            await client.sRem('security:blocked:ips', ip);
        } catch (error) {
            console.error('[SecurityAgent] Failed to remove blocked IP from Redis:', error.message);
        }
    }

    console.log(`Unblocked IP: ${ip}`);
};

export const getSecurityStatus = () => ({
    blockedIPs: blockedIPs.size,
    blockedSubnets: blockedSubnets.size,
    monitoredIPs: ipBehavior.size,
    highThreatIPs: Array.from(ipThreatScore.entries()).filter(([, score]) => score >= 50).length,
    totalRegistrationsThisHour,
});

setInterval(() => {
    totalRegistrationsThisHour = 0;

    const now = Date.now();
    for (const [ip, data] of ipBehavior) {
        if (now - data.lastSeen > CONFIG.behaviorWindowMs) {
            ipBehavior.delete(ip);
            ipThreatScore.delete(ip);
        }
    }

    for (const [ip, expiresAt] of blockedIPs) {
        if (now > expiresAt) blockedIPs.delete(ip);
    }

    for (const [ip, data] of registrationTracker) {
        if (now - data.windowStart > CONFIG.registration.windowMs) registrationTracker.delete(ip);
    }

    for (const [domain, data] of domainTracker) {
        if (now - data.windowStart > CONFIG.registration.windowMs) domainTracker.delete(domain);
    }
}, 5 * 60_000).unref();

console.log('Advanced Security Agent initialized');
