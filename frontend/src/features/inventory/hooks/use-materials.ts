import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { materialApi } from "@/api/material.api";
import { Material } from "@/lib/types";
import { toast } from "sonner";

export const materialKeys = {
    all: ['materials'] as const,
    lists: () => [...materialKeys.all, 'list'] as const,
    list: (params: any) => [...materialKeys.lists(), { params }] as const,
    details: () => [...materialKeys.all, 'detail'] as const,
    detail: (id: string) => [...materialKeys.details(), id] as const,
};

export function useMaterials(params: {
    limit?: number;
    page?: number;
    search?: string;
    category?: string;
    isActive?: boolean;
} = {}) {
    return useQuery({
        queryKey: materialKeys.list(params),
        queryFn: () => materialApi.getMaterials(params),
    });
}

export function useMaterial(id: string) {
    return useQuery({
        queryKey: materialKeys.detail(id),
        queryFn: () => materialApi.getMaterialById(id),
        enabled: !!id,
    });
}

export function useCreateMaterial() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (data: Partial<Material>) => materialApi.createMaterial(data),
        onSuccess: (response) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: materialKeys.lists() });
                toast.success("Tạo nguyên vật liệu thành công");
            } else {
                toast.error(response.message || "Tạo thất bại");
            }
        },
        onError: (error: any) => {
            toast.error(error.message || "Đã xảy ra lỗi");
        }
    });
}

export function useUpdateMaterial() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<Material> }) => 
            materialApi.updateMaterial(id, data),
        onSuccess: (response, variables) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: materialKeys.lists() });
                queryClient.invalidateQueries({ queryKey: materialKeys.detail(variables.id) });
                toast.success("Cập nhật nguyên vật liệu thành công");
            } else {
                toast.error(response.message || "Cập nhật thất bại");
            }
        },
        onError: (error: any) => {
            toast.error(error.message || "Đã xảy ra lỗi");
        }
    });
}

export function useDeleteMaterial() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (id: string) => materialApi.deleteMaterial(id),
        onSuccess: (response) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: materialKeys.lists() });
                toast.success("Xóa nguyên vật liệu thành công");
            } else {
                toast.error(response.message || "Xóa thất bại");
            }
        },
        onError: (error: any) => {
            toast.error(error.message || "Đã xảy ra lỗi");
        }
    });
}
