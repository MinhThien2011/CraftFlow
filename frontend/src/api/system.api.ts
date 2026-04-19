import { SystemLogListResponse, SystemLog, PaginationData } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function fetcher<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage =
      data.message || data.data?.message || "Something went wrong";
    throw new Error(errorMessage);
  }

  return data;
}

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
  getSystemLogs: async (
    params: GetSystemLogsParams = {}
  ): Promise<SystemLogListResponse> => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.module) queryParams.append("module", params.module);
    if (params.action) queryParams.append("action", params.action);
    if (params.authorId) queryParams.append("authorId", params.authorId);
    if (params.startDate) queryParams.append("startDate", params.startDate);
    if (params.endDate) queryParams.append("endDate", params.endDate);

    const query = queryParams.toString();
    const endpoint = `/system/logs${query ? `?${query}` : ""}`;
    return fetcher<SystemLogListResponse>(endpoint, { method: "GET" });
  },
};