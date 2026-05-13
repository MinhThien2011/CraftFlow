import axiosInstance from "@/lib/axios";
import { ApiResponse, PaginationData } from "@/lib/types";

export interface ProductionOrderAssignment {
    _id: string;
    productionOrder: string;
    product: string | any;
    staff: {
        _id: string;
        fullName: string;
        username: string;
        currentAssignedQuantity?: number;
    };
    assignedQuantity: number;
    completedQuantity: number;
    status: string;
    notes?: string;
    startedAt?: string;
    finishedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ProductionOrder {
    _id: string;
    orderCode: string;
    products: Array<{
        product: string | any;
        quantity: number;
        productName?: string;
        productCode?: string;
    }>;
    status: string;
    priority: string;
    deadline: string;
    notes?: string;
    createdBy: string | any;
    assignments?: ProductionOrderAssignment[];
    createdAt: string;
    updatedAt: string;
}

export interface ProductionOrderListResponse {
    status: string;
    message: string;
    data: {
        orders: ProductionOrder[];
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
     * Get specific suggested distribution for an order
     */
    getSuggestedAssignments: async (id: string): Promise<ApiResponse<any>> => {
        return axiosInstance.get(`/production/${id}/suggest`);
    },

    /**
     * Get BOM for a specific order
     */
    getBom: async (id: string): Promise<ApiResponse<any>> => {
        return axiosInstance.get(`/production/${id}/bom`);
    },

    /**
     * Get material alerts for production manager
     */
    getMaterialAlerts: async (params: { status?: string, page?: number, limit?: number } = {}): Promise<ApiResponse<any>> => {
        return axiosInstance.get("/production/material-alerts", { params });
    },

    /**
     * Reassign a task to a different staff member
     */
    reassignTask: async (data: { assignmentId: string; newStaffId: string; reason?: string }): Promise<ApiResponse<any>> => {
        return axiosInstance.post("/production/reassign", data);
    },

    /**
     * Create a stock-in slip for a completed production order
     */
    createStockInSlip: async (id: string, data: { notes?: string, personInOut?: string, images?: string[] } = {}): Promise<ApiResponse<any>> => {
        return axiosInstance.post(`/production/${id}/stock-in`, data);
    }
};
