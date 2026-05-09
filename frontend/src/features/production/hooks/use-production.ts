import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productionApi } from "@/api/production.api";
import { toast } from "sonner";

export const productionKeys = {
    all: ['production'] as const,
    orders: (params: any) => [...productionKeys.all, 'orders', { params }] as const,
    order: (id: string) => [...productionKeys.all, 'order', id] as const,
    suggestions: () => [...productionKeys.all, 'suggestions'] as const,
    bom: (id: string) => [...productionKeys.all, 'bom', id] as const,
};

export function useProductionOrders(params: any = {}) {
    return useQuery({
        queryKey: productionKeys.orders(params),
        queryFn: () => productionApi.getOrders(params),
    });
}

export function useProductionOrder(id: string) {
    return useQuery({
        queryKey: productionKeys.order(id),
        queryFn: () => productionApi.getOrderById(id),
        enabled: !!id,
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

export function useStaffSuggestions() {
    return useQuery({
        queryKey: productionKeys.suggestions(),
        queryFn: () => productionApi.getStaffSuggestions(),
    });
}
