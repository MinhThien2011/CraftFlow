'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { ClipboardList, Search, Eye, Check, X, Clock, User, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
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

export default function PendingRequisitionsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReq, setSelectedReq] = useState<typeof pendingRequisitions[0] | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const filteredItems = pendingRequisitions.filter((req) =>
    req.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.staffName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AppShell title="Yêu cầu vật liệu chờ duyệt" subtitle="Duyệt và xử lý yêu cầu vật liệu từ sản xuất">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-100 p-3">
                  <Clock className="size-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chờ duyệt</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3">
                  <Package className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đang chuẩn bị</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-red-100 p-3">
                  <ClipboardList className="size-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ưu tiên cao</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-gray-100 p-3">
                  <Clock className="size-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sắp timeout</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requisitions Table */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-semibold">Danh sách yêu cầu</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã yêu cầu</TableHead>
                    <TableHead>Nhân viên</TableHead>
                    <TableHead>Bộ phận</TableHead>
                    <TableHead>Vật liệu yêu cầu</TableHead>
                    <TableHead>Ưu tiên</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.filter(r => r.status === 'pending').map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="size-4 text-primary" />
                          </div>
                          <span>{req.staffName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{req.department}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {req.materials.map((m, i) => (
                            <p key={i} className="text-sm">
                              • {m.name} × {m.quantity} {m.unit}
                            </p>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityColors[req.priority]}>
                          {priorityLabels[req.priority]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(req.createdAt, 'HH:mm dd/MM/yyyy', { locale: vi })}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8" onClick={() => setSelectedReq(req)}>
                                <Eye className="size-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                              <DialogHeader>
                                <DialogTitle>Chi tiết yêu cầu {req.code}</DialogTitle>
                                <DialogDescription>
                                  Xem và duyệt yêu cầu vật liệu
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-muted-foreground">Nhân viên</Label>
                                    <p className="font-medium">{req.staffName}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Bộ phận</Label>
                                    <p className="font-medium">{req.department}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Ưu tiên</Label>
                                    <Badge className={priorityColors[req.priority]}>
                                      {priorityLabels[req.priority]}
                                    </Badge>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Thời gian tạo</Label>
                                    <p className="font-medium">
                                      {format(req.createdAt, 'HH:mm dd/MM/yyyy', { locale: vi })}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">Vật liệu yêu cầu</Label>
                                  <div className="mt-2 rounded-lg border p-4 space-y-2">
                                    {req.materials.map((m, i) => (
                                      <div key={i} className="flex justify-between items-center">
                                        <span>{m.name}</span>
                                        <span className="font-medium">{m.quantity} {m.unit}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <DialogFooter className="gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" className="text-red-600">
                                      <X className="mr-2 size-4" />
                                      Từ chối
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Từ chối yêu cầu</DialogTitle>
                                      <DialogDescription>
                                        Vui lòng nhập lý do từ chối
                                      </DialogDescription>
                                    </DialogHeader>
                                    <Textarea
                                      placeholder="Lý do từ chối..."
                                      value={rejectReason}
                                      onChange={(e) => setRejectReason(e.target.value)}
                                    />
                                    <DialogFooter>
                                      <Button variant="destructive">Xác nhận từ chối</Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                                <Button className="bg-emerald-600 hover:bg-emerald-700">
                                  <Check className="mr-2 size-4" />
                                  Duyệt yêu cầu
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="icon" className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                            <Check className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                            <X className="size-4" />
                          </Button>
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
