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
}

export interface Slip {
    _id: string;
    type: 'import' | 'export';
    slipNumber: string;
    date: string;
    status: 'pending' | 'received' | 'inspected' | 'inspecting' | 'in_stock' | 'completed' | 'verified' | 'cancelled';
    personName: string;
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

export const slipApi = {
    // Lấy danh sách slip (có hỗ trợ filter type: 'import' | 'export')
    getSlips: async (params?: { type?: string; page?: number; limit?: number; search?: string; status?: string }): Promise<any> => {
        return axiosInstance.get("/slips", { params });
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
            actualQuantity?: number;
            provisionalQuantity?: number;
            itemNote?: string;
        }>;
        notes?: string;
    }): Promise<any> => {
        return axiosInstance.patch(`/slips/${id}/status`, data);
    }
};