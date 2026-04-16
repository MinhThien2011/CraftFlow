import { ProductListResponse, ProductResponse, ApiResponse } from "@/lib/types";

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

export const productApi = {
    /**
     * Get all products with filters and pagination
     */
    getProducts: async (params: {
        search?: string;
        category?: string;
        isActive?: string | boolean;
        limit?: number;
        page?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    } = {}): Promise<ProductListResponse> => {
        const queryParams = new URLSearchParams();
        if (params.search) queryParams.append("search", params.search);
        if (params.category && params.category !== 'All') queryParams.append("category", params.category);
        if (params.isActive !== undefined) queryParams.append("isActive", params.isActive.toString());
        if (params.limit) queryParams.append("limit", params.limit.toString());
        if (params.page) queryParams.append("page", params.page.toString());
        if (params.sortBy) queryParams.append("sortBy", params.sortBy);
        if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

        return fetcher<ProductListResponse>(`/products?${queryParams.toString()}`);
    },

    /**
     * Get a single product by ID
     */
    getProductById: async (id: string): Promise<ProductResponse> => {
        return fetcher<ProductResponse>(`/products/${id}`);
    },

    /**
     * Create a new product
     */
    createProduct: async (formData: FormData): Promise<ProductResponse> => {
        return fetcher<ProductResponse>("/products", {
            method: "POST",
            body: formData,
            // Don't set Content-Type header when sending FormData, 
            // the browser will set it with the correct boundary
            headers: {} 
        });
    },

    /**
     * Update an existing product
     */
    updateProduct: async (id: string, formData: FormData): Promise<ProductResponse> => {
        return fetcher<ProductResponse>(`/products/${id}`, {
            method: "PUT",
            body: formData,
            headers: {}
        });
    },

    /**
     * Delete (deactivate) a product
     */
    deleteProduct: async (id: string): Promise<ApiResponse<null>> => {
        return fetcher<ApiResponse<null>>(`/products/${id}`, {
            method: "DELETE",
        });
    }
};
