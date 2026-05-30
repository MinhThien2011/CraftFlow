import jwt from 'jsonwebtoken';
import { trackJwtUserId } from './requestGuard.js';

// ====================== CONFIGURATION ======================
const CONFIG = {
    maxTokenLength: 2048,
    clockTolerance: 30,      
    algorithm: 'HS256',
    // issuer: '',
    // audience: '',
};

const VALID_USER_ID_RE = /^[a-f0-9]{24}$/i;

// ====================== SECURITY LOGGER (Throttled) ======================
let lastSuspiciousLog = 0;

const logSuspiciousToken = (reason, req) => {
    const now = Date.now();
    if (now - lastSuspiciousLog < 30_000) return; 

    console.warn(`🚨 SECURITY: Suspicious JWT detected - ${reason} | IP: ${req.ip}`);
    lastSuspiciousLog = now;
};

// ====================== MAIN JWT AUTH MIDDLEWARE ======================
export const jwtAuth = (req, res, next) => {
    const token = req.cookies?.accessToken;
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (token.length > CONFIG.maxTokenLength) {
        logSuspiciousToken('Token too large', req);
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
        logSuspiciousToken('Invalid JWT format', req);
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: [CONFIG.algorithm],
            clockTolerance: CONFIG.clockTolerance,
            // issuer: CONFIG.issuer,
            // audience: CONFIG.audience,
        });

        const userId = decoded.id || decoded.userId;

        if (!userId || !isValidUserId(userId)) {
            logSuspiciousToken('Invalid userId format', req);
            return res.status(401).json({ message: 'Unauthorized' });
        }

        req.userId = userId;
        if (!trackJwtUserId(req, res)) return;
        req.decodedToken = decoded;

        next();
    } catch (err) {
        let reason = 'Invalid token';

        if (err.name === 'TokenExpiredError') {
            reason = 'Token expired';
        } else if (err.name === 'JsonWebTokenError') {
            reason = 'JWT malformed or invalid signature';
        }

        logSuspiciousToken(reason, req);

        return res.status(401).json({ message: 'Unauthorized' });
    }
};

// ====================== HELPER ======================
/**
 * Kiểm tra định dạng userId để ngăn chặn account_overflow attack
 */
const isValidUserId = (id) => {
    if (typeof id !== 'string') return false;
    return VALID_USER_ID_RE.test(id);
};

// ====================== STATUS LOGGER ======================
export const logJwtAuthStatus = () => {
    console.log('🔐 JWT Authentication Middleware initialized');
    console.log(`   • Algorithm : ${CONFIG.algorithm}`);
    console.log(`   • Max Token Length: ${CONFIG.maxTokenLength} bytes`);
    console.log(`   • Clock Tolerance: ±${CONFIG.clockTolerance}s`);
};
