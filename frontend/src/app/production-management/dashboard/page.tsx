"use client"

import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { StatCard } from "@/features/production/components/stat-card"
import {
  Package,
  ClipboardList,
  Factory,
  AlertTriangle,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import dynamic from "next/dynamic"
import { LazyFeature } from "@/components/guards/permission-guard"
import { useMemo } from "react"
import { useProductionManagerDashboard } from "@/features/dashboard/hooks/use-dashboard"

// Lazy load heavy chart components
const PerformanceChart = dynamic(() => import("@/features/production/components/performance-chart").then(mod => mod.PerformanceChart), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
  ssr: false
})
const StatusChart = dynamic(() => import("@/features/production/components/status-chart").then(mod => mod.StatusChart), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
  ssr: false
})
const PriorityChart = dynamic(() => import("@/features/production/components/priority-chart").then(mod => mod.PriorityChart), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
  ssr: false
})
const CompletionTrendChart = dynamic(() => import("@/features/production/components/completion-trend-chart").then(mod => mod.CompletionTrendChart), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
  ssr: false
})
const RecentOrders = dynamic(() => import("@/features/production/components/recent-orders").then(mod => mod.RecentOrders), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false
})

export default function DashboardPage() {
  const { data: dashboardRes, isLoading, isError } = useProductionManagerDashboard(14, 10)
  const overview = dashboardRes?.data?.overview
  const statusCounts = dashboardRes?.data?.statusDistribution || {}
  const priorityCounts = dashboardRes?.data?.priorityDistribution || {}
  const staffWorkload = dashboardRes?.data?.staffWorkload || []
  const completionTrend = dashboardRes?.data?.completionTrend || []
  const recentOrders = dashboardRes?.data?.recentOrders || []

  const statusChartData = [
    { name: "Đang sản xuất", value: statusCounts["in_production"] || 0, color: "#2B8BE8" },
    { name: "Hoàn thành", value: statusCounts["completed"] || 0, color: "#4A9C6B" },
    { name: "Chờ xử lý", value: (statusCounts["pending"] || 0) + (statusCounts["insufficient_materials"] || 0), color: "#F59E0B" },
    { name: "Đã hủy", value: statusCounts["cancelled"] || 0, color: "#E04E4E" },
  ]

  const priorityChartData = [
    { name: "Cao", value: priorityCounts["high"] || 0, color: "#DC2626" },
    { name: "Trung bình", value: priorityCounts["medium"] || 0, color: "#F59E0B" },
    { name: "Thấp", value: priorityCounts["low"] || 0, color: "#2563EB" },
    { name: "Khẩn", value: priorityCounts["urgent"] || 0, color: "#7C3AED" },
  ]

  const workloadChartData = useMemo(() => {
    return staffWorkload.map((s: any) => ({
      name: s.fullName || s.username || "Nhân viên",
      completed: s.completedQuantity || 0,
      remaining: s.remainingQuantity || 0,
      assignments: s.activeAssignments || 0
    }))
  }, [staffWorkload])

  const completionTrendData = useMemo(() => {
    return completionTrend.map((row: any) => ({
      date: row._id,
      completedOrders: row.completedOrders || 0,
      totalProduced: row.totalProduced || 0
    }))
  }, [completionTrend])

  if (isError) {
    return (
      <DashboardLayout title="Tổng quan sản xuất">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Không tải được dữ liệu tổng quan sản xuất. Vui lòng thử lại.
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Tổng quan sản xuất">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <StatCard
              title="Sản phẩm khả dụng"
              value={overview?.totalProducts || 0}
              icon={Package}
              href="/production-management/products"
            />
          )}

          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <StatCard
              title="Đơn sản xuất"
              value={overview?.totalOrders || 0}
              icon={ClipboardList}
              href="/production-management/orders"
            />
          )}

          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <StatCard
              title="Đang sản xuất"
              value={overview?.inProductionOrders || 0}
              icon={Factory}
              href="/production-management/orders"
            />
          )}

          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <StatCard
              title="Thiếu vật tư"
              value={overview?.pendingMaterialAlerts || 0}
              icon={AlertTriangle}
              href="/alerts?tab=orders"
            />
          )}
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <LazyFeature>
              <StatusChart data={statusChartData} />
            </LazyFeature>
          )}

          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <LazyFeature>
              <PriorityChart data={priorityChartData} />
            </LazyFeature>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <LazyFeature>
              <PerformanceChart data={workloadChartData} />
            </LazyFeature>
          )}

          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <LazyFeature>
              <CompletionTrendChart data={completionTrendData} />
            </LazyFeature>
          )}
        </div>

        {/* Recent Orders */}
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <LazyFeature>
            <RecentOrders orders={recentOrders} />
          </LazyFeature>
        )}
      </div>
    </DashboardLayout>
  )
}


