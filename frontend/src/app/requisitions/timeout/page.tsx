'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { Clock, AlertTriangle, User, XCircle, RotateCcw, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { format, formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

interface TimeoutRequisition {
  id: string
  code: string
  staffName: string
  staffId: string
  department: string
  materials: { name: string; quantity: number; unit: string }[]
  createdAt: Date
  timeoutAt: Date
  status: 'timeout' | 'near_timeout'
  timeoutCount: number
}

const timeoutRequisitions: TimeoutRequisition[] = [
  {
    id: '1',
    code: 'REQ-2024-008',
    staffName: 'Nguyễn Văn A',
    staffId: 'NV001',
    department: 'Sản xuất',
    materials: [
      { name: 'Len cotton cao cấp', quantity: 30, unit: 'cuộn' },
      { name: 'Chỉ may trắng', quantity: 10, unit: 'cuộn' }
    ],
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    timeoutAt: new Date(Date.now() - 30 * 60 * 1000),
    status: 'timeout',
    timeoutCount: 2
  },
  {
    id: '2',
    code: 'REQ-2024-012',
    staffName: 'Trần Thị B',
    staffId: 'NV002',
    department: 'Sản xuất',
    materials: [
      { name: 'Bông gòn nhồi', quantity: 15, unit: 'kg' }
    ],
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    timeoutAt: new Date(Date.now() + 25 * 60 * 1000),
    status: 'near_timeout',
    timeoutCount: 0
  }
]

export default function TimeoutRequisitionsPage() {
  const [cancelReason, setCancelReason] = useState('')

  const handleCancelRequisition = (reqId: string) => {
    // Logic: Hủy requisition, giải phóng reserve, gửi alert cho Staff
    console.log('Cancel requisition:', reqId, 'Reason:', cancelReason)
  }

  return (
    <AppShell 
      title="Xử lý Timeout Requisition" 
      subtitle="Quản lý các yêu cầu vật liệu đã/sắp timeout"
    >
      <div className="space-y-6">
        {/* Warning Alert */}
        <Alert variant="destructive" className="border-amber-200 bg-amber-50 text-amber-800">
          <AlertTriangle className="size-4" />
          <AlertTitle>Cảnh báo Timeout</AlertTitle>
          <AlertDescription>
            Có 2 requisition cần xử lý khẩn cấp. Hệ thống sẽ tự động hủy sau khi timeout.
          </AlertDescription>
        </Alert>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-red-100 p-3">
                  <XCircle className="size-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đã Timeout</p>
                  <p className="text-2xl font-bold text-red-600">1</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-100 p-3">
                  <Clock className="size-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sắp Timeout</p>
                  <p className="text-2xl font-bold text-amber-600">1</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3">
                  <RotateCcw className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tái xử lý hôm nay</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeout Requisitions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="size-5 text-red-600" />
              Danh sách Timeout
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã yêu cầu</TableHead>
                    <TableHead>Nhân viên</TableHead>
                    <TableHead>Vật liệu</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Timeout Count</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeoutRequisitions.map((req) => (
                    <TableRow key={req.id} className={req.status === 'timeout' ? 'bg-red-50' : 'bg-amber-50'}>
                      <TableCell className="font-medium">{req.code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="size-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{req.staffName}</p>
                            <p className="text-xs text-muted-foreground">{req.department}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {req.materials.slice(0, 2).map((m, i) => (
                            <p key={i} className="text-sm">
                              • {m.name} × {m.quantity} {m.unit}
                            </p>
                          ))}
                          {req.materials.length > 2 && (
                            <p className="text-xs text-muted-foreground">
                              +{req.materials.length - 2} mặt hàng khác
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {req.status === 'timeout' ? (
                          <Badge variant="destructive">Đã Timeout</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700">
                            Còn {formatDistanceToNow(req.timeoutAt, { locale: vi })}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={req.timeoutCount > 0 ? 'destructive' : 'secondary'}>
                            {req.timeoutCount}
                          </Badge>
                          {req.timeoutCount > 1 && (
                            <AlertTriangle className="size-4 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div>
                          <p>Tạo: {format(req.createdAt, 'HH:mm dd/MM', { locale: vi })}</p>
                          <p className={req.status === 'timeout' ? 'text-red-600' : 'text-amber-600'}>
                            {req.status === 'timeout' ? 'Timeout:' : 'Sẽ timeout:'} {format(req.timeoutAt, 'HH:mm', { locale: vi })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-8">
                            <Eye className="size-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                                <XCircle className="size-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Hủy Requisition {req.code}</DialogTitle>
                                <DialogDescription>
                                  Hành động này sẽ hủy yêu cầu, giải phóng reserve và gửi thông báo cho nhân viên.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <Alert>
                                  <AlertTriangle className="size-4" />
                                  <AlertDescription>
                                    Nhân viên <strong>{req.staffName}</strong> đã có <strong>{req.timeoutCount}</strong> lần timeout. 
                                    {req.timeoutCount >= 2 && ' Cần xem xét nhắc nhở.'}
                                  </AlertDescription>
                                </Alert>
                                <div className="space-y-2">
                                  <Label>Lý do hủy</Label>
                                  <Textarea 
                                    placeholder="Nhập lý do hủy requisition..."
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline">Hủy</Button>
                                <Button 
                                  variant="destructive" 
                                  onClick={() => handleCancelRequisition(req.id)}
                                >
                                  Xác nhận hủy & Gửi thông báo
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
