'use client'

import { AlertTriangle, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { lowStockItems } from '@/lib/warehouse-mock-data'
import Link from 'next/link'

export function LowStockAlerts() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            Cảnh báo tồn kho thấp
          </CardTitle>
          <Link href="/alerts">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              <Settings className="size-3" />
              Cấu hình ngưỡng
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border divide-y">
          {lowStockItems.slice(0, 5).map((item) => {
            const percentage = (item.currentStock / item.minStock) * 100
            const isCritical = percentage <= 50
            
            return (
              <div key={item.id} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-foreground truncate">{item.name}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">{item.category}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress 
                      value={Math.min(percentage, 100)} 
                      className={`h-2 w-24 ${isCritical ? '[&>div]:bg-red-500' : '[&>div]:bg-amber-500'}`} 
                    />
                    <span className="text-xs text-muted-foreground">
                      {item.currentStock}/{item.minStock} {item.unit}
                    </span>
                  </div>
                </div>
                <Button 
                  variant={isCritical ? 'destructive' : 'outline'} 
                  size="sm"
                  className="shrink-0 ml-3"
                >
                  {isCritical ? 'Đặt hàng' : 'Xem'}
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
