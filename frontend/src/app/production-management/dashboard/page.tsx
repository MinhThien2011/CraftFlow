"use client"

import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { StatCard } from "@/features/production/components/stat-card"
import {
  Package,
  ClipboardList,
  AlertTriangle,
} from "lucide-react"
import { useProducts } from "@/features/production/hooks/use-products"
import { useProductionOrders, useStaffSuggestions } from "@/features/production/hooks/use-production"
import { useShrinkageReports } from "@/features/inventory/hooks/use-shrinkage"
import { Skeleton } from "@/components/ui/skeleton"
import dynamic from "next/dynamic"
import { LazyFeature } from "@/components/guards/permission-guard"

// Lazy load heavy chart components
const PerformanceChart = dynamic(() => import("@/features/production/components/performance-chart").then(mod => mod.PerformanceChart), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
  ssr: false
})
const StatusChart = dynamic(() => import("@/features/production/components/status-chart").then(mod => mod.StatusChart), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
  ssr: false
})
const RecentOrders = dynamic(() => import("@/features/production/components/recent-orders").then(mod => mod.RecentOrders), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false
})

export default function DashboardPage() {
  const { data: productsData, isLoading: productsLoading } = useProducts({ limit: 1 })
  const { data: ordersData, isLoading: ordersLoading } = useProductionOrders({ limit: 100 })
  const { data: shrinkageData, isLoading: shrinkageLoading } = useShrinkageReports({ limit: 1 })
  const { data: suggestionsData, isLoading: suggestionsLoading } = useStaffSuggestions()

  // Lấy tổng số lượng từ pagination hoặc độ dài mảng
  const totalProducts = productsData?.data?.pagination?.total ?? (productsData?.data as any)?.products?.length ?? 0
  const totalOrders = ordersData?.data?.pagination?.total ?? (ordersData?.data as any)?.orders?.length ?? (ordersData?.data as any)?.items?.length ?? 0
  const totalShrinkage = (shrinkageData?.data as any)?.length ?? 0

  // Xử lý dữ liệu cho StatusChart
  const orders = (ordersData?.data as any)?.orders ?? (ordersData?.data as any)?.items ?? []
  const statusCounts = orders.reduce((acc: any, order: any) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {})

  const statusChartData = [
    { name: "Đang sản xuất", value: statusCounts["in_production"] || 0, color: "#2B8BE8" },
    { name: "Hoàn thành", value: statusCounts["completed"] || 0, color: "#4A9C6B" },
    { name: "Chờ xử lý", value: statusCounts["pending"] || 0, color: "#F59E0B" },
    { name: "Đã hủy", value: statusCounts["cancelled"] || 0, color: "#E04E4E" },
  ]

  // Xử lý dữ liệu cho PerformanceChart
  const suggestions = suggestionsData?.data?.suggestions || []
  const performanceChartData = suggestions.map((s: any) => ({
    name: s.fullName || s.username,
    workload: s.currentAssignedQuantity || 0
  }))

  return (
    <DashboardLayout title="Tổng quan">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {productsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <StatCard
              title="Sản phẩm khả dụng"
              value={totalProducts}
              icon={Package}
              href="/production-management/products"
            />
          )}

          {ordersLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <StatCard
              title="Đơn sản xuất"
              value={totalOrders}
              icon={ClipboardList}
              href="/production-management/orders"
            />
          )}

          {shrinkageLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <StatCard
              title="Báo cáo hao hụt"
              value={totalShrinkage}
              icon={AlertTriangle}
              href="/production-management/issues"
            />
          )}
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {ordersLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <LazyFeature>
              <StatusChart data={statusChartData} />
            </LazyFeature>
          )}

          {suggestionsLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <LazyFeature>
              <PerformanceChart data={performanceChartData} />
            </LazyFeature>
          )}
        </div>

        {/* Recent Orders */}
        {ordersLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <LazyFeature>
            <RecentOrders orders={orders.slice(0, 5)} />
          </LazyFeature>
        )}
      </div>
    </DashboardLayout>
  )
}


