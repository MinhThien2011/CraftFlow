import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

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
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
        console.warn(`[Socket] Unauthorized connection attempt from ${socket.id}`);
        return next(new Error('Authentication required'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256'],
        });

        const userId = decoded.id || decoded.userId;
        if (!userId) {
            return next(new Error('Invalid token payload'));
        }

        socket.userId = userId;
        next();
    } catch (err) {
        console.warn(`[Socket] Invalid token from ${socket.id}: ${err.name}`);
        next(new Error('Invalid token'));
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
            socket.emit('error', { message: 'Too many connections' });
            socket.disconnect(true);
            return;
        }

        userSocketSet.add(socket.id);
        socket.join(`user_${userId}`);

        console.log(`[Socket] ✅ User ${userId} connected | Socket: ${socket.id} | Total: ${userSocketSet.size}`);

        // Handle custom events here if needed
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

// ====================== STATUS LOGGER ======================
export const logSocketStatus = () => {
    console.log('🔌 Socket.io Status:');
    console.log(`   • CORS Origin : ${CONFIG.corsOrigin}`);
    console.log(`   • Auth        : JWT Protected`);
    console.log(`   • Max Conn/User: ${CONFIG.maxConnectionsPerUser}`);
    console.log(`   • Ping Interval: ${CONFIG.pingInterval / 1000}s`);
};