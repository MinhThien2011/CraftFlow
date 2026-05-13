import axiosInstance from "@/lib/axios";

export const requisitionApi = {
    getRequisitions: (params?: any) => axiosInstance.get('/requisitions', { params }),
    getRequisitionById: (id: string) => axiosInstance.get(`/requisitions/${id}`),
    updateStatus: (id: string, payload: { status: string, notes?: string, evidenceImage?: string }) => 
        axiosInstance.patch(`/requisitions/${id}/status`, payload),
};