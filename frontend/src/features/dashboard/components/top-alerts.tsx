'use client'

import { AlertTriangle, PackageX, Clock, RotateCcw, Truck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

interface Alert {
  id: string
  type: 'requisition' | 'low_stock' | 'defect' | 'timeout' | 'rma'
  title: string
  description: string
  timestamp: Date
  priority: 'high' | 'medium' | 'low'
}

const alerts: Alert[] = [
  {
    id: '1',
    type: 'requisition',
    title: 'Yêu cầu vật liệu mới',
    description: 'REQ-2024-015 từ Bộ phận Sản xuất - Ưu tiên cao',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    priority: 'high'
  },
  {
    id: '2',
    type: 'low_stock',
    title: 'Cảnh báo tồn kho thấp',
    description: 'Mắt thú nhồi bông 8mm - Còn 15/50 hộp',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    priority: 'high'
  },
  {
    id: '3',
    type: 'defect',
    title: 'Báo cáo hàng lỗi mới',
    description: 'Gấu bông Teddy - 5 sản phẩm lỗi đường may',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    priority: 'medium'
  },
  {
    id: '4',
    type: 'timeout',
    title: 'Requisition sắp timeout',
    description: 'REQ-2024-012 - Còn 30 phút để xử lý',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    priority: 'high'
  },
  {
    id: '5',
    type: 'rma',
    title: 'Hàng trả từ khách',
    description: 'RMA-2024-008 - 3 sản phẩm cần kiểm tra QC',
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    priority: 'medium'
  }
]

const getAlertIcon = (type: Alert['type']) => {
  switch (type) {
    case 'requisition':
      return <Truck className="size-4" />
    case 'low_stock':
      return <PackageX className="size-4" />
    case 'defect':
      return <AlertTriangle className="size-4" />
    case 'timeout':
      return <Clock className="size-4" />
    case 'rma':
      return <RotateCcw className="size-4" />
  }
}

const getAlertColor = (type: Alert['type']) => {
  switch (type) {
    case 'requisition':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'low_stock':
      return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'defect':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'timeout':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'rma':
      return 'bg-purple-50 text-purple-700 border-purple-200'
  }
}

const getPriorityBadge = (priority: Alert['priority']) => {
  switch (priority) {
    case 'high':
      return <Badge variant="destructive" className="text-[10px]">Cao</Badge>
    case 'medium':
      return <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700">TB</Badge>
    case 'low':
      return <Badge variant="secondary" className="text-[10px]">Thấp</Badge>
  }
}

export function TopAlerts() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            Cảnh báo quan trọng (Top 5)
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs">
            Xem tất cả
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${getAlertColor(alert.type)} transition-colors hover:opacity-80 cursor-pointer`}
          >
            <div className="mt-0.5">
              {getAlertIcon(alert.type)}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{alert.title}</span>
                {getPriorityBadge(alert.priority)}
              </div>
              <p className="text-xs opacity-80 truncate">{alert.description}</p>
              <p className="text-[10px] opacity-60">
                {formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: vi })}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
