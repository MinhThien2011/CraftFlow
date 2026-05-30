import axiosInstance from "@/lib/axios";
import { ApiResponse } from "@/lib/types";

export interface ShrinkageReport {
    _id: string;
    reportCode: string;
    reportDate: string;
    material: any;
    batch: any;
    shrinkageAmount: number;
    totalReceivedQuantity: number;
    totalUsedQuantity: number;
    remainingQuantity: number;
    returnableQuantity: number;
    notableMetrics?: string;
    shrinkageReason: string;
    shrinkageImage?: string[];
    status: string;
    createdBy: any;
    createdAt: string;
    updatedAt: string;
    relatedReturnRequisition?: {
        _id: string;
        requisitionCode: string;
        status: string;
        relatedSlip?: string;
    };
    relatedReturnSlip?: {
        _id: string;
        slipNumber: string;
        status: string;
    };
}

export const shrinkageApi = {
    /**
     * Get all shrinkage reports
     */
    getReports: async (params: any = {}): Promise<ApiResponse<ShrinkageReport[]>> => {
        return axiosInstance.get("/shrinkage", { params });
    },

    /**
     * Create a new shrinkage report
     */
    createReport: async (data: any): Promise<ApiResponse<ShrinkageReport>> => {
        return axiosInstance.post("/shrinkage", data);
    },

    /**
     * Update shrinkage report status
     */
    updateStatus: async (id: string, data: { status: string; adminNotes?: string }): Promise<ApiResponse<ShrinkageReport>> => {
        return axiosInstance.patch(`/shrinkage/${id}/status`, data);
    },

    createReturnRequest: async (id: string, data: { requestedQuantity?: number } = {}): Promise<ApiResponse<any>> => {
        return axiosInstance.post(`/shrinkage/${id}/return-request`, data);
    },

    getSummary: async (params: any = {}): Promise<ApiResponse<any>> => {
        return axiosInstance.get('/shrinkage/summary', { params });
    },
};
