import jwt from 'jsonwebtoken';

// ====================== CONFIGURATION ======================
const CONFIG = {
    maxTokenLength: 2048,           // Ngăn memory exhaustion attack
    clockTolerance: 30,             // Giây
    algorithm: 'HS256',
    // Có thể thêm sau: issuer, audience
    // issuer: 'your-app',
    // audience: 'your-frontend',
};

const VALID_USER_ID_RE = /^[a-f0-9]{24}$/i; // MongoDB ObjectId

// ====================== SECURITY LOGGER (Throttled) ======================
let lastSuspiciousLog = 0;

const logSuspiciousToken = (reason, req) => {
    const now = Date.now();
    if (now - lastSuspiciousLog < 30_000) return; // Throttle 30 giây

    console.warn(`🚨 SECURITY: Suspicious JWT detected - ${reason} | IP: ${req.ip}`);
    lastSuspiciousLog = now;
};

// ====================== MAIN JWT AUTH MIDDLEWARE ======================
export const jwtAuth = (req, res, next) => {
    const token = req.cookies?.accessToken;

    // Không có token
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // 1. Kiểm tra độ dài token
    if (token.length > CONFIG.maxTokenLength) {
        logSuspiciousToken('Token too large', req);
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // 2. Kiểm tra cấu trúc JWT cơ bản
    const parts = token.split('.');
    if (parts.length !== 3) {
        logSuspiciousToken('Invalid JWT format', req);
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // 3. Verify token với cấu hình nghiêm ngặt
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: [CONFIG.algorithm],
            clockTolerance: CONFIG.clockTolerance,
            // issuer: CONFIG.issuer,
            // audience: CONFIG.audience,
        });

        // 4. Validate payload
        const userId = decoded.id || decoded.userId;

        if (!userId || !isValidUserId(userId)) {
            logSuspiciousToken('Invalid userId format', req);
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // 5. Gán thông tin user vào request
        req.userId = userId;
        req.decodedToken = decoded; // Optional: nếu cần thêm thông tin sau này

        next();
    } catch (err) {
        // Phân loại lỗi để logging nội bộ (không expose ra client)
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