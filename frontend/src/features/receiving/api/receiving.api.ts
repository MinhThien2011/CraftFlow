import axiosInstance from "@/lib/axios";
import { ApiResponse, PaginationData } from "@/lib/types";

export interface ReceivingSlipItem {
  material?: string;
  product?: string;
  itemName: string;
  itemCode: string;
  unit: string;
  quantity: {
    requested: number;
    provisional?: number;
    actual: number;
  };
  unitPrice: number;
  amount: number;
  batchNumber?: string;
  expirationDate?: string;
  location?: string;
}

export interface ReceivingSlip {
  _id: string;
  type: 'import' | 'export';
  slipNumber: string;
  date: string;
  status: string;
  reason: string;
  supplierName?: string; // Derived or added for UI
  personName?: string;
  warehouse?: {
    name: string;
    location: string;
  };
  items: ReceivingSlipItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ReceivingListResponse {
  success: boolean;
  message: string;
  data: {
    slips: ReceivingSlip[];
    pagination: PaginationData;
  };
}

export const receivingApi = {
  /**
   * Get all receiving/issuing slips
   */
  getSlips: async (params: {
    page?: number;
    limit?: number;
    type?: 'import' | 'export';
    status?: string;
    search?: string;
  } = {}): Promise<ReceivingListResponse> => {
    return axiosInstance.get("/slips", { params });
  },

  /**
   * Get a single slip by ID
   */
  getSlipById: async (id: string): Promise<ApiResponse<ReceivingSlip>> => {
    return axiosInstance.get(`/slips/${id}`);
  },

  /**
   * Create a new import/export slip
   */
  createSlip: async (data: any): Promise<ApiResponse<ReceivingSlip>> => {
    return axiosInstance.post("/slips", data);
  },

  /**
   * Update slip status (Kho Manager)
   */
  updateStatus: async (id: string, status: string): Promise<ApiResponse<ReceivingSlip>> => {
    return axiosInstance.patch(`/slips/${id}/status`, { status });
  },

  /**
   * Upload evidence images for a slip
   */
  uploadImages: async (id: string, formData: FormData): Promise<ApiResponse<ReceivingSlip>> => {
    return axiosInstance.post(`/slips/${id}/upload-images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
};
