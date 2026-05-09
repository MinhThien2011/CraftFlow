import axiosInstance from "@/lib/axios";
import { 
    ApiResponse, 
    Material, 
    Product, 
    PaginationData, 
    InventoryHistoryResponse, 
    InventoryOverview 
} from "@/lib/types";

export interface InventoryOverviewResponse {
    status: string;
    success: boolean;
    data: InventoryOverview;
}

export interface MaterialStockResponse {
    status: string;
    success: boolean;
    data: {
        items: Material[];
        pagination: PaginationData;
    };
}

export interface ProductStockResponse {
    status: string;
    success: boolean;
    data: {
        items: Product[];
        pagination: PaginationData;
    };
}

export const inventoryApi = {
    /**
     * Get inventory overview statistics
     */
    getOverview: async (): Promise<InventoryOverviewResponse> => {
        return axiosInstance.get("/inventory/overview");
    },

    /**
     * Get material stock with filtering and pagination
     */
    getMaterialsStock: async (params: {
        search?: string;
        category?: string;
        page?: number;
        limit?: number;
    } = {}): Promise<MaterialStockResponse> => {
        return axiosInstance.get("/inventory/materials", { params });
    },

    /**
     * Get product stock with filtering and pagination
     */
    getProductsStock: async (params: {
        search?: string;
        category?: string;
        page?: number;
        limit?: number;
    } = {}): Promise<ProductStockResponse> => {
        return axiosInstance.get("/inventory/products", { params });
    },

    /**
     * Get material movement history
     */
    getMaterialHistory: async (params: {
        page?: number;
        limit?: number;
        direction?: 'in' | 'out';
    } = {}): Promise<InventoryHistoryResponse> => {
        return axiosInstance.get("/materials/history", { params });
    },

    /**
     * Create a manual stock adjustment
     */
    adjustStock: async (data: {
        type: 'material' | 'product';
        id: string;
        quantity: number;
        reason: string;
        note?: string;
    }): Promise<ApiResponse<any>> => {
        return axiosInstance.post("/inventory/adjust", data);
    }
};
