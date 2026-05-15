import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { shelfApi, Shelf } from "@/api/shelf.api";
import { toast } from "sonner";

export const shelfKeys = {
    all: ['shelves'] as const,
    lists: () => [...shelfKeys.all, 'list'] as const,
    list: (params: any) => [...shelfKeys.lists(), { params }] as const,
    details: () => [...shelfKeys.all, 'detail'] as const,
    detail: (id: string) => [...shelfKeys.details(), id] as const,
};

export function useShelves(params: {
    category?: string;
    status?: string;
    warehouseSection?: string;
    availableCapacity?: number;
    search?: string;
} = {}) {
    return useQuery({
        queryKey: shelfKeys.list(params),
        queryFn: async () => {
            const response = await shelfApi.getAll(params);
            return response;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useShelf(id: string) {
    return useQuery({
        queryKey: shelfKeys.detail(id),
        queryFn: () => shelfApi.getById(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
}

export function useCreateShelf() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<Shelf>) => shelfApi.create(data),
        onSuccess: (response) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: shelfKeys.lists() });
                toast.success("Tạo vị trí kho thành công");
            } else {
                toast.error(response.message || "Tạo thất bại");
            }
        },
        onError: (error: any) => {
            toast.error(error.message || "Đã xảy ra lỗi");
        }
    });
}

export function useUpdateShelf() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<Shelf> }) =>
            shelfApi.update(id, data),
        onSuccess: (response, variables) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: shelfKeys.lists() });
                queryClient.invalidateQueries({ queryKey: shelfKeys.detail(variables.id) });
                toast.success("Cập nhật vị trí kho thành công");
            } else {
                toast.error(response.message || "Cập nhật thất bại");
            }
        },
        onError: (error: any) => {
            toast.error(error.message || "Đã xảy ra lỗi");
        }
    });
}

export function useDeleteShelf() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => shelfApi.delete(id),
        onSuccess: (response) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: shelfKeys.lists() });
                toast.success("Xóa vị trí kho thành công");
            } else {
                toast.error(response.message || "Xóa thất bại");
            }
        },
        onError: (error: any) => {
            toast.error(error.message || "Đã xảy ra lỗi");
        }
    });
}

export function useShelfRecommendations(itemId: string, type: 'Material' | 'Product' = 'Material', quantity: number = 0, availableCapacity: number = 0) {
    return useQuery({
        queryKey: [...shelfKeys.all, 'recommendations', itemId, type, quantity, availableCapacity],
        queryFn: () => shelfApi.getRecommendations(itemId, type, quantity),
        enabled: !!itemId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
