import { useQuery } from "@tanstack/react-query";
import { systemApi } from "@/api/system.api";

export const dashboardKeys = {
    all: ['dashboard'] as const,
    stats: (days: number) => [...dashboardKeys.all, 'stats', { days }] as const,
    productionManager: (days: number, staffLimit: number) => [...dashboardKeys.all, 'production-manager', { days, staffLimit }] as const,
};

export function useDashboardStats(days: number = 7) {
    return useQuery({
        queryKey: dashboardKeys.stats(days),
        queryFn: () => systemApi.getDashboardStats(days),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useProductionManagerDashboard(days: number = 14, staffLimit: number = 8) {
    return useQuery({
        queryKey: dashboardKeys.productionManager(days, staffLimit),
        queryFn: () => systemApi.getProductionManagerDashboardStats(days, staffLimit),
        staleTime: 1000 * 60 * 3,
    });
}
