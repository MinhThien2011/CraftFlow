import axiosInstance from "@/lib/axios";
import { MaterialListResponse, MaterialCreateResponse, Material, ApiResponse } from "@/lib/types";

export const materialApi = {
    /**
     * Get list of materials with filtering and pagination
     */
    getMaterials: async (params: {
        limit?: number;
        page?: number;
        search?: string;
        category?: string;
        isActive?: boolean;
    } = {}): Promise<MaterialListResponse> => {
        return axiosInstance.get("/materials", { params });
    },

    /**
     * Get list of materials with low stock
     */
    getLowStockMaterials: async (params: {
        limit?: number;
        page?: number;
        search?: string;
    } = {}): Promise<MaterialListResponse> => {
        return axiosInstance.get("/materials/low-stock", { params });
    },

    /**
     * Get a single material by ID
     */
    getMaterialById: async (id: string): Promise<ApiResponse<Material>> => {
        return axiosInstance.get(`/materials/${id}`);
    },

    /**
     * Create a new material
     */
    createMaterial: async (materialData: Partial<Material>): Promise<MaterialCreateResponse> => {
        return axiosInstance.post("/materials", materialData);
    },

    /**
     * Update an existing material
     */
    updateMaterial: async (id: string, materialData: Partial<Material>): Promise<ApiResponse<Material>> => {
        return axiosInstance.patch(`/materials/${id}`, materialData);
    },

    /**
     * Delete a material
     */
    deleteMaterial: async (id: string): Promise<ApiResponse<null>> => {
        return axiosInstance.delete(`/materials/${id}`);
    }
};
