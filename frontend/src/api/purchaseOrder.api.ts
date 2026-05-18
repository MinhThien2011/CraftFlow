import axiosInstance from "@/lib/axios";
import { ApiResponse, PaginationData } from "@/lib/types";

export interface PurchaseOrderItem {
    material: string | any;
    materialCode: string;
    unit: string;
    quantity: number;
    priceAtTimePurchase: number;
    totalPriceAtTimePurchase: number;
}

export interface PurchaseOrder {
    _id: string;
    creator: string | any;
    status: 'pending' | 'accepted' | 'rejected' | 'completed';
    priority: 'low' | 'medium' | 'high';
    productionOrder?: string | any;
    sourceProductionOrders?: Array<string | any>;
    materialAlert?: string | any;
    materialAlerts?: Array<string | any>;
    orderReason: string;
    adminNotes: string;
    purchaseOrderItems: PurchaseOrderItem[];
    totalBaseCost: number;
    createdAt: string;
    updatedAt: string;
}

export interface PurchaseOrderListResponse {
    status: string;
    success: boolean;
    data: {
        items: PurchaseOrder[];
        pagination: PaginationData;
    };
}

export const purchaseOrderApi = {
    getAll: async (params: {
        page?: number;
        limit?: number;
        status?: string;
    } = {}): Promise<PurchaseOrderListResponse> => {
        return axiosInstance.get("/purchaseOrders", { params });
    },

    getById: async (id: string): Promise<ApiResponse<PurchaseOrder>> => {
        return axiosInstance.get(`/purchaseOrders/${id}`);
    },

    create: async (data: Partial<PurchaseOrder>): Promise<ApiResponse<PurchaseOrder>> => {
        return axiosInstance.post("/purchaseOrders", data);
    },

    update: async (id: string, data: Partial<PurchaseOrder>): Promise<ApiResponse<PurchaseOrder>> => {
        return axiosInstance.put(`/purchaseOrders/${id}`, data);
    },

    updateStatus: async (id: string, status: string, adminNotes?: string): Promise<ApiResponse<PurchaseOrder>> => {
        return axiosInstance.patch(`/purchaseOrders/${id}/status`, { status, adminNotes });
    },

    delete: async (id: string): Promise<ApiResponse<null>> => {
        return axiosInstance.delete(`/purchaseOrders/${id}`);
    }
};
