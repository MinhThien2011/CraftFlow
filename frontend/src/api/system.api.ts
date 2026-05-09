import axiosInstance from "@/lib/axios";
import { SystemLogListResponse, DashboardStatsResponse } from "@/lib/types";

export interface GetSystemLogsParams {
  page?: number;
  limit?: number;
  module?: string;
  action?: string;
  authorId?: string;
  startDate?: string;
  endDate?: string;
}

export const systemApi = {
  /**
   * Get system logs with filtering and pagination
   */
  getSystemLogs: async (params: GetSystemLogsParams = {}): Promise<SystemLogListResponse> => {
    return axiosInstance.get("/system/logs", { params });
  },

  /**
   * Get dashboard summary data
   */
  getDashboardStats: async (days: number = 7): Promise<DashboardStatsResponse> => {
    return axiosInstance.get("/dashboard", { params: { days } });
  },

  /**
   * Get system settings
   */
  getSettings: async (): Promise<any> => {
    return axiosInstance.get("/system/settings");
  },

  /**
   * Update system settings
   */
  updateSettings: async (settings: any): Promise<any> => {
    return axiosInstance.patch("/system/settings", settings);
  }
};
