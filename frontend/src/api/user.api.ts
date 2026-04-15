import { LoginResponse, ApiResponse, UserListResponse } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

/**
 * Base fetcher function with common logic
 */
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
        credentials: 'include', // Important for cookies
    });

    const data = await response.json();

    if (!response.ok) {
        // Extract message from data.message or data.data.message
        const errorMessage = data.message || data.data?.message || "Something went wrong";
        throw new Error(errorMessage);
    }

    return data;
}

export const userApi = {
    /**
     * Login user
     */
    login: async (identifier: string, password: string): Promise<LoginResponse> => {
        return fetcher<LoginResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ identifier, password }),
        });
    },

    /**
     * Get current user profile
     */
    getMe: async (): Promise<LoginResponse> => {
        return fetcher<LoginResponse>("/auth/user", {
            method: "GET",
        });
    },

    /**
     * Logout from server (clears cookies)
     */
    logout: async (): Promise<ApiResponse<null>> => {
        return fetcher<ApiResponse<null>>("/auth/logout", {
            method: "POST",
        });
    },

    /**
     * Get users with filters and pagination
     */
    getUsers: async (params: {
        role?: string;
        isActive?: boolean;
        search?: string;
        limit?: number;
        page?: number;
    } = {}): Promise<UserListResponse> => {
        const queryParams = new URLSearchParams();
        if (params.role) queryParams.append("role", params.role);
        if (params.isActive !== undefined) queryParams.append("isActive", params.isActive.toString());
        if (params.search) queryParams.append("search", params.search);
        if (params.limit) queryParams.append("limit", params.limit.toString());
        if (params.page) queryParams.append("page", params.page.toString());

        const queryString = queryParams.toString();
        return fetcher<UserListResponse>(`/users/${queryString ? `?${queryString}` : ""}`, {
            method: "GET",
        });
    }
};
