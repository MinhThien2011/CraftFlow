import axiosInstance from "@/lib/axios";
import { ApiResponse } from "@/lib/types";

export interface ProductExportItem {
    product: string;
    requestedQuantity: number;
    actualQuantity?: number;
}

export interface ProductExportRequest {
    _id: string;
    requestCode: string;
    createdBy: {
        _id: string;
        fullName: string;
    };
    items: {
        product: {
            _id: string;
            name: string;
            code: string;
            unit: string;
            currentStock: number;
        };
        requestedQuantity: number;
        actualQuantity: number;
    }[];
    status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
    reason: string;
    notes?: string;
    adminApprovedBy?: {
        _id: string;
        fullName: string;
    };
    relatedSlip?: any;
    approvedAt?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateProductExportData {
    items: {
        product: string;
        requestedQuantity: number;
    }[];
    reason: string;
    notes?: string;
}

export const productExportApi = {
    /**
     * Get all product export requests
     */
    getAllRequests: async (params: {
        page?: number;
        limit?: number;
        status?: string;
        requestCode?: string;
    } = {}): Promise<ApiResponse<{
        requests: ProductExportRequest[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>> => {
        return axiosInstance.get("/product-exports", { params });
    },

    /**
     * Get a single product export request by ID
     */
    getRequestById: async (id: string): Promise<ApiResponse<ProductExportRequest>> => {
        return axiosInstance.get(`/product-exports/${id}`);
    },

    /**
     * Create a new product export request (Production Manager)
     */
    createRequest: async (data: CreateProductExportData): Promise<ApiResponse<ProductExportRequest>> => {
        return axiosInstance.post("/product-exports", data);
    },

    /**
     * Update request status (Admin - approve/reject)
     */
    updateStatus: async (id: string, status: 'approved' | 'rejected'): Promise<ApiResponse<ProductExportRequest>> => {
        return axiosInstance.patch(`/product-exports/${id}/status`, { status });
    },
};
