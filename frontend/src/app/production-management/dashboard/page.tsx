"use client"

import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import {
  Package,
  ClipboardList,
  Factory,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Boxes,
  Sparkles,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import dynamic from "next/dynamic"
import { LazyFeature } from "@/components/guards/permission-guard"
import { useMemo } from "react"
import { useProductionManagerDashboard } from "@/features/dashboard/hooks/use-dashboard"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { cn } from "@/lib/utils"
import Link from "next/link"

// Lazy load heavy chart components
const PerformanceChart = dynamic(() => import("@/features/production/components/performance-chart").then(mod => mod.PerformanceChart), {
  loading: () => <Skeleton className="h-[360px] w-full rounded-[2rem]" />,
  ssr: false
})
const StatusChart = dynamic(() => import("@/features/production/components/status-chart").then(mod => mod.StatusChart), {
  loading: () => <Skeleton className="h-[360px] w-full rounded-[2rem]" />,
  ssr: false
})
const PriorityChart = dynamic(() => import("@/features/production/components/priority-chart").then(mod => mod.PriorityChart), {
  loading: () => <Skeleton className="h-[360px] w-full rounded-[2rem]" />,
  ssr: false
})
const CompletionTrendChart = dynamic(() => import("@/features/production/components/completion-trend-chart").then(mod => mod.CompletionTrendChart), {
  loading: () => <Skeleton className="h-[360px] w-full rounded-[2rem]" />,
  ssr: false
})
const RecentOrders = dynamic(() => import("@/features/production/components/recent-orders").then(mod => mod.RecentOrders), {
  loading: () => <Skeleton className="h-64 w-full rounded-[2rem]" />,
  ssr: false
})

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: dashboardRes, isLoading, isError } = useProductionManagerDashboard(14, 10)
  const overview = dashboardRes?.data?.overview
  const statusCounts = dashboardRes?.data?.statusDistribution || {}
  const priorityCounts = dashboardRes?.data?.priorityDistribution || {}
  const staffWorkload = dashboardRes?.data?.staffWorkload || []
  const completionTrend = dashboardRes?.data?.completionTrend || []
  const recentOrders = dashboardRes?.data?.recentOrders || []

  const statusChartData = useMemo(() => [
    { name: "Đang sản xuất", value: statusCounts["in_production"] || 0, color: "#3b82f6" },
    { name: "Hoàn thành", value: statusCounts["completed"] || 0, color: "#10b981" },
    { name: "Chờ xử lý", value: (statusCounts["pending"] || 0) + (statusCounts["insufficient_materials"] || 0), color: "#f59e0b" },
    { name: "Đã hủy", value: statusCounts["cancelled"] || 0, color: "#ef4444" },
  ], [statusCounts])

  const priorityChartData = useMemo(() => [
    { name: "Cao", value: priorityCounts["high"] || 0, color: "#ef4444" },
    { name: "Trung bình", value: priorityCounts["medium"] || 0, color: "#f59e0b" },
    { name: "Thấp", value: priorityCounts["low"] || 0, color: "#3b82f6" },
    { name: "Khẩn", value: priorityCounts["urgent"] || 0, color: "#8b5cf6" },
  ], [priorityCounts])

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

  const stats = useMemo(() => [
    {
      title: "Sản phẩm khả dụng",
      value: overview?.totalProducts || 0,
      icon: Package,
      href: "/products",
      glowAccent: "bg-blue-500/10",
      iconBg: "bg-gradient-to-br from-blue-100/80 to-blue-200/50 dark:from-blue-900/40 dark:to-blue-900/20 border border-blue-500/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      urgent: false
    },
    {
      title: "Đơn sản xuất",
      value: overview?.totalOrders || 0,
      icon: ClipboardList,
      href: "/production-management/orders",
      glowAccent: "bg-amber-500/10",
      iconBg: "bg-gradient-to-br from-amber-100/80 to-amber-200/50 dark:from-amber-900/40 dark:to-amber-900/20 border border-amber-500/20",
      iconColor: "text-amber-600 dark:text-amber-400",
      urgent: false
    },
    {
      title: "Đang sản xuất",
      value: overview?.inProductionOrders || 0,
      icon: Factory,
      href: "/production-management/orders",
      glowAccent: "bg-emerald-500/10",
      iconBg: "bg-gradient-to-br from-emerald-100/80 to-emerald-200/50 dark:from-emerald-900/40 dark:to-emerald-900/20 border border-emerald-500/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      urgent: false
    },
    {
      title: "Thiếu vật tư",
      value: overview?.pendingMaterialAlerts || 0,
      icon: AlertTriangle,
      href: "/alerts?tab=orders",
      glowAccent: "bg-red-500/10",
      iconBg: "bg-gradient-to-br from-red-100/80 to-red-200/50 dark:from-red-900/40 dark:to-red-900/20 border border-red-500/20",
      iconColor: "text-red-600 dark:text-red-400",
      urgent: (overview?.pendingMaterialAlerts || 0) > 0
    }
  ], [overview])

  if (isError) {
    return (
      <DashboardLayout title="Tổng quan sản xuất">
        <div className="flex flex-col items-center justify-center h-64 text-destructive gap-4">
          <AlertTriangle className="size-12 animate-bounce" />
          <p className="font-semibold text-lg">Đã xảy ra lỗi khi tải dữ liệu tổng quan sản xuất.</p>
          <p className="text-sm text-muted-foreground -mt-2">Vui lòng kiểm tra kết nối server hoặc thử lại.</p>
          <Link href="/production-management/orders">
            <button className="px-4 py-2 border border-border rounded-xl hover:bg-muted font-semibold transition-colors">Về danh sách đơn</button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Tổng quan sản xuất">
      <div className="flex flex-col space-y-6 pb-12">
        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-[2rem] bg-card/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Ambient glows */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-0 left-10 w-64 h-32 bg-amber-500/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-2">
                        Xin chào, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-amber-600 to-yellow-600">{user?.fullName || user?.username || 'Quản lý'}</span> 👋
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
                        Chào mừng bạn trở lại Trung tâm Điều hành Sản xuất. Các chỉ số hiệu suất dây chuyền và vật tư đã được cập nhật thời gian thực.
                    </p>
                </div>
                
                <div className="flex-shrink-0">
                    {!isLoading && (
                        <div className={cn(
                          "inline-flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-300",
                          (overview?.pendingMaterialAlerts || 0) > 0
                            ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                        )}>
                            {(overview?.pendingMaterialAlerts || 0) > 0 ? (
                                <>
                                    <div className="relative flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </div>
                                    <span className="text-sm font-semibold">
                                        Nhà máy có <span className="text-lg font-bold">{overview?.pendingMaterialAlerts}</span> đơn thiếu vật tư
                                    </span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="size-5 text-emerald-500" />
                                    <span className="text-sm font-semibold">
                                        Dây chuyền đang vận hành trơn tru
                                    </span>
                                </>
                            )}
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
            stats.map((stat) => (
              <Link key={stat.title} href={stat.href} className="relative group">
                {/* Glow background behind card */}
                <div className={cn(
                  "absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl -z-10",
                  stat.glowAccent
                )} />
                
                <div className={cn(
                  "relative h-full flex flex-col justify-between overflow-hidden rounded-[2rem] border border-white/40 dark:border-white/10 bg-gradient-to-br from-card/85 to-card/35 backdrop-blur-3xl p-6 sm:p-7 transition-all duration-500 group-hover:-translate-y-1.5 shadow-sm hover:shadow-xl",
                  stat.urgent ? "ring-1 ring-red-500/30 shadow-[0_10px_30px_rgba(239,68,68,0.05)]" : "hover:shadow-black/5"
                )}>
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1.5">
                      <p className="text-sm sm:text-base font-semibold text-muted-foreground whitespace-normal leading-tight">
                        {stat.title}
                      </p>
                      {stat.urgent && (
                        <span className="inline-flex text-[9px] font-extrabold uppercase bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full animate-pulse border border-red-500/20">
                          Khẩn cấp
                        </span>
                      )}
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

        {/* BENTO GRID: CHARTS ROW 1 */}
        <div className="grid gap-6 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-300 fill-mode-both">
          {isLoading ? (
            <Skeleton className="h-[360px] w-full rounded-[2rem]" />
          ) : (
            <LazyFeature>
              <StatusChart data={statusChartData} />
            </LazyFeature>
          )}

          {isLoading ? (
            <Skeleton className="h-[360px] w-full rounded-[2rem]" />
          ) : (
            <LazyFeature>
              <PriorityChart data={priorityChartData} />
            </LazyFeature>
          )}
        </div>

        {/* BENTO GRID: CHARTS ROW 2 */}
        <div className="grid gap-6 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-500 fill-mode-both">
          {isLoading ? (
            <Skeleton className="h-[360px] w-full rounded-[2rem]" />
          ) : (
            <LazyFeature>
              <PerformanceChart data={workloadChartData} />
            </LazyFeature>
          )}

          {isLoading ? (
            <Skeleton className="h-[360px] w-full rounded-[2rem]" />
          ) : (
            <LazyFeature>
              <CompletionTrendChart data={completionTrendData} />
            </LazyFeature>
          )}
        </div>

        {/* Recent Orders */}
        <div className="animate-in fade-in slide-in-from-bottom-16 duration-700 delay-700 fill-mode-both">
          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-[2rem]" />
          ) : (
            <LazyFeature>
              <RecentOrders orders={recentOrders} />
            </LazyFeature>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
