import { ApiResponse, Material, Product, PaginationData } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

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
        credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
        const errorMessage = data.message || data.data?.message || "Something went wrong";
        throw new Error(errorMessage);
    }

    return data;
}

export interface InventoryOverview {
    totalMaterials: number;
    lowStockMaterials: number;
    criticalMaterials: number;
    totalInventoryValue: number;
    totalProducts: number;
    lowStockProducts: number;
}

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
    getOverview: async (): Promise<InventoryOverviewResponse> => {
        return fetcher<InventoryOverviewResponse>("/inventory/overview");
    },

    getMaterialsStock: async (params: {
        search?: string;
        category?: string;
        page?: number;
        limit?: number;
    } = {}): Promise<MaterialStockResponse> => {
        const queryParams = new URLSearchParams();
        if (params.search) queryParams.append("search", params.search);
        if (params.category && params.category !== 'All') queryParams.append("category", params.category);
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.limit) queryParams.append("limit", params.limit.toString());

        return fetcher<MaterialStockResponse>(`/inventory/materials?${queryParams.toString()}`);
    },

    getProductsStock: async (params: {
        search?: string;
        category?: string;
        page?: number;
        limit?: number;
    } = {}): Promise<ProductStockResponse> => {
        const queryParams = new URLSearchParams();
        if (params.search) queryParams.append("search", params.search);
        if (params.category && params.category !== 'All') queryParams.append("category", params.category);
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.limit) queryParams.append("limit", params.limit.toString());

        return fetcher<ProductStockResponse>(`/inventory/products?${queryParams.toString()}`);
    }
};
