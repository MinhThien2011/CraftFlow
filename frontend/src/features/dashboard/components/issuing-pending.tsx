'use client'

import { PackageMinus, Eye, CheckCircle2, Truck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'

interface IssuingItem {
  id: string
  code: string
  customer: string
  orderCode: string
  itemCount: number
  status: 'pending_approval' | 'preparing' | 'ready_to_ship'
}

const pendingIssuing: IssuingItem[] = [
  {
    id: '1',
    code: 'PX-2024-025',
    customer: 'Cửa hàng Gấu Bông 123',
    orderCode: 'ORD-2024-089',
    itemCount: 8,
    status: 'pending_approval'
  },
  {
    id: '2',
    code: 'PX-2024-026',
    customer: 'Shop Đồ Chơi Online',
    orderCode: 'ORD-2024-090',
    itemCount: 15,
    status: 'preparing'
  },
  {
    id: '3',
    code: 'PX-2024-027',
    customer: 'Siêu thị Mini ABC',
    orderCode: 'ORD-2024-091',
    itemCount: 5,
    status: 'ready_to_ship'
  }
]

const getStatusBadge = (status: IssuingItem['status']) => {
  switch (status) {
    case 'pending_approval':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700">Chờ duyệt</Badge>
    case 'preparing':
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Đang lấy hàng</Badge>
    case 'ready_to_ship':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Sẵn sàng giao</Badge>
  }
}

export function IssuingPending() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <PackageMinus className="size-4 text-blue-600" />
            Phiếu xuất kho chờ xử lý
          </CardTitle>
          <Link href="/issuing">
            <Button variant="ghost" size="sm" className="text-xs">
              Xem tất cả
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Mã phiếu</TableHead>
              <TableHead className="text-xs">Khách hàng</TableHead>
              <TableHead className="text-xs text-center">Số SP</TableHead>
              <TableHead className="text-xs">Trạng thái</TableHead>
              <TableHead className="text-xs text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingIssuing.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-sm">{item.code}</TableCell>
                <TableCell className="text-sm max-w-[120px] truncate">{item.customer}</TableCell>
                <TableCell className="text-center text-sm">{item.itemCount}</TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="size-7">
                      <Eye className="size-3.5" />
                    </Button>
                    {item.status === 'pending_approval' && (
                      <Button variant="ghost" size="icon" className="size-7 text-emerald-600 hover:text-emerald-700">
                        <CheckCircle2 className="size-3.5" />
                      </Button>
                    )}
                    {item.status === 'ready_to_ship' && (
                      <Button variant="ghost" size="icon" className="size-7 text-blue-600 hover:text-blue-700">
                        <Truck className="size-3.5" />
                      </Button>
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
