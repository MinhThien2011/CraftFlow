import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

let io;

// ====================== CONFIGURATION ======================
const CONFIG = {
    corsOrigin: process.env.FRONTEND_URL || 'http://localhost:3000',
    pingInterval: 25_000,      // 25 giây
    pingTimeout: 60_000,       // 60 giây
    maxConnectionsPerUser: 5,  // Ngăn 1 user mở quá nhiều tab
};

// ====================== IN-MEMORY STORE ======================
const userSockets = new Map(); // userId → Set<socket.id>

// ====================== JWT SOCKET AUTH MIDDLEWARE ======================
const socketAuthMiddleware = (socket, next) => {
    let token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token;
    if (!token && socket.handshake.headers.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';');
        const accessTokenCookie = cookies.find(c => c.trim().startsWith('accessToken='));
        if (accessTokenCookie) {
            token = accessTokenCookie.split('=')[1];
        }
    }

    if (!token) {
        console.warn(`[Socket] Unauthorized - No token from ${socket.id}`);
        return next(new Error('Authentication required'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256'],
        });

        socket.userId = decoded.id || decoded.userId;
        socket.decoded = decoded;

        return next();
    } catch (err) {
        console.warn(`[Socket] Invalid token from ${socket.id}: ${err.message}`);
        return next(new Error('Invalid token'));
    }
};

// ====================== MAIN INITIALIZATION ======================
export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: CONFIG.corsOrigin,
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingInterval: CONFIG.pingInterval,
        pingTimeout: CONFIG.pingTimeout,
        transports: ['websocket', 'polling'],
    });

    // Apply authentication middleware
    io.use(socketAuthMiddleware);

    io.on('connection', (socket) => {
        const userId = socket.userId;

        if (!userId) {
            socket.disconnect(true);
            return;
        }

        // Quản lý multiple connections
        if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
        }
        const userSocketSet = userSockets.get(userId);

        if (userSocketSet.size >= CONFIG.maxConnectionsPerUser) {
            console.warn(`[Socket] User ${userId} exceeded max connections`);
            socket.emit('auth_error', {
                message: 'Too many connections',
                code: 'MAX_CONNECTIONS'
            });
            socket.disconnect(true);
            return;
        }

        userSocketSet.add(socket.id);
        socket.join(`user_${userId}`);

        console.log(`[Socket] ✅ User ${userId} connected | Socket: ${socket.id} | Total: ${userSocketSet.size}`);
        // socket.on('some-event', (data) => { ... });

        socket.on('disconnect', () => {
            const sockets = userSockets.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    userSockets.delete(userId);
                }
            }
            console.log(`[Socket] User ${userId} disconnected | Remaining: ${sockets?.size || 0}`);
        });
    });

    console.log('🚀 Socket.io Server initialized with JWT authentication');
    return io;
};

// ====================== UTILITIES ======================
export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io has not been initialized!');
    }
    return io;
};

/**
 * Gửi thông báo real-time tới một user cụ thể
 */
export const emitNotification = (userId, notification) => {
    if (!io || !userId) return false;

    try {
        io.to(`user_${userId}`).emit('notification', {
            ...notification,
            timestamp: new Date().toISOString(),
        });
        return true;
    } catch (err) {
        console.error(`[Socket] Failed to emit notification to user ${userId}:`, err.message);
        return false;
    }
};

/**
 * Gửi event tới nhiều user
 */
export const emitToUsers = (userIds, eventName, data) => {
    if (!io) return;

    userIds.forEach(userId => {
        io.to(`user_${userId}`).emit(eventName, data);
    });
};

/**
 * Gửi event tới tất cả user thuộc một role cụ thể
 */
export const emitToRoles = async (roles, eventName, data) => {
    if (!io) return;

    try {
        const User = mongoose.model('User');
        const users = await User.find({ role: { $in: roles }, isActive: true }).select('_id');
        const userIds = users.map(u => u._id.toString());
        emitToUsers(userIds, eventName, data);
    } catch (err) {
        console.error(`[Socket] Failed to emit to roles ${roles}:`, err.message);
    }
};

// ====================== STATUS LOGGER ======================
export const logSocketStatus = () => {
    console.log('🔌 Socket.io Status:');
    console.log(`   • CORS Origin : ${CONFIG.corsOrigin}`);
    console.log(`   • Auth        : JWT Protected`);
    console.log(`   • Max Conn/User: ${CONFIG.maxConnectionsPerUser}`);
    console.log(`   • Ping Interval: ${CONFIG.pingInterval / 1000}s`);
};
