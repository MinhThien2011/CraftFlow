import axiosInstance from "@/lib/axios";
import { ApiResponse } from "@/lib/types";

export interface Notification {
    _id: string;
    recipient: string;
    title: string;
    message: string;
    type: 'SYSTEM' | 'ORDER' | 'INVENTORY' | 'APPROVAL' | 'ALERT' | 'TASK';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    metaData?: any;
    isRead: boolean;
    readAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface NotificationListResponse {
    notifications: Notification[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export const notificationApi = {
    getNotifications: async (params: { page?: number; limit?: number } = {}): Promise<ApiResponse<NotificationListResponse>> => {
        return axiosInstance.get('/notifications', { params });
    },

    markAsRead: async (id: string): Promise<ApiResponse<Notification>> => {
        return axiosInstance.patch(`/notifications/${id}/read`);
    },

    markAllAsRead: async (): Promise<ApiResponse<any>> => {
        return axiosInstance.patch('/notifications/read-all');
    }
};
