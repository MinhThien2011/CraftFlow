'use client'

import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  RotateCcw, 
  AlertTriangle,
  MoveRight,
  PackageCheck
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useWarehouseDashboard, RecentActivityItem } from '../api/get-warehouse-dashboard'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'receive':
    case 'production_in':
      return { icon: ArrowDownToLine, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
    case 'issue':
    case 'sales_out':
    case 'deduct':
      return { icon: ArrowUpFromLine, color: 'text-amber-500', bg: 'bg-amber-500/10' }
    case 'return':
      return { icon: RotateCcw, color: 'text-blue-500', bg: 'bg-blue-500/10' }
    case 'damage_out':
    case 'adjust':
      return { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10' }
    case 'move':
      return { icon: MoveRight, color: 'text-indigo-500', bg: 'bg-indigo-500/10' }
    case 'allocate':
      return { icon: PackageCheck, color: 'text-cyan-500', bg: 'bg-cyan-500/10' }
    default:
      return { icon: ArrowDownToLine, color: 'text-slate-500', bg: 'bg-slate-500/10' }
  }
}

const getTransactionLabel = (type: string) => {
  const labels: Record<string, string> = {
    receive: 'Nhập kho',
    production_in: 'Nhập thành phẩm',
    issue: 'Xuất kho',
    sales_out: 'Xuất bán',
    deduct: 'Trừ tồn kho',
    return: 'Trả hàng',
    damage_out: 'Xuất hủy/Lỗi',
    adjust: 'Điều chỉnh',
    move: 'Chuyển vị trí',
    allocate: 'Cấp phát',
  }
  return labels[type] || type
}

export function RecentActivity() {
  const { data, isLoading, isError } = useWarehouseDashboard()

  if (isLoading) {
    return (
      <Card className="col-span-1 h-[450px] bg-card/80 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Hoạt động gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError || !data?.success) {
    return (
      <Card className="col-span-1 h-[450px]">
        <CardContent className="flex items-center justify-center h-full text-muted-foreground">
          Không thể tải dữ liệu hoạt động.
        </CardContent>
      </Card>
    )
  }

  const activities = data.data.recentActivity || []

  return (
    <Card className="col-span-1 h-[450px] flex flex-col bg-card/80 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 blur-2xl"></div>
      
      <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">Lịch sử giao dịch</CardTitle>
          <Badge variant="outline" className="bg-background/50 font-normal shadow-sm">
            {activities.length} giao dịch mới
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-5 py-4">
          <div className="space-y-6">
            {activities.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Chưa có giao dịch nào gần đây.
              </div>
            ) : (
              activities.map((activity, index) => {
                const { icon: Icon, color, bg } = getTransactionIcon(activity.type)
                
                return (
                  <div key={activity.id} className="relative pl-6">
                    {/* Timeline Line */}
                    {index !== activities.length - 1 && (
                      <div className="absolute left-[11px] top-8 bottom-[-24px] w-px bg-border/60"></div>
                    )}
                    
                    {/* Timeline Node */}
                    <div className="absolute left-[-5px] top-1">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-card z-10 relative", bg)}>
                        <Icon className={cn("size-4", color)} />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex flex-col gap-1 ml-4 group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium leading-none text-foreground group-hover:text-primary transition-colors">
                            {getTransactionLabel(activity.type)} <span className="font-bold">{activity.quantity > 0 ? `+${activity.quantity}` : activity.quantity}</span> {activity.unit}
                          </span>
                          <span className="text-[13px] text-muted-foreground mt-1.5 line-clamp-1">
                            {activity.itemName} ({activity.itemCode})
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap bg-muted/50 px-2 py-0.5 rounded-md">
                          {formatDistanceToNow(new Date(activity.createdAt), {
                            addSuffix: true,
                            locale: vi,
                          })}
                        </span>
                      </div>
                      <div className="text-[12px] text-muted-foreground/80 flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-border"></span>
                        Thực hiện bởi: {activity.user}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
