import axiosInstance from "@/lib/axios";
import { LoginResponse, ApiResponse, UserListResponse, User } from "@/lib/types";

export const authApi = {
    login: async (identifier: string, password: string): Promise<LoginResponse> => {
        return axiosInstance.post("/auth/login", { identifier, password });
    },
    getMe: async (): Promise<LoginResponse> => {
        return axiosInstance.get("/auth/user");
    },
    logout: async (): Promise<ApiResponse<null>> => {
        return axiosInstance.post("/auth/logout");
    },
};

export const userApi = {
    getUsers: async (params: any = {}): Promise<UserListResponse> => {
        return axiosInstance.get("/users", { params });
    },
    createUser: async (formData: FormData): Promise<ApiResponse<User>> => {
        return axiosInstance.post("/users", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },
    updateUser: async (id: string, formData: FormData): Promise<ApiResponse<User>> => {
        return axiosInstance.patch(`/users/${id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },
    deleteUser: async (id: string): Promise<ApiResponse<null>> => {
        return axiosInstance.delete(`/users/${id}`);
    },
    updateStatus: async (id: string, isActive: boolean): Promise<ApiResponse<User>> => {
        return axiosInstance.patch(`/users/${id}/status`, { isActive });
    },
};
