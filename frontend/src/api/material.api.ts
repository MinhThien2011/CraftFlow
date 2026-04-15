import { MaterialListResponse, MaterialCreateResponse, Material } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

/**
 * Base fetcher function with common logic
 */
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
        credentials: 'include', // Important for cookies
    });

    const data = await response.json();

    if (!response.ok) {
        const errorMessage = data.message || data.data?.message || "Something went wrong";
        throw new Error(errorMessage);
    }

    return data;
}

export const materialApi = {
    /**
     * Get list of materials with filtering and pagination
     */
    getMaterials: async (params: {
        limit?: number;
        page?: number;
        search?: string;
    } = {}): Promise<MaterialListResponse> => {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.append("limit", params.limit.toString());
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.search) queryParams.append("search", params.search);

        const queryString = queryParams.toString();
        const endpoint = `/materials/${queryString ? `?${queryString}` : ""}`;

        return fetcher<MaterialListResponse>(endpoint, {
            method: "GET",
        });
    },

    /**
     * Get list of materials with low stock
     */
    getLowStockMaterials: async (params: {
        limit?: number;
        page?: number;
        search?: string;
    } = {}): Promise<MaterialListResponse> => {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.append("limit", params.limit.toString());
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.search) queryParams.append("search", params.search);

        const queryString = queryParams.toString();
        const endpoint = `/materials/low-stock${queryString ? `?${queryString}` : ""}`;

        return fetcher<MaterialListResponse>(endpoint, {
            method: "GET",
        });
    },

    /**
     * Create a new material
     */
    createMaterial: async (materialData: Partial<Material>): Promise<MaterialCreateResponse> => {
        return fetcher<MaterialCreateResponse>("/materials", {
            method: "POST",
            body: JSON.stringify(materialData),
        });
    }
};
