'use client'

import { PackagePlus, Eye, CheckCircle2, XCircle } from 'lucide-react'
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
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import Link from 'next/link'

interface ReceivingItem {
  id: string
  code: string
  supplier: string
  itemCount: number
  createdBy: string
  createdAt: Date
  status: 'pending_qc' | 'waiting_approval'
}

const pendingReceiving: ReceivingItem[] = [
  {
    id: '1',
    code: 'PN-2024-015',
    supplier: 'Công ty Len Việt',
    itemCount: 5,
    createdBy: 'Nguyễn Văn Staff',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'pending_qc'
  },
  {
    id: '2',
    code: 'PN-2024-016',
    supplier: 'NCC Phụ kiện ABC',
    itemCount: 3,
    createdBy: 'Trần Thị Staff',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    status: 'waiting_approval'
  },
  {
    id: '3',
    code: 'PN-2024-017',
    supplier: 'Công ty Bông gòn XYZ',
    itemCount: 2,
    createdBy: 'Lê Văn Staff',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    status: 'pending_qc'
  }
]

const getStatusBadge = (status: ReceivingItem['status']) => {
  switch (status) {
    case 'pending_qc':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700">Chờ QC</Badge>
    case 'waiting_approval':
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Chờ duyệt</Badge>
  }
}

export function ReceivingPending() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <PackagePlus className="size-4 text-emerald-600" />
            Phiếu nhập kho chờ xử lý
          </CardTitle>
          <Link href="/receiving">
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
              <TableHead className="text-xs">Nhà cung cấp</TableHead>
              <TableHead className="text-xs text-center">Số mặt hàng</TableHead>
              <TableHead className="text-xs">Trạng thái</TableHead>
              <TableHead className="text-xs text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingReceiving.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-sm">{item.code}</TableCell>
                <TableCell className="text-sm">{item.supplier}</TableCell>
                <TableCell className="text-center text-sm">{item.itemCount}</TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="size-7">
                      <Eye className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7 text-emerald-600 hover:text-emerald-700">
                      <CheckCircle2 className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7 text-red-600 hover:text-red-700">
                      <XCircle className="size-3.5" />
                    </Button>
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
