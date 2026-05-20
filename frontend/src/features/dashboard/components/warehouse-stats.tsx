'use client'

import { 
  ClipboardList, 
  PackageX, 
  Clock,
  FileCheck
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useWarehouseDashboard } from '../api/get-warehouse-dashboard'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export function WarehouseStats() {
  const { data, isLoading, isError } = useWarehouseDashboard()

  if (isLoading) {
    return (
      <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[160px] w-full rounded-3xl" />
        ))}
      </div>
    )
  }

  if (isError || !data?.success) {
    return <div className="text-sm text-red-500 p-4 bg-red-500/10 rounded-xl">Không thể tải dữ liệu tổng quan kho. Vui lòng thử lại.</div>
  }

  const dashboardStats = data.data.stats

  const stats = [
    {
      title: 'Yêu cầu cấp phát',
      value: dashboardStats.pendingRequisitions,
      icon: ClipboardList,
      iconBg: 'bg-gradient-to-br from-amber-100/80 to-amber-200/50 dark:from-amber-900/40 dark:to-amber-900/20 border border-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      urgent: dashboardStats.pendingRequisitions > 0,
      glowAccent: 'bg-amber-500/20',
      href: '/requisitions/materials'
    },
    {
      title: 'Phiếu Nhập/Xuất chờ duyệt',
      value: dashboardStats.pendingSlips,
      icon: FileCheck,
      iconBg: 'bg-gradient-to-br from-emerald-100/80 to-emerald-200/50 dark:from-emerald-900/40 dark:to-emerald-900/20 border border-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      urgent: dashboardStats.pendingSlips > 0,
      glowAccent: 'bg-emerald-500/20',
      href: '/issuing/pending'
    },
    {
      title: 'Hàng hóa sắp hết',
      value: dashboardStats.lowStockItems,
      icon: PackageX,
      iconBg: 'bg-gradient-to-br from-orange-100/80 to-orange-200/50 dark:from-orange-900/40 dark:to-orange-900/20 border border-orange-500/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      urgent: dashboardStats.lowStockItems > 5,
      glowAccent: 'bg-orange-500/20',
      href: '/alerts'
    },
    {
      title: 'Lịch sử FIFO',
      value: dashboardStats.timeoutRequisitions,
      icon: Clock,
      iconBg: 'bg-gradient-to-br from-rose-100/80 to-rose-200/50 dark:from-rose-900/40 dark:to-rose-900/20 border border-rose-500/20',
      iconColor: 'text-rose-600 dark:text-rose-400',
      urgent: dashboardStats.timeoutRequisitions > 0,
      glowAccent: 'bg-rose-500/20',
      href: '/inventory/fifo-history'
    }
  ]

  return (
    <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Link href={stat.href} key={stat.title} className="relative group block">
          {/* Lớp màu phát sáng (Glow) ở dưới đáy khi Hover */}
          <div className={cn(
            "absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl -z-10",
            stat.glowAccent
          )} />
          
          <div className={cn(
            "relative h-full flex flex-col justify-between overflow-hidden rounded-[2rem] border border-white/40 dark:border-white/10 bg-gradient-to-br from-card/80 to-card/30 backdrop-blur-3xl p-6 sm:p-7 transition-all duration-500 group-hover:-translate-y-1.5",
            stat.urgent && stat.value > 0 ? "shadow-[0_10px_40px_rgba(0,0,0,0.08)] ring-1 ring-primary/20" : "shadow-sm hover:shadow-xl hover:shadow-black/5"
          )}>
            
            {/* Header: Title & Icon */}
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-2">
                <p className="text-sm sm:text-base font-semibold text-muted-foreground whitespace-normal leading-tight">
                  {stat.title}
                </p>
                {stat.urgent && stat.value > 0 && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 uppercase bg-background/50 backdrop-blur-md border-orange-500/30 text-orange-600 shadow-sm animate-pulse">
                    Cần xử lý
                  </Badge>
                )}
              </div>
              <div className={cn("rounded-2xl p-3 sm:p-4 shrink-0 flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-inner", stat.iconBg)}>
                <stat.icon className={cn("size-6 sm:size-7", stat.iconColor)} />
              </div>
            </div>
            
            {/* Footer: Value Number */}
            <div className="mt-6 flex items-end justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl sm:text-6xl font-extrabold tracking-tighter text-foreground drop-shadow-sm transition-all duration-300 group-hover:text-primary">
                  {stat.value}
                </span>
              </div>
            </div>
            
            {/* Watermark Icon (Trang trí chìm) */}
            <stat.icon className="absolute -bottom-6 -right-6 size-32 text-foreground/[0.03] rotate-[-15deg] pointer-events-none transition-transform duration-700 group-hover:rotate-0 group-hover:scale-110" />
            
          </div>
        </Link>
      ))}
    </div>
  )
}

