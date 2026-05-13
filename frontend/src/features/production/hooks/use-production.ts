import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productionApi } from "@/api/production.api";
import { toast } from "sonner";

export const productionKeys = {
    all: ['production'] as const,
    orders: (params: any) => [...productionKeys.all, 'orders', { params }] as const,
    order: (id: string) => [...productionKeys.all, 'order', id] as const,
    suggestions: () => [...productionKeys.all, 'suggestions'] as const,
    alerts: (params: any) => [...productionKeys.all, 'alerts', { params }] as const,
    bom: (id: string) => [...productionKeys.all, 'bom', id] as const,
};

export function useProductionOrders(params: any = {}) {
    return useQuery({
        queryKey: productionKeys.orders(params),
        queryFn: () => productionApi.getOrders(params),
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
}

export function useProductionOrder(id: string) {
    return useQuery({
        queryKey: productionKeys.order(id),
        queryFn: () => productionApi.getOrderById(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useCreateProductionOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => productionApi.createOrder(data),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: productionKeys.all });
            toast.success("Tạo lệnh sản xuất thành công");
        },
        onError: (error: any) => {
            toast.error(error.message || "Tạo thất bại");
        }
    });
}

export function useUpdateOrderStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
            productionApi.updateStatus(id, status, notes),
        onSuccess: (response, variables) => {
            queryClient.invalidateQueries({ queryKey: productionKeys.all });
            queryClient.invalidateQueries({ queryKey: productionKeys.order(variables.id) });
            toast.success("Cập nhật trạng thái thành công");
        },
    });
}

export function useAssignOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderId, assignments }: { orderId: string, assignments: any[] }) =>
            productionApi.assignOrder(orderId, assignments),
        onSuccess: (response, variables) => {
            queryClient.invalidateQueries({ queryKey: productionKeys.all });
            queryClient.invalidateQueries({ queryKey: productionKeys.order(variables.orderId) });
            toast.success("Phân công nhân sự thành công");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || "Phân công thất bại");
        }
    });
}

export function useStaffSuggestions() {
    return useQuery({
        queryKey: productionKeys.suggestions(),
        queryFn: () => productionApi.getStaffSuggestions()
    });
}

export function useSuggestedAssignments(id: string) {
    return useQuery({
        queryKey: [...productionKeys.order(id), 'suggest'],
        queryFn: () => productionApi.getSuggestedAssignments(id),
        enabled: !!id
    });
}

export function useMaterialAlerts(params: any = {}) {
    return useQuery({
        queryKey: productionKeys.alerts(params),
        queryFn: () => productionApi.getMaterialAlerts(params),
    });
}

export function useReassignTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { assignmentId: string; newStaffId: string; reason?: string }) =>
            productionApi.reassignTask(data),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: productionKeys.all });
            toast.success("Thay đổi nhân sự thành công");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || "Thay đổi thất bại");
        }
    });
}

export function useCreateStockInSlip() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data?: any }) =>
            productionApi.createStockInSlip(id, data),
        onSuccess: (response, variables) => {
            queryClient.invalidateQueries({ queryKey: productionKeys.all });
            queryClient.invalidateQueries({ queryKey: productionKeys.order(variables.id) });
            toast.success("Đã tạo yêu cầu nhập kho thành phẩm");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || "Tạo yêu cầu nhập kho thất bại");
        }
    });
}
