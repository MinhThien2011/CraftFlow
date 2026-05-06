import Notification from '../models/Notification.js';
import { emitNotification } from '../config/socket.js';

/**
 * Tạo và gửi thông báo tới User
 */
export const createNotification = async ({ recipient, title, message, type = 'SYSTEM', priority = 'MEDIUM', metaData = {} }) => {
    try {
        const notification = new Notification({
            recipient,
            title,
            message,
            type,
            priority,
            metaData
        });

        await notification.save();

        // Gửi real-time qua socket
        emitNotification(recipient, notification);

        return notification;
    } catch (error) {
        console.error('[NotificationService] Error creating notification:', error);
    }
};

/**
 * Lấy danh sách thông báo của User (Phân trang)
 */
export const getUserNotifications = async (userId, { page = 1, limit = 20 } = {}) => {
    try {
        const skip = (page - 1) * limit;
        const notifications = await Notification.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Notification.countDocuments({ recipient: userId });

        return {
            notifications,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        console.error('[NotificationService] Error getting notifications:', error);
        throw error;
    }
};

/**
 * Đánh dấu thông báo đã đọc
 */
export const markAsRead = async (notificationId, userId) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, recipient: userId },
            { isRead: true, readAt: new Date() },
            { returnDocument: 'after' }
        );
        return notification;
    } catch (error) {
        console.error('[NotificationService] Error marking as read:', error);
        throw error;
    }
};

/**
 * Đánh dấu tất cả thông báo của User là đã đọc
 */
export const markAllAsRead = async (userId) => {
    try {
        await Notification.updateMany(
            { recipient: userId, isRead: false },
            { isRead: true, readAt: new Date() }
        );
        return true;
    } catch (error) {
        console.error('[NotificationService] Error marking all as read:', error);
        throw error;
    }
};
