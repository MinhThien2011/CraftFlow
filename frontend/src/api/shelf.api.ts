import axiosInstance from "@/lib/axios";
import { ApiResponse } from "@/lib/types";

export interface Shelf {
    _id: string;
    shelfCode: string;
    warehouseSection: string;
    category: 'Material' | 'Product' | 'General';
    status: 'Available' | 'Full' | 'Maintenance';
    isActive: boolean;
}

export const shelfApi = {
    /**
     * Get all shelves with filters
     */
    getAll: async (params: {
        category?: string;
        status?: string;
        warehouseSection?: string;
    } = {}): Promise<ApiResponse<Shelf[]>> => {
        return axiosInstance.get("/shelves", { params });
    },

    /**
     * Get a single shelf by ID
     */
    getById: async (id: string): Promise<ApiResponse<Shelf>> => {
        return axiosInstance.get(`/shelves/${id}`);
    }
};
