import { useQuery } from "@tanstack/react-query";
import { systemApi } from "@/api/system.api";

export const dashboardKeys = {
    all: ['dashboard'] as const,
    stats: (days: number) => [...dashboardKeys.all, 'stats', { days }] as const,
};

export function useDashboardStats(days: number = 7) {
    return useQuery({
        queryKey: dashboardKeys.stats(days),
        queryFn: () => systemApi.getDashboardStats(days),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
