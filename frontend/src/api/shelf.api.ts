import axiosInstance from "@/lib/axios";
import { ApiResponse } from "@/lib/types";

export interface Shelf {
    _id: string;
    shelfCode: string;
    warehouseSection: string;
    category: 'Material' | 'Product' | 'General';
    maxCapacity: number;
    currentLoad: number;
    status: 'Available' | 'Full' | 'Maintenance';
    description?: string;
    isActive: boolean;
    items?: Array<{
        name: string;
        code: string;
        currentStock: number;
        unit: string;
        type: 'Material' | 'Product';
    }>;
    itemCount?: number;
    createdAt?: string;
    updatedAt?: string;
}

export const shelfApi = {
    /**
     * Get all shelves with filters
     */
    getAll: async (params: {
        category?: string;
        status?: string;
        warehouseSection?: string;
        search?: string;
    } = {}): Promise<ApiResponse<Shelf[]>> => {
        return axiosInstance.get("/shelves", { params });
    },

    /**
     * Get a single shelf by ID
     */
    getById: async (id: string): Promise<ApiResponse<Shelf>> => {
        return axiosInstance.get(`/shelves/${id}`);
    },

    /**
     * Create a new shelf
     */
    create: async (data: Partial<Shelf>): Promise<ApiResponse<Shelf>> => {
        return axiosInstance.post("/shelves", data);
    },

    /**
     * Update an existing shelf
     */
    update: async (id: string, data: Partial<Shelf>): Promise<ApiResponse<Shelf>> => {
        return axiosInstance.put(`/shelves/${id}`, data);
    },

    /**
     * Delete a shelf
     */
    delete: async (id: string): Promise<ApiResponse<void>> => {
        return axiosInstance.delete(`/shelves/${id}`);
    },

    /**
     * Get shelf recommendations for a specific material or product
     */
    getRecommendations: async (itemId: string, type: 'Material' | 'Product' = 'Material', quantity: number = 0): Promise<ApiResponse<Shelf[]>> => {
        return axiosInstance.get(`/shelves/recommendations/${itemId}`, { params: { type, quantity } });
    }
};
