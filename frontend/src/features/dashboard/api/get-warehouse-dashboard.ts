import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface WarehouseStatsData {
  pendingRequisitions: number;
  pendingReturns: number;
  lowStockItems: number;
  pendingDefects: number;
  pendingSlips: number;
  timeoutRequisitions: number;
}

export interface RecentActivityItem {
  id: string;
  type: string;
  quantity: number;
  itemName: string;
  itemCode: string;
  unit: string;
  user: string;
  notes?: string;
  createdAt: string;
}

export interface AlertItem {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  type: string;
  status: string;
}

export interface InventoryTrendItem {
  _id: string; // "YYYY-MM-DD"
  input: number;
  output: number;
}

export interface ChartData {
  inventoryTrends: InventoryTrendItem[];
  productionTrends: any[];
  materialConsumptionTrends: any[];
}

export interface WarehouseDashboardResponse {
  success: boolean;
  data: {
    stats: WarehouseStatsData;
    recentActivity: RecentActivityItem[];
    alerts: AlertItem[];
    charts: ChartData;
  };
}

export const getWarehouseDashboardStats = async (): Promise<WarehouseDashboardResponse> => {
  // Axios interceptor đã tự trả về response.data, nên kết quả của api.get chính là payload JSON của BE
  const response = await api.get('/dashboard/warehouse');
  return response as unknown as WarehouseDashboardResponse;
};

export const useWarehouseDashboard = () => {
  return useQuery({
    queryKey: ['warehouse-dashboard'],
    queryFn: getWarehouseDashboardStats,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time feel
  });
};
