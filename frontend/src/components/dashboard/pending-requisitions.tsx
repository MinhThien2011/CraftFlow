'use client'

import { ClipboardList, Eye, Check, X, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { pendingRequisitions } from '@/lib/warehouse-mock-data'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

const priorityColors = {
  high: 'bg-red-100 text-red-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-700'
}

const priorityLabels = {
  high: 'Cao',
  normal: 'Bình thường',
  low: 'Thấp'
}

const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  preparing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  timeout: 'bg-gray-100 text-gray-700'
}

const statusLabels = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  preparing: 'Đang chuẩn bị',
  completed: 'Hoàn thành',
  rejected: 'Từ chối',
  timeout: 'Timeout'
}

export function PendingRequisitions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ClipboardList className="size-4 text-primary" />
            Yêu cầu vật liệu chờ xử lý
            <Badge variant="destructive" className="ml-2">12</Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Link href="/requisitions/timeout">
              <Button variant="outline" size="sm" className="text-xs gap-1 text-amber-600 border-amber-200 hover:bg-amber-50">
                <Clock className="size-3" />
                Timeout (2)
              </Button>
            </Link>
            <Link href="/requisitions/pending">
              <Button variant="outline" size="sm" className="text-xs">
                Xem tất cả
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã yêu cầu</TableHead>
              <TableHead>Nhân viên</TableHead>
              <TableHead>Bộ phận</TableHead>
              <TableHead>Vật liệu</TableHead>
              <TableHead>Ưu tiên</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingRequisitions.map((req) => (
              <TableRow key={req.id}>
                <TableCell className="font-medium">{req.code}</TableCell>
                <TableCell>{req.staffName}</TableCell>
                <TableCell>{req.department}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {req.materials.slice(0, 2).map((m, i) => (
                      <p key={i} className="text-sm">
                        {m.name} × {m.quantity} {m.unit}
                      </p>
                    ))}
                    {req.materials.length > 2 && (
                      <p className="text-xs text-muted-foreground">
                        +{req.materials.length - 2} mục khác
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={priorityColors[req.priority]}>
                    {priorityLabels[req.priority]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={statusColors[req.status]}>
                    {statusLabels[req.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(req.createdAt, 'HH:mm dd/MM', { locale: vi })}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="size-8">
                      <Eye className="size-4" />
                    </Button>
                    {req.status === 'pending' && (
                      <>
                        <Button variant="ghost" size="icon" className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                          <Check className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                          <X className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
