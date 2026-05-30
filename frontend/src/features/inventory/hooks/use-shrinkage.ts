import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { shrinkageApi } from "@/api/shrinkage.api";
import { toast } from "sonner";

export const shrinkageKeys = {
    all: ['shrinkage'] as const,
    reports: (params: any) => [...shrinkageKeys.all, 'reports', { params }] as const,
};

export function useShrinkageReports(params: any = {}) {
    return useQuery({
        queryKey: shrinkageKeys.reports(params),
        queryFn: () => shrinkageApi.getReports(params),
    });
}

export function useCreateShrinkageReport() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (data: any) => shrinkageApi.createReport(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: shrinkageKeys.all });
            toast.success("Tạo báo cáo hao hụt thành công");
        },
    });
}
