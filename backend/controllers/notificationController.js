import { StatusCodes } from 'http-status-codes';
import * as notificationService from '../services/notificationService.js';

export const getMyNotifications = async (req, res) => {
    try {
        const userId = req.userId;
        const { page, limit } = req.query;
        const result = await notificationService.getUserNotifications(userId, { page, limit });

        return res.status(StatusCodes.OK).json({
            success: true,
            data: result
        });
    } catch (error) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: error.message
        });
    }
};

export const markRead = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const result = await notificationService.markAsRead(id, userId);

        if (!result) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: 'error',
                message: 'Notification not found'
            });
        }

        return res.status(StatusCodes.OK).json({
            success: true,
            data: result
        });
    } catch (error) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: error.message
        });
    }
};

export const markAllRead = async (req, res) => {
    try {
        const userId = req.userId;
        await notificationService.markAllAsRead(userId);

        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: error.message
        });
    }
};
