import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productionApi } from "@/api/production.api";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/features/auth/hooks/use-auth";

export const productionKeys = {
  all: queryKeys.production.all,
  orders: (params: any, scope: string | null) => [...productionKeys.all, 'orders', { scope, params }] as const,
  order: (id: string, scope: string | null) => [...productionKeys.all, 'order', scope, id] as const,
  suggestions: () => [...productionKeys.all, 'suggestions'] as const,
  alerts: (params: any) => [...productionKeys.all, 'alerts', { params }] as const,
  bom: (id: string, scope: string | null) => [...productionKeys.all, 'bom', scope, id] as const,
};

export function useProductionOrders(params: any = {}) {
    const { user } = useAuth();
    const scope = user?._id || null;
    return useQuery({
        queryKey: productionKeys.orders(params, scope),
        queryFn: () => productionApi.getOrders(params),
        enabled: !!scope,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
}

export function useProductionOrder(id: string) {
    const { user } = useAuth();
    const scope = user?._id || null;
    return useQuery({
        queryKey: productionKeys.order(id, scope),
        queryFn: () => productionApi.getOrderById(id),
        enabled: !!id && !!scope,
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
            toast.success((response as any)?.message || "Cap nhat trang thai thanh cong");
        },
    });
}

export function useUpdateAssignmentStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: { status?: string; completedQuantity: number } }) =>
            productionApi.updateAssignmentStatus(id, data),
        onSuccess: (response, variables) => {
            queryClient.invalidateQueries({ queryKey: productionKeys.all });
            toast.success("Báo cáo tiến độ thành công");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || "Báo cáo thất bại");
        }
    });
}

export function useAssignOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderId, assignments }: { orderId: string, assignments: any[] }) =>
            productionApi.assignOrder(orderId, assignments),
        onSuccess: (response, variables) => {
            queryClient.invalidateQueries({ queryKey: productionKeys.all });
            toast.success("Phân công nhân sự thành công");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || "Phân công thất bại");
        }
    });
}

export function useStaffSuggestions(enabled = true) {
    return useQuery({
        queryKey: productionKeys.suggestions(),
        queryFn: () => productionApi.getStaffSuggestions(),
        enabled,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useSuggestedAssignments(id: string, enabled = true) {
    const { user } = useAuth();
    const scope = user?._id || null;
    return useQuery({
        queryKey: [...productionKeys.order(id, scope), 'suggest'],
        queryFn: () => productionApi.getSuggestedAssignments(id),
        enabled: !!id && !!scope && enabled,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
}

export function useMaterialAlerts(params: any = {}) {
    return useQuery({
        queryKey: productionKeys.alerts(params),
        queryFn: () => productionApi.getMaterialAlerts(params),
        staleTime: 1000 * 60 * 1, // 1 minute
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
            toast.success("Đã tạo yêu cầu nhập kho thành phẩm");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || "Tạo yêu cầu nhập kho thất bại");
        }
    });
}

export function useUpdateProductionOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            productionApi.updateOrder(id, data),
        onSuccess: (response, variables) => {
            queryClient.invalidateQueries({ queryKey: productionKeys.all });
            toast.success("Cập nhật lệnh sản xuất thành công");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || "Cập nhật thất bại");
        }
    });
}

export function useCancelProductionOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            productionApi.cancelOrder(id, reason),
        onSuccess: (response, variables) => {
            queryClient.invalidateQueries({ queryKey: productionKeys.all });
            toast.success("Đã hủy lệnh sản xuất thành công");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || "Hủy đơn thất bại");
        }
    });
}

export function useOrderBom(id: string) {
    const { user } = useAuth();
    const scope = user?._id || null;
    return useQuery({
        queryKey: productionKeys.bom(id, scope),
        queryFn: () => productionApi.getBom(id),
        enabled: !!id && !!scope,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
