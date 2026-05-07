import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.handshake.query.userId;
        if (userId) {
            socket.join(`user_${userId}`);
            console.log(`[Socket] User ${userId} connected and joined room user_${userId}`);
        }

        socket.on('disconnect', () => {
            console.log('[Socket] User disconnected');
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

/**
 * Gửi thông báo real-time tới một user cụ thể
 */
export const emitNotification = (userId, notification) => {
    if (io) {
        io.to(`user_${userId}`).emit('notification', notification);
    }
};
