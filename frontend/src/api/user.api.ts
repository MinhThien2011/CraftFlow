import axiosInstance from "@/lib/axios";
import { LoginResponse, ApiResponse, UserListResponse, User } from "@/lib/types";

export const userApi = {
    /**
     * Login user
     */
    login: async (identifier: string, password: string): Promise<LoginResponse> => {
        return axiosInstance.post("/auth/login", { identifier, password });
    },

    /**
     * Get current user profile
     */
    getMe: async (): Promise<LoginResponse> => {
        return axiosInstance.get("/auth/user");
    },

    /**
     * Logout from server (clears cookies)
     */
    logout: async (): Promise<ApiResponse<null>> => {
        return axiosInstance.post("/auth/logout");
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
        return axiosInstance.get("/users", { params });
    },

    /**
     * Create a new user
     */
    createUser: async (formData: FormData): Promise<ApiResponse<User>> => {
        return axiosInstance.post("/users", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    },

    /**
     * Update an existing user
     */
    updateUser: async (id: string, formData: FormData): Promise<ApiResponse<User>> => {
        return axiosInstance.patch(`/users/${id}`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    },

    /**
     * Delete a user
     */
    deleteUser: async (id: string): Promise<ApiResponse<null>> => {
        return axiosInstance.delete(`/users/${id}`);
    },

    /**
     * Update user status (active/inactive)
     */
    updateStatus: async (id: string, isActive: boolean): Promise<ApiResponse<User>> => {
        return axiosInstance.patch(`/users/${id}/status`, { isActive });
    },
};
