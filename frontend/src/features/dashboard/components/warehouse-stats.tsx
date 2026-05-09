'use client'

import { 
  ClipboardList, 
  PackageX, 
  AlertTriangle, 
  Trash2, 
  Clock,
  RotateCcw
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { dashboardStats } from '@/lib/warehouse-mock-data'
import { Badge } from '@/components/ui/badge'

const stats = [
  {
    title: 'Yêu cầu vật liệu chờ duyệt',
    value: dashboardStats.pendingRequisitions,
    icon: ClipboardList,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    urgent: dashboardStats.pendingRequisitions > 10
  },
  {
    title: 'Mặt hàng sắp hết (Low Stock)',
    value: dashboardStats.lowStockItems,
    icon: PackageX,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    urgent: dashboardStats.lowStockItems > 5
  },
  {
    title: 'Hàng lỗi chờ xử lý',
    value: dashboardStats.pendingDefects + dashboardStats.pendingRMA,
    subtitle: `Nội bộ: ${dashboardStats.pendingDefects} | RMA: ${dashboardStats.pendingRMA}`,
    icon: AlertTriangle,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    urgent: true
  },
  {
    title: 'Phế liệu chờ phê duyệt',
    value: dashboardStats.pendingScrap,
    icon: Trash2,
    iconBg: 'bg-stone-100',
    iconColor: 'text-stone-600',
    urgent: false
  },
  {
    title: 'Requisition Timeout',
    value: dashboardStats.timeoutRequisitions,
    icon: Clock,
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    urgent: dashboardStats.timeoutRequisitions > 0
  }
]

export function WarehouseStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => (
        <Card key={stat.title} className={`overflow-hidden transition-all hover:shadow-md ${stat.urgent ? 'ring-1 ring-amber-200' : ''}`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">{stat.title}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                  {stat.urgent && stat.value > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      Cần xử lý
                    </Badge>
                  )}
                </div>
                {stat.subtitle && (
                  <p className="text-[10px] text-muted-foreground">{stat.subtitle}</p>
                )}
              </div>
              <div className={`rounded-xl p-2.5 ${stat.iconBg} shrink-0`}>
                <stat.icon className={`size-5 ${stat.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
