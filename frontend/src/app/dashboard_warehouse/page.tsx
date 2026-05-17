'use client'

import { AppShell } from '@/components/app-shell'
import { WarehouseStats } from '@/features/dashboard/components/warehouse-stats'
import { WarehouseCharts } from '@/features/dashboard/components/warehouse-charts'
import { TopAlerts } from '@/features/dashboard/components/top-alerts'
import { RecentActivity } from '@/features/dashboard/components/recent-activity'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useWarehouseDashboard } from '@/features/dashboard/api/get-warehouse-dashboard'
import { CheckCircle2 } from 'lucide-react'

export default function WarehouseDashboardPage() {
  const { user } = useAuth()
  const { data, isLoading } = useWarehouseDashboard()
  
  const stats = data?.data?.stats
  const totalUrgentTasks = stats 
    ? (stats.pendingRequisitions + stats.pendingSlips)
    : 0

  return (
    <AppShell
      title="Tổng quan Kho"
      subtitle="Dashboard Quản lý Kho - Warehouse Manager"
    >
      <div className="flex flex-col space-y-6 pb-12">
        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-[2rem] bg-card/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Background elements for Hero */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-0 left-10 w-64 h-32 bg-amber-500/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-2">
                        Xin chào, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-amber-600 to-yellow-600">{user?.fullName || user?.username || 'Quản lý'}</span> 👋
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
                        Chào mừng bạn trở lại Trung tâm điều khiển. Hệ thống đã tự động rà soát toàn bộ kho và cập nhật số liệu mới nhất.
                    </p>
                </div>
                
                <div className="flex-shrink-0">
                    {!isLoading && (
                        <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl border ${totalUrgentTasks > 0 ? 'bg-orange-500/10 border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.15)]' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                            {totalUrgentTasks > 0 ? (
                                <>
                                    <div className="relative flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                                    </div>
                                    <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                                        Bạn có <span className="text-lg font-bold">{totalUrgentTasks}</span> tác vụ đang chờ xử lý
                                    </span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="size-5 text-emerald-500" />
                                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                        Mọi thứ đang vận hành trơn tru
                                    </span>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* BENTO GRID: METRICS ROW */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
          <WarehouseStats />
        </div>

        {/* BENTO GRID: CHARTS ROW */}
        <div className="animate-in fade-in slide-in-from-bottom-12 duration-700 delay-300 fill-mode-both">
          <WarehouseCharts />
        </div>

        {/* BENTO GRID: DETAILS ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-16 duration-700 delay-500 fill-mode-both">
          {/* Top Alerts (Left column - takes 5/12 on large screens) */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
            <TopAlerts />
          </div>
          
          {/* Recent Activity (Right column - takes 7/12 on large screens) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
            <RecentActivity />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
