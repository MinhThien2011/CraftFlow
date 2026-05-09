"use client"

import dynamic from "next/dynamic"
import { useMemo } from "react"
import {
  Package,
  Factory,
  CheckCircle,
  AlertTriangle,
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardStats } from "@/features/dashboard/hooks/use-dashboard"

// Lazy load charts for performance
const ProductionTrendChart = dynamic(() => import("@/features/dashboard/components/production-trend-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[280px] w-full" />
})

const MaterialConsumptionChart = dynamic(() => import("@/features/dashboard/components/material-consumption-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[280px] w-full" />
})

export default function DashboardPage() {
  const { data: response, isLoading, isError } = useDashboardStats(7);

  const stats = useMemo(() => response?.data?.overview, [response]);
  const charts = useMemo(() => response?.data?.charts, [response]);
  const alerts = useMemo(() => response?.data?.alerts || [], [response]);

  const statCards = useMemo(() => [
    {
      title: "Nguyên liệu trong kho",
      value: stats?.materials?.totalItems || 0,
      change: stats?.materials?.stockPercentage ? Math.round(stats.materials.stockPercentage) : 0,
      changeLabel: "Mức tồn kho",
      icon: Package,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Đang sản xuất",
      value: stats?.orders?.in_production || 0,
      change: stats?.orders?.pending || 0,
      changeLabel: "Đơn chờ",
      icon: Factory,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "Đã hoàn thành",
      value: stats?.orders?.completed || 0,
      change: 0,
      changeLabel: "Tổng cộng",
      icon: CheckCircle,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      title: "Cảnh báo tồn kho",
      value: (stats?.materials?.lowStockItems || 0) + (stats?.products?.lowStockItems || 0),
      change: stats?.products?.lowStockItems || 0,
      changeLabel: "Sản phẩm",
      icon: AlertTriangle,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
    },
  ], [stats]);

  if (isError) {
    return (
      <AppShell title="Tổng quan">
        <div className="flex flex-col items-center justify-center h-64 text-destructive gap-4">
          <AlertTriangle className="size-12" />
          <p>Đã xảy ra lỗi khi tải dữ liệu dashboard. Vui lòng kiểm tra kết nối server.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Thử lại</Button>
        </div>
      </AppShell>
    )
  }

  const productionData = useMemo(() => charts?.productionTrends?.map((item: any) => ({
    name: item._id,
    produced: item.totalProduced,
    count: item.completedCount,
  })) || [], [charts]);

  const consumptionData = useMemo(() => charts?.materialConsumptionTrends?.map((item: any, idx: number) => ({
    name: item.materialName,
    value: item.totalQuantity,
    color: ['#2D5016', '#D4A574', '#8B7355', '#4A7C23', '#DC3545'][idx % 5]
  })) || [], [charts]);

  return (
    <AppShell title="Tổng quan" subtitle="Chào mừng đến với CRAFTFLOW">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)
          ) : (
            statCards.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="mt-1 text-3xl font-bold text-foreground">
                        {stat.value}
                      </p>
                      <div className="mt-2 flex items-center text-xs font-medium text-muted-foreground">
                        <span className="mr-1">{stat.changeLabel}:</span>
                        <span className={cn(
                          "font-bold",
                          stat.title === "Cảnh báo tồn kho" ? "text-red-600" : "text-emerald-600"
                        )}>
                          {stat.change}{stat.title === "Nguyên liệu trong kho" ? "%" : ""}
                        </span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-lg",
                        stat.iconBg
                      )}
                    >
                      <stat.icon className={cn("h-6 w-6", stat.iconColor)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Production Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Sản lượng sản xuất (7 ngày qua)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : (
                <ProductionTrendChart data={productionData} />
              )}
            </CardContent>
          </Card>

          {/* Material Consumption Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Tiêu hao nguyên liệu chính
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : (
                <MaterialConsumptionChart data={consumptionData} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alerts & Activity Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Cảnh báo tồn kho thấp</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : alerts.length > 0 ? (
                <div className="divide-y">
                  {alerts.map((alert: any) => (
                    <div key={alert.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          alert.status === "Nguy cấp" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                        )}>
                          <AlertTriangle className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{alert.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Hiện có: {alert.currentStock} {alert.unit} / Định mức: {alert.minStock} {alert.unit}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-xs font-bold px-2 py-1 rounded-full",
                        alert.status === "Nguy cấp" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {alert.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  Hiện không có cảnh báo tồn kho nào.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Hành động nhanh</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button className="w-full justify-start" variant="outline">
                <Package className="mr-2 size-4" /> Nhập kho nguyên liệu
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Factory className="mr-2 size-4" /> Tạo lệnh sản xuất
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <CheckCircle className="mr-2 size-4" /> Kiểm kê kho
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
