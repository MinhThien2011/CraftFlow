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

export interface WarehouseFifoOverviewItem {
    itemType: 'material' | 'product';
    itemId: string;
    itemCode: string;
    itemName: string;
    unit: string;
    summary: {
        batchCount: number;
        activeBatchCount: number;
        totalReceived: number;
        totalRemaining: number;
        transactionCount: number;
        oldestReceivedDate: string | null;
        newestReceivedDate: string | null;
        latestTransactionAt: string | null;
    };
}

export interface FifoItemHistory {
    itemType: 'material' | 'product';
    itemId: string;
    itemCode: string;
    itemName: string;
    unit: string;
    summary: {
        batchCount: number;
        activeBatchCount: number;
        totalReceived: number;
        totalRemaining: number;
        transactionCount: number;
    };
    batches: Array<{
        batchId: string;
        batchNumber: string;
        receivedDate: string;
        expirationDate: string | null;
        quantityReceived: number;
        quantityRemaining: number;
        unitCost: number;
        isExhausted: boolean;
        currentLocation: {
            shelfId: string;
            shelfCode: string;
            warehouseSection: string;
            zone: string;
            aisle: string;
            level: string;
            bin: string;
            status: string;
        } | null;
        source: {
            importSlipNumber: string | null;
            purchaseOrderCode: string | null;
            productionOrderCode: string | null;
        };
    }>;
    transactions: Array<{
        transactionId: string;
        createdAt: string;
        type: string;
        quantity: number;
        signedQuantity: number;
        beforeStock: number | null;
        afterStock: number | null;
        batchId: string | null;
        batchNumber: string | null;
        location: string | null;
        orderRef: string | null;
        productionOrderCode: string | null;
        requisitionCode: string | null;
        purchaseOrderCode: string | null;
        performedBy: {
            userId: string;
            name: string;
            email: string | null;
        } | null;
        note: string | null;
    }>;
}

export const batchApi = {
    /**
     * Trace a batch by its batch number
     */
    traceBatch: async (batchNumber: string): Promise<ApiResponse<BatchTraceResult>> => {
        return axiosInstance.get(`/batches/trace/${batchNumber}`);
    },

    /**
     * Get batches used in a specific production order
     */
    getBatchesByProductionOrder: async (productionOrderId: string): Promise<ApiResponse<any[]>> => {
        return axiosInstance.get(`/batches/production-order/${productionOrderId}`);
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

    getWarehouseFifoOverview: async (params: { search?: string; type?: 'all' | 'material' | 'product' } = {}): Promise<ApiResponse<WarehouseFifoOverviewItem[]>> => {
        return axiosInstance.get('/batches/fifo-history/overview', { params });
    },

    getItemFifoHistory: async (params: { itemType: 'material' | 'product'; itemId: string }): Promise<ApiResponse<FifoItemHistory>> => {
        return axiosInstance.get('/batches/fifo-history/item', { params });
    },

    /**
     * Assign or move a batch to a shelf
     */
    assignLocation: async (batchId: string, shelfId: string, note?: string): Promise<ApiResponse<Batch>> => {
        return axiosInstance.post(`/batches/assign/${batchId}`, { shelfId, note });
    }
};
