import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryApi } from "@/api/inventory.api";
import { toast } from "sonner";

export const inventoryKeys = {
    all: ['inventory'] as const,
    overview: () => [...inventoryKeys.all, 'overview'] as const,
    materials: (params: any) => [...inventoryKeys.all, 'materials', { params }] as const,
    products: (params: any) => [...inventoryKeys.all, 'products', { params }] as const,
    history: (params: any) => [...inventoryKeys.all, 'history', { params }] as const,
};

export function useInventoryOverview() {
    return useQuery({
        queryKey: inventoryKeys.overview(),
        queryFn: () => inventoryApi.getOverview(),
    });
}

export function useMaterialsStock(params: any = {}) {
    return useQuery({
        queryKey: inventoryKeys.materials(params),
        queryFn: () => inventoryApi.getMaterialsStock(params),
    });
}

export function useProductsStock(params: any = {}) {
    return useQuery({
        queryKey: inventoryKeys.products(params),
        queryFn: () => inventoryApi.getProductsStock(params),
    });
}

export function useInventoryHistory(params: any = {}) {
    return useQuery({
        queryKey: inventoryKeys.history(params),
        queryFn: () => inventoryApi.getMaterialHistory(params),
    });
}

export function useAdjustStock() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (data: {
            type: 'material' | 'product';
            id: string;
            quantity: number;
            reason: string;
            note?: string;
        }) => inventoryApi.adjustStock(data),
        onSuccess: (response) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
                toast.success("Điều chỉnh tồn kho thành công");
            } else {
                toast.error(response.message || "Điều chỉnh thất bại");
            }
        },
        onError: (error: any) => {
            toast.error(error.message || "Đã xảy ra lỗi");
        }
    });
}
