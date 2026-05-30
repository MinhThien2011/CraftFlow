'use client'

import { Package, Factory, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { dashboardStats } from '@/lib/warehouse-mock-data'

const stats = [
  {
    title: 'Nguyên liệu trong kho',
    value: dashboardStats.materialsInStock,
    change: '+12%',
    trend: 'up' as const,
    icon: Package,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600'
  },
  {
    title: 'Sản phẩm đang sản xuất',
    value: dashboardStats.productsInProduction,
    change: '+5%',
    trend: 'up' as const,
    icon: Factory,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600'
  },
  {
    title: 'Sản phẩm hoàn thành',
    value: dashboardStats.completedProducts,
    change: '+23%',
    trend: 'up' as const,
    icon: CheckCircle2,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600'
  },
  {
    title: 'Cảnh báo tồn kho',
    value: dashboardStats.inventoryAlerts,
    change: '-2%',
    trend: 'down' as const,
    icon: AlertTriangle,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600'
  }
]

export function DashboardStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{stat.value}</span>
                </div>
                <div className="flex items-center gap-1">
                  {stat.trend === 'up' ? (
                    <TrendingUp className="size-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="size-4 text-red-600" />
                  )}
                  <span className={stat.trend === 'up' ? 'text-sm text-emerald-600' : 'text-sm text-red-600'}>
                    {stat.change}
                  </span>
                </div>
              </div>
              <div className={`rounded-xl p-3 ${stat.iconBg}`}>
                <stat.icon className={`size-6 ${stat.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
