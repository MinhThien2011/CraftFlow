import axiosInstance from "@/lib/axios";
import { ApiResponse, PaginationData } from "@/lib/types";

export interface ProductionOrder {
    _id: string;
    orderCode: string;
    products: Array<{
        product: string | any;
        quantity: number;
    }>;
    status: string;
    priority: string;
    deadline: string;
    notes?: string;
    createdBy: string | any;
    createdAt: string;
    updatedAt: string;
}

export interface ProductionOrderListResponse {
    status: string;
    message: string;
    data: {
        items: ProductionOrder[];
        pagination: PaginationData;
    };
}

export const productionApi = {
    /**
     * Get list of production orders with filtering and pagination
     */
    getOrders: async (params: {
        status?: string;
        priority?: string;
        search?: string;
        page?: number;
        limit?: number;
    } = {}): Promise<ProductionOrderListResponse> => {
        return axiosInstance.get("/production", { params });
    },

    /**
     * Get a single production order by ID
     */
    getOrderById: async (id: string): Promise<ApiResponse<ProductionOrder>> => {
        return axiosInstance.get(`/production/${id}`);
    },

    /**
     * Create a new production order
     */
    createOrder: async (orderData: any): Promise<ApiResponse<ProductionOrder>> => {
        return axiosInstance.post("/production", orderData);
    },

    /**
     * Assign production order to staff
     */
    assignOrder: async (orderId: string, assignments: any[]): Promise<ApiResponse<any>> => {
        return axiosInstance.post("/production/assign", { orderId, assignments });
    },

    /**
     * Check if materials are sufficient for an order
     */
    checkMaterials: async (id: string): Promise<ApiResponse<any>> => {
        return axiosInstance.post(`/production/${id}/check-materials`);
    },

    /**
     * Update production order status
     */
    updateStatus: async (id: string, status: string, notes?: string): Promise<ApiResponse<any>> => {
        return axiosInstance.patch(`/production/${id}/status`, { status, notes });
    },

    /**
     * Update task/assignment status (used by staff)
     */
    updateAssignmentStatus: async (id: string, data: { status: string; completedQuantity: number }): Promise<ApiResponse<any>> => {
        return axiosInstance.patch(`/production/assignment/${id}`, data);
    },

    /**
     * Get suggestions for staff assignment
     */
    getStaffSuggestions: async (): Promise<ApiResponse<any>> => {
        return axiosInstance.get("/production/suggestions");
    },

    /**
     * Get BOM for a specific order
     */
    getBom: async (id: string): Promise<ApiResponse<any>> => {
        return axiosInstance.get(`/production/${id}/bom`);
    }
};
