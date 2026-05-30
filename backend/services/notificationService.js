import Notification from '../models/Notification.js';
import { emitNotification } from '../config/socket.js';
import { applyCreatedAtCursor, buildListPagination, normalizePagination } from '../utils/pagination.js';

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
export const getUserNotifications = async (userId, { page = 1, limit = 20, cursor, withTotal = true } = {}) => {
    try {
        const { pageNum, limitNum, skip, cursor: cursorId, withTotal: shouldCount } = normalizePagination({ page, limit, cursor, withTotal });
        const filter = applyCreatedAtCursor({ recipient: userId }, cursorId);

        const [notifications, total] = await Promise.all([
            Notification.find(filter)
                .sort({ createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            shouldCount ? Notification.countDocuments(filter) : Promise.resolve(undefined)
        ]);

        return {
            notifications,
            pagination: buildListPagination({ items: notifications, total, pageNum, limitNum, cursor: cursorId, withTotal: shouldCount })
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
