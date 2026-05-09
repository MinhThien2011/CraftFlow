'use client'

import { Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { activityLogs } from '@/lib/warehouse-mock-data'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import Link from 'next/link'

const typeColors = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
  error: 'bg-red-500'
}

export function RecentActivity() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="size-4 text-blue-500" />
            Hoạt động gần đây
          </CardTitle>
          <Link href="/reports/activity">
            <Button variant="ghost" size="sm" className="text-xs">
              Xem tất cả
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activityLogs.slice(0, 5).map((log) => (
          <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <div className={cn('size-2 rounded-full mt-2 shrink-0', typeColors[log.type])} />
            <div className="flex-1 space-y-0.5 min-w-0">
              <p className="font-medium text-sm text-foreground">{log.action}</p>
              <p className="text-xs text-muted-foreground truncate">{log.description}</p>
              <p className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(log.timestamp, { addSuffix: true, locale: vi })}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
