import axiosInstance from "@/lib/axios";
import { ProductListResponse, ProductResponse, ApiResponse } from "@/lib/types";

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
        return axiosInstance.get("/products", { params });
    },

    /**
     * Get a single product by ID
     */
    getProductById: async (id: string): Promise<ProductResponse> => {
        return axiosInstance.get(`/products/${id}`);
    },

    /**
     * Create a new product
     */
    createProduct: async (formData: FormData): Promise<ProductResponse> => {
        return axiosInstance.post("/products", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    },

    /**
     * Update an existing product
     */
    updateProduct: async (id: string, formData: FormData): Promise<ProductResponse> => {
        return axiosInstance.put(`/products/${id}`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    },

    /**
     * Delete (deactivate) a product
     */
    deleteProduct: async (id: string): Promise<ApiResponse<null>> => {
        return axiosInstance.delete(`/products/${id}`);
    },

    /**
     * Get products with low stock
     */
    getLowStockProducts: async (params: {
        search?: string;
        page?: number;
        limit?: number;
    } = {}): Promise<ProductListResponse> => {
        return axiosInstance.get("/products/low-stock", { params });
    },

    /**
     * Get product movement history
     */
    getHistory: async (id: string, params: {
        page?: number;
        limit?: number;
        type?: string;
        direction?: 'in' | 'out';
    } = {}): Promise<ApiResponse<any>> => {
        return axiosInstance.get(`/products/${id}/history`, { params });
    },
};
