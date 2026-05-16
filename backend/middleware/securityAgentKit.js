import { ipKeyGenerator } from 'express-rate-limit';
import { client, getRedisHealth } from '../config/redisClient.js';

// ====================== CONFIGURATION ======================
const CONFIG = {
    threatThreshold: 60,
    criticalThreshold: 85,
    registration: {
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

    suspiciousUAKeywords: ['bot', 'crawler', 'scanner', 'python', 'requests', 'curl', 'wget', 'nikto', 'sqlmap', 'postman'],
};

// ====================== STORES ======================
const ipThreatScore = new Map();
const ipBehavior = new Map();           // ip → behavior data
const registrationTracker = new Map();  // ip → registration stats
const domainTracker = new Map();        // domain → count

let totalRegistrationsThisHour = 0;
let blockedIPs = new Set();
let blockedSubnets = new Set();

// ====================== HELPERS ======================
const getIP = (req) => req.ip || req.connection?.remoteAddress || 'unknown';
const getSubnet = (ip) => ip.split('.').slice(0, 3).join('.');

const getEmailDomain = (email) => {
    if (!email) return null;
    try {
        return email.toLowerCase().split('@')[1]?.trim();
    } catch {
        return null;
    }
};

const generateFingerprint = (req) => {
    const ua = req.headers['user-agent'] || '';
    const accept = req.headers['accept'] || '';
    const lang = req.headers['accept-language'] || '';
    const encoding = req.headers['accept-encoding'] || '';
    const fingerprint = `${ua}|${accept}|${lang}|${encoding}`.slice(0, 300);
    return Buffer.from(fingerprint).toString('base64').slice(0, 80);
};

// ====================== THREAT SCORING ======================
const increaseThreatScore = (ip, points, reason, fingerprint = null) => {
    if (!ipThreatScore.has(ip)) ipThreatScore.set(ip, 0);

    let score = ipThreatScore.get(ip) + points;
    score = Math.min(score, 100);

    ipThreatScore.set(ip, score);

    if (score >= CONFIG.threatThreshold) {
        blockIP(ip, reason, score, fingerprint);
    }
    return score;
};

const blockIP = async (ip, reason, score, fingerprint = null) => {
    if (blockedIPs.has(ip)) return;

    blockedIPs.add(ip);
    const subnet = getSubnet(ip);

    console.log(`🚨 SECURITY AGENT BLOCKED → IP: ${ip} | Score: ${score} | Reason: ${reason}`);

    if (getRedisHealth()) {
        await client.sAdd('security:blocked:ips', ip);
        await client.expire('security:blocked:ips', 7200); // 2 giờ
    }

    if (score >= CONFIG.criticalThreshold && subnet) {
        blockedSubnets.add(subnet);
    }
};

// ====================== REGISTRATION FLOOD DETECTION ======================
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

    if (now - reg.windowStart > 60 * 60 * 1000) { // 1 giờ
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
        const d = domainTracker.get(domain);

        if (now - d.windowStart > 60 * 60 * 1000) {
            d.count = 0;
            d.windowStart = now;
        }
        d.count++;

        if (d.count > CONFIG.registration.maxPerDomainPerHour) {
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

// ====================== GENERAL BEHAVIOR ANALYSIS ======================
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

    const elapsed = (now - behavior.firstSeen) / 1000;
    if (elapsed > 0 && behavior.requests / elapsed > CONFIG.maxReqPer10s) {
        increaseThreatScore(ip, 25, 'Extremely high request rate', fingerprint);
    }

    if (behavior.paths.size > CONFIG.maxPathsPerMinute && elapsed < 60) {
        increaseThreatScore(ip, 20, 'Path scanning / reconnaissance', fingerprint);
    }

    if (behavior.fingerprints.size > 8) {
        increaseThreatScore(ip, 30, 'Multiple device fingerprints from same IP', fingerprint);
    }
};

// ====================== MAIN SECURITY AGENT ======================
export const securityAgent = (req, res, next) => {
    const ip = getIP(req);

    // Early blocking
    if (blockedIPs.has(ip) || blockedSubnets.has(getSubnet(ip))) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Your IP has been temporarily blocked.'
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

// ====================== UTILITIES ======================
export const unblockIP = async (ip) => {
    blockedIPs.delete(ip);
    if (getRedisHealth()) await client.sRem('security:blocked:ips', ip);
    console.log(`✅ Unblocked IP: ${ip}`);
};

export const getSecurityStatus = () => ({
    blockedIPs: blockedIPs.size,
    blockedSubnets: blockedSubnets.size,
    monitoredIPs: ipBehavior.size,
    highThreatIPs: Array.from(ipThreatScore.entries()).filter(([, score]) => score >= 50).length,
    totalRegistrationsThisHour,
});

// ====================== AUTO CLEANUP ======================
setInterval(() => {
    totalRegistrationsThisHour = 0;

    const now = Date.now();
    for (const [ip, data] of ipBehavior) {
        if (now - data.lastSeen > CONFIG.longWindow || 3600000) { // 1 giờ
            ipBehavior.delete(ip);
            ipThreatScore.delete(ip);
        }
    }
}, 5 * 60_000).unref();

// ====================== INITIALIZATION ======================
console.log('🛡️ Advanced Security Agent v2.0 - Account Creation Flood + Fingerprint Protection Activated');