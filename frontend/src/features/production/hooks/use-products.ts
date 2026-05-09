import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi } from "@/api/product.api";
import { toast } from "sonner";

export const productKeys = {
    all: ['products'] as const,
    lists: () => [...productKeys.all, 'list'] as const,
    list: (params: any) => [...productKeys.lists(), { params }] as const,
    details: () => [...productKeys.all, 'detail'] as const,
    detail: (id: string) => [...productKeys.details(), id] as const,
};

export function useProducts(params: any = {}) {
    return useQuery({
        queryKey: productKeys.list(params),
        queryFn: () => productApi.getProducts(params),
    });
}

export function useProduct(id: string) {
    return useQuery({
        queryKey: productKeys.detail(id),
        queryFn: () => productApi.getProductById(id),
        enabled: !!id,
    });
}

export function useDeleteProduct() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (id: string) => productApi.deleteProduct(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: productKeys.lists() });
            toast.success("Xóa sản phẩm thành công");
        },
    });
}
