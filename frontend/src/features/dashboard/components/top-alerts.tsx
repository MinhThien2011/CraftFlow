'use client'

import { AlertTriangle, PackageX, MoveRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useWarehouseDashboard, AlertItem } from '../api/get-warehouse-dashboard'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

export function TopAlerts() {
  const { data, isLoading, isError } = useWarehouseDashboard()

  if (isLoading) {
    return (
      <Card className="col-span-1 h-[450px] bg-card/80 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Cảnh báo tồn kho</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <Skeleton className="h-2 w-full" />
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
          Không thể tải dữ liệu cảnh báo.
        </CardContent>
      </Card>
    )
  }

  const alerts = data.data.alerts || []

  return (
    <Card className="col-span-1 h-[450px] flex flex-col bg-card/80 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 left-0 w-40 h-40 bg-red-500/5 rounded-br-full -z-10 blur-3xl"></div>

      <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-500" />
            <CardTitle className="text-lg font-bold">Cảnh báo Tồn kho</CardTitle>
          </div>
          {alerts.length > 0 && (
            <Badge variant="destructive" className="animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]">
              {alerts.length} Mục
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-muted">
        <div className="space-y-5">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <PackageX className="size-6 text-emerald-500" />
              </div>
              <p className="text-sm text-muted-foreground">Tất cả hàng hóa đều ở mức an toàn.</p>
            </div>
          ) : (
            alerts.map((item) => {
              const isCritical = item.currentStock === 0
              const percentage = item.minStock > 0 ? (item.currentStock / item.minStock) * 100 : 0
              
              return (
                <div key={item.id} className="group p-3 -mx-3 rounded-xl transition-colors hover:bg-muted/40">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">{item.name}</span>
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{item.type}</span>
                    </div>
                    <Badge 
                      variant={isCritical ? 'destructive' : 'outline'} 
                      className={isCritical ? 'bg-red-500 text-white shadow-sm' : 'border-orange-500/50 text-orange-600 bg-orange-500/10'}
                    >
                      {item.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className={isCritical ? 'text-red-500 font-bold' : 'text-foreground'}>
                        Tồn: {item.currentStock} {item.unit}
                      </span>
                      <span className="text-muted-foreground">
                        Tối thiểu: {item.minStock} {item.unit}
                      </span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className="h-2 bg-muted overflow-hidden" 
                      indicatorClassName={isCritical ? 'bg-red-500' : 'bg-orange-500'}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
        
        {alerts.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border/50 text-center">
            <Link 
              href="/inventory" 
              className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Xem tất cả kho <MoveRight className="ml-1 size-4" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
