import axiosInstance from "@/lib/axios";

export interface SlipItem {
    id?: string;
    _id?: string;
    quantity: {
        requested: number;
        actual: number;
        provisional: number;
    };
    product?: string;
    material?: string;
    itemName: string;
    itemCode: string;
    unit: string;
    unitPrice: number;
    amount: number;
    batchNumber?: string;
    expirationDate?: string;
    shelf?: string | { _id: string; shelfCode: string };
    itemNote?: string;
}

export interface Slip {
    _id: string;
    type: 'import' | 'export';
    slipNumber: string;
    date: string;
    status: 'pending' | 'received' | 'inspected' | 'inspecting' | 'in_stock' | 'completed' | 'verified' | 'cancelled';
    personName: string;
    category: string;
    notes: string;
    reason: string;
    relatedRequisition?: string;
    items: SlipItem[];
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
    unit?: string;
    department?: string;
    accounting?: {
        debit?: string;
        credit?: string;
    };
    warehouse?: {
        name?: string;
        location?: string;
    };
    referenceDoc?: {
        description?: string;
        number?: string;
        date?: string;
        issuer?: string;
    };
    totalAmountInWords?: string;
    originalDocsCount?: string;
    images?: string[];
    imageUploadedAt?: string;
    isImageUploadLate?: boolean;
    finalizedAt?: string;
    inStockAt?: string;
    signatures?: {
        creator?: {
            _id: string;
            name: string;
            email: string;
        };
        storekeeper?: {
            _id: string;
            name: string;
            email: string;
        };
        chiefAccountant?: {
            _id: string;
            name: string;
            email: string;
        };
        manager?: {
            _id: string;
            name: string;
            email: string;
        };
        personInOut?: string;
    };
}

export interface FifoAuditItem {
    itemType: 'material' | 'product';
    itemId: string;
    passed: boolean;
    violations: Array<{
        usedBatchId: string;
        usedBatchNumber: string;
        expectedBatchId: string;
        expectedBatchNumber: string;
        usedQty: number;
    }>;
    allocations: Array<{
        transactionId: string;
        batchId: string;
        batchNumber: string;
        receivedDate: string;
        quantity: number;
        createdAt: string;
    }>;
}

export interface FifoAuditResult {
    slipId: string;
    slipNumber: string;
    type: 'import' | 'export';
    applicable: boolean;
    passed: boolean;
    itemCount: number;
    violationCount: number;
    items: FifoAuditItem[];
}

export interface FifoHistoryTransaction {
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
}

export interface FifoHistoryBatch {
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
}

export interface FifoHistoryItem {
    itemType: 'material' | 'product';
    itemId: string;
    itemName: string;
    itemCode: string;
    unit: string;
    summary: {
        batchCount: number;
        activeBatchCount: number;
        totalReceived: number;
        totalRemaining: number;
        transactionCount: number;
    };
    batches: FifoHistoryBatch[];
    transactions: FifoHistoryTransaction[];
}

export interface FifoHistoryResult {
    slipId: string;
    slipNumber: string;
    slipType: 'import' | 'export';
    generatedAt: string;
    items: FifoHistoryItem[];
}

export const slipApi = {
    // Lấy chi tiết slip
    getSlipById: async (id: string): Promise<any> => {
        return axiosInstance.get(`/slips/${id}`);
    },
    getFifoAudit: async (id: string): Promise<{ success: boolean; message: string; data: FifoAuditResult }> => {
        return axiosInstance.get(`/slips/${id}/fifo-audit`);
    },
    getFifoHistory: async (id: string): Promise<{ success: boolean; message: string; data: FifoHistoryResult }> => {
        return axiosInstance.get(`/slips/${id}/fifo-history`);
    },

    // Lấy danh sách slip (có hỗ trợ filter type: 'import' | 'export')
    getSlips: async (params?: { type?: string; category?: string; page?: number; limit?: number; search?: string; status?: string; withTotal?: boolean }): Promise<any> => {
        const requestParams = params?.search
            ? { ...params, slipNumber: params.search, search: undefined }
            : params;
        return axiosInstance.get("/slips", { params: requestParams });
    },

    // Cập nhật thông tin chi tiết slip (Production Manager / Admin)
    updateSlipDetails: async (id: string, data: Partial<Slip>): Promise<any> => {
        return axiosInstance.patch(`/slips/${id}/details`, data);
    },

    // Cập nhật trạng thái và số lượng thực tế (Kho Manager / Admin)
    updateSlipStatus: async (id: string, data: {
        status: string;
        items?: Array<{
            itemCode?: string;
            material?: string;
            product?: string;
            actualQuantity?: number;
            provisionalQuantity?: number;
            batchNumber?: string;
            expirationDate?: string;
            shelf?: string;
            itemNote?: string;
        }>;
        notes?: string;
    }): Promise<any> => {
        return axiosInstance.patch(`/slips/${id}/status`, data);
    },

    // Upload ảnh chứng từ (Evidence Images)
    uploadSlipImages: async (id: string, files: File[]): Promise<any> => {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('evidenceImages', file);
        });
        return axiosInstance.post(`/slips/${id}/upload-images`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
};
