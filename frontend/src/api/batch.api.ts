import axiosInstance from "@/lib/axios";

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data: T;
}

export interface Batch {
    _id: string;
    batchNumber: string;
    material?: any;
    product?: any;
    quantityReceived: number;
    quantityRemaining: number;
    unit: string;
    receivedDate: string;
    expirationDate?: string;
    shelf?: {
        _id: string;
        shelfCode: string;
        warehouseSection: string;
        zone: string;
        aisle: string;
        level: string;
        bin: string;
    };
    relatedImportSlip?: {
        _id: string;
        slipNumber: string;
    };
    relatedPurchaseOrder?: {
        _id: string;
        orderCode: string;
    };
    isExhausted: boolean;
}

export interface BatchTransaction {
    _id: string;
    type: string;
    quantity: number;
    beforeStock: number;
    afterStock: number;
    performedBy: {
        fullName: string;
        username: string;
    };
    location: string;
    note: string;
    createdAt: string;
}

export interface BatchTraceResult {
    batch: Batch;
    history: BatchTransaction[];
}

export const batchApi = {
    /**
     * Trace a batch by its batch number
     */
    traceBatch: async (batchNumber: string): Promise<ApiResponse<BatchTraceResult>> => {
        return axiosInstance.get(`/batches/trace/${batchNumber}`);
    },

    /**
     * Get batches for a specific material
     */
    getBatchesByMaterial: async (materialId: string, includeExhausted = false): Promise<ApiResponse<Batch[]>> => {
        return axiosInstance.get(`/batches/material/${materialId}`, { params: { includeExhausted } });
    },

    /**
     * Get active batches with filters
     */
    getActiveBatches: async (params: { search?: string, unassignedOnly?: boolean, type?: 'Material' | 'Product' } = {}): Promise<ApiResponse<Batch[]>> => {
        return axiosInstance.get('/batches/active', { params });
    },

    /**
     * Assign or move a batch to a shelf
     */
    assignLocation: async (batchId: string, shelfId: string, note?: string): Promise<ApiResponse<Batch>> => {
        return axiosInstance.post(`/batches/assign/${batchId}`, { shelfId, note });
    }
};
