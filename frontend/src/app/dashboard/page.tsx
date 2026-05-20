"use client"

import dynamic from "next/dynamic"
import { useMemo } from "react"
import {
  Package,
  Factory,
  CheckCircle,
  AlertTriangle,
  MoveRight,
  TrendingUp,
  Sliders,
  Sparkles,
  Users,
  BarChart3,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardStats } from "@/features/dashboard/hooks/use-dashboard"
import { useAuth } from "@/features/auth/hooks/use-auth"

// Lazy load charts for performance
const ProductionTrendChart = dynamic(() => import("@/features/dashboard/components/production-trend-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[280px] w-full rounded-2xl" />
})

const MaterialConsumptionChart = dynamic(() => import("@/features/dashboard/components/material-consumption-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[280px] w-full rounded-2xl" />
})

export default function DashboardPage() {
  const { user } = useAuth()
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
      iconBg: "bg-gradient-to-br from-blue-100/80 to-blue-200/50 dark:from-blue-900/40 dark:to-blue-900/20 border border-blue-500/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      glowAccent: "bg-blue-500/10",
      isPercent: true,
      href: "/inventory/materials"
    },
    {
      title: "Đang sản xuất",
      value: stats?.orders?.in_production || 0,
      change: stats?.orders?.pending || 0,
      changeLabel: "Đơn chờ",
      icon: Factory,
      iconBg: "bg-gradient-to-br from-emerald-100/80 to-emerald-200/50 dark:from-emerald-900/40 dark:to-emerald-900/20 border border-emerald-500/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      glowAccent: "bg-emerald-500/10",
      isPercent: false,
      href: "/production-management/orders"
    },
    {
      title: "Đã hoàn thành",
      value: stats?.orders?.completed || 0,
      change: 0,
      changeLabel: "Tổng cộng",
      icon: CheckCircle,
      iconBg: "bg-gradient-to-br from-amber-100/80 to-amber-200/50 dark:from-amber-900/40 dark:to-amber-900/20 border border-amber-500/20",
      iconColor: "text-amber-600 dark:text-amber-400",
      glowAccent: "bg-amber-500/10",
      isPercent: false,
      href: "/production-management/purchase-orders"
    },
    {
      title: "Cảnh báo tồn kho",
      value: (stats?.materials?.lowStockItems || 0) + (stats?.products?.lowStockItems || 0),
      change: stats?.products?.lowStockItems || 0,
      changeLabel: "Sản phẩm",
      icon: AlertTriangle,
      iconBg: "bg-gradient-to-br from-red-100/80 to-red-200/50 dark:from-red-900/40 dark:to-red-900/20 border border-red-500/20",
      iconColor: "text-red-600 dark:text-red-400",
      glowAccent: "bg-red-500/10",
      isPercent: false,
      href: "/alerts"
    },
  ], [stats]);

  if (isError) {
    return (
      <AppShell title="Tổng quan">
        <div className="flex flex-col items-center justify-center h-64 text-destructive gap-4">
          <AlertTriangle className="size-12 animate-bounce" />
          <p className="font-semibold text-lg">Đã xảy ra lỗi khi tải dữ liệu dashboard.</p>
          <p className="text-sm text-muted-foreground -mt-2">Vui lòng kiểm tra kết nối server hoặc thử lại.</p>
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
    color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][idx % 5]
  })) || [], [charts]);

  return (
      <AppShell title="Tổng quan" subtitle="Chào mừng đến với CRAFTFLOW">
      <div className="flex flex-col space-y-6 pb-12">
        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-[2rem] bg-card/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Ambient glows */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-0 left-10 w-64 h-32 bg-emerald-500/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-2">
                        Xin chào, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-600 to-teal-600">{user?.fullName || user?.username || 'Quản trị viên'}</span> 👋
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
                        Chào mừng đến với Trung tâm Điều khiển CRAFTFLOW. Hệ thống đã đồng bộ toàn bộ dữ liệu quản trị sản xuất và kho.
                    </p>
                </div>
                
                <div className="flex-shrink-0">
                    {!isLoading && (
                        <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl border bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-500/5 shadow-inner">
                            <CheckCircle2 className="size-5 text-emerald-500 animate-pulse" />
                            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                Mọi dịch vụ đang vận hành ổn định
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* BENTO GRID: STATS ROW */}
        <div className="grid gap-6 grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
          {isLoading ? (
            [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[160px] w-full rounded-[2rem]" />)
          ) : (
            statCards.map((stat) => (
              <Link href={stat.href || "/dashboard"} key={stat.title} className="relative group block">
                {/* Glow background behind card */}
                <div className={cn(
                  "absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl -z-10",
                  stat.glowAccent
                )} />
                
                <div className={cn(
                  "relative h-full flex flex-col justify-between overflow-hidden rounded-[2rem] border border-white/40 dark:border-white/10 bg-gradient-to-br from-card/85 to-card/35 backdrop-blur-3xl p-6 sm:p-7 transition-all duration-500 group-hover:-translate-y-1.5 shadow-sm hover:shadow-xl"
                )}>
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1.5">
                      <p className="text-sm sm:text-base font-semibold text-muted-foreground whitespace-normal leading-tight">
                        {stat.title}
                      </p>
                      <div className="flex items-center text-xs font-semibold text-muted-foreground">
                        <span className="mr-1">{stat.changeLabel}:</span>
                        <span className={cn(
                          "font-bold px-1.5 py-0.5 rounded-md",
                          stat.title === "Cảnh báo tồn kho" 
                            ? "bg-red-500/10 text-red-600 dark:text-red-400" 
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        )}>
                          {stat.change}{stat.isPercent ? "%" : ""}
                        </span>
                      </div>
                    </div>
                    <div className={cn("rounded-2xl p-3 sm:p-4 shrink-0 flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-inner", stat.iconBg)}>
                      <stat.icon className={cn("size-5 sm:size-6", stat.iconColor)} />
                    </div>
                  </div>
                  
                  {/* Card Value */}
                  <div className="mt-6 flex items-end justify-between z-10">
                    <span className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-foreground drop-shadow-sm transition-all duration-300 group-hover:text-primary">
                      {stat.value}
                    </span>
                  </div>
                  
                  {/* Subtle watermark background icon */}
                  <stat.icon className="absolute -bottom-6 -right-6 size-28 text-foreground/[0.02] rotate-[-15deg] pointer-events-none transition-transform duration-700 group-hover:rotate-0 group-hover:scale-110" />
                  
                </div>
              </Link>
            ))
          )}
        </div>

        {/* BENTO GRID: CHARTS ROW */}
        <div className="grid gap-6 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-300 fill-mode-both">
          {/* Production Chart */}
          <div className="relative overflow-hidden rounded-[2rem] border border-white/40 dark:border-white/10 bg-gradient-to-br from-card/85 to-card/35 backdrop-blur-3xl p-6 sm:p-8 shadow-sm transition-all hover:shadow-lg">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10"></div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl shadow-inner border border-emerald-500/20">
                <Factory className="size-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Sản lượng sản xuất (7 ngày qua)</h2>
                <p className="text-sm text-muted-foreground">Tổng số lượng thành phẩm hoàn thành</p>
              </div>
            </div>
            
            <div className="h-[280px] w-full">
              {isLoading ? (
                <Skeleton className="h-full w-full rounded-2xl" />
              ) : (
                <ProductionTrendChart data={productionData} />
              )}
            </div>
          </div>

          {/* Material Consumption Pie Chart */}
          <div className="relative overflow-hidden rounded-[2rem] border border-white/40 dark:border-white/10 bg-gradient-to-br from-card/85 to-card/35 backdrop-blur-3xl p-6 sm:p-8 shadow-sm transition-all hover:shadow-lg">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10"></div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl shadow-inner border border-blue-500/20">
                <Package className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Tiêu hao nguyên liệu chính</h2>
                <p className="text-sm text-muted-foreground">Vật tư tiêu thụ chính trong sản xuất</p>
              </div>
            </div>
            
            <div className="h-[280px] w-full">
              {isLoading ? (
                <Skeleton className="h-full w-full rounded-2xl" />
              ) : (
                <MaterialConsumptionChart data={consumptionData} />
              )}
            </div>
          </div>
        </div>

        {/* BENTO GRID: ALERTS & ACTIONS */}
        <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-16 duration-700 delay-500 fill-mode-both">
          {/* Inventory Alerts Card */}
          <div className="lg:col-span-2 relative overflow-hidden rounded-[2rem] border border-white/40 dark:border-white/10 bg-gradient-to-br from-card/85 to-card/35 backdrop-blur-3xl p-6 sm:p-8 shadow-sm transition-all hover:shadow-lg flex flex-col h-[400px]">
            <div className="absolute top-0 left-0 w-40 h-40 bg-red-500/5 rounded-br-full -z-10 blur-3xl"></div>
            
            <div className="flex items-center justify-between pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">Cảnh báo tồn kho thấp</h2>
                  <p className="text-xs text-muted-foreground">Các mặt hàng đang ở dưới định mức an toàn</p>
                </div>
              </div>
              {alerts.length > 0 && (
                <span className="text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-full animate-pulse shadow-sm">
                  {alerts.length} Cảnh báo
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto mt-4 pr-1 scrollbar-thin scrollbar-thumb-muted">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                </div>
              ) : alerts.length > 0 ? (
                <div className="divide-y divide-border/30">
                  {alerts.map((alert: any) => (
                    <div key={alert.id} className="group flex items-center justify-between py-3.5 transition-colors hover:bg-muted/30 -mx-4 px-4 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-full shadow-inner",
                          alert.status === "Nguy cáº¥p" ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" : "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                        )}>
                          <AlertTriangle className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{alert.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Hiện có: <span className="font-bold text-foreground">{alert.currentStock} {alert.unit}</span> / Định mức: {alert.minStock} {alert.unit}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[10px] sm:text-xs font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider",
                        alert.status === "Nguy cáº¥p" ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}>
                        {alert.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle className="size-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Tất cả hàng hóa và vật tư đều an toàn.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="relative overflow-hidden rounded-[2rem] border border-white/40 dark:border-white/10 bg-gradient-to-br from-card/85 to-card/35 backdrop-blur-3xl p-6 sm:p-8 shadow-sm transition-all hover:shadow-lg flex flex-col h-[400px]">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-bl-full -z-10 blur-3xl"></div>
            
            <div className="pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Sliders className="size-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">Hành động nhanh</h2>
                  <p className="text-xs text-muted-foreground">Truy cập nhanh các nghiệp vụ quản trị</p>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-3 mt-6">
              <Link href="/products" className="w-full">
                <Button className="w-full justify-between h-13 rounded-2xl border border-white/20 dark:border-white/10 bg-card/60 backdrop-blur-sm text-foreground hover:bg-primary hover:text-primary-foreground group transition-all duration-300 px-5 shadow-sm" variant="outline">
                  <span className="flex items-center font-semibold text-sm">
                    <Package className="mr-3 size-5 text-muted-foreground group-hover:text-primary-foreground transition-colors" /> Quản lý sản phẩm & BOM
                  </span>
                  <MoveRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </Button>
              </Link>

              <Link href="/production" className="w-full">
                <Button className="w-full justify-between h-13 rounded-2xl border border-white/20 dark:border-white/10 bg-card/60 backdrop-blur-sm text-foreground hover:bg-primary hover:text-primary-foreground group transition-all duration-300 px-5 shadow-sm" variant="outline">
                  <span className="flex items-center font-semibold text-sm">
                    <Factory className="mr-3 size-5 text-muted-foreground group-hover:text-primary-foreground transition-colors" /> Tạo & Điều hành sản xuất
                  </span>
                  <MoveRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </Button>
              </Link>

              <Link href="/users" className="w-full">
                <Button className="w-full justify-between h-13 rounded-2xl border border-white/20 dark:border-white/10 bg-card/60 backdrop-blur-sm text-foreground hover:bg-primary hover:text-primary-foreground group transition-all duration-300 px-5 shadow-sm" variant="outline">
                  <span className="flex items-center font-semibold text-sm">
                    <Users className="mr-3 size-5 text-muted-foreground group-hover:text-primary-foreground transition-colors" /> Cấu hình tài khoản & Vai trò
                  </span>
                  <MoveRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </Button>
              </Link>

              <Link href="/reports" className="w-full">
                <Button className="w-full justify-between h-13 rounded-2xl border border-white/20 dark:border-white/10 bg-card/60 backdrop-blur-sm text-foreground hover:bg-primary hover:text-primary-foreground group transition-all duration-300 px-5 shadow-sm" variant="outline">
                  <span className="flex items-center font-semibold text-sm">
                    <BarChart3 className="mr-3 size-5 text-muted-foreground group-hover:text-primary-foreground transition-colors" /> Xem Báo cáo tổng hợp
                  </span>
                  <MoveRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

