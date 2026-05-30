import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi } from "@/api/product.api";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";

export const productKeys = {
    all: queryKeys.products.all,
    lists: () => [...productKeys.all, 'list'] as const,
    list: (params: any) => [...productKeys.lists(), { params }] as const,
    details: () => [...productKeys.all, 'detail'] as const,
    detail: (id: string) => [...productKeys.details(), id] as const,
};

export function useProducts(params: any = {}, options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: productKeys.list(params),
        queryFn: () => productApi.getProducts(params),
        enabled: options.enabled ?? true,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useProduct(id: string) {
    return useQuery({
        queryKey: productKeys.detail(id),
        queryFn: () => productApi.getProductById(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
}

export function useCreateProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (formData: FormData) => productApi.createProduct(formData),
        onSuccess: (response) => {
            if (response.status === 'success') {
                queryClient.invalidateQueries({ queryKey: productKeys.lists() });
                toast.success("Tạo sản phẩm thành công");
            } else {
                toast.error(response.message || "Tạo sản phẩm thất bại");
            }
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || "Đã xảy ra lỗi");
        }
    });
}

export function useUpdateProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, formData }: { id: string, formData: FormData }) =>
            productApi.updateProduct(id, formData),
        onSuccess: (response, variables) => {
            if (response.status === 'success') {
                queryClient.invalidateQueries({ queryKey: productKeys.lists() });
                queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
                toast.success("Cập nhật sản phẩm thành công");
            } else {
                toast.error(response.message || "Cập nhật sản phẩm thất bại");
            }
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || error.message || "Đã xảy ra lỗi");
        }
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
