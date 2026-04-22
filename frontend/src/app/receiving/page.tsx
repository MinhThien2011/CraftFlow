'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { PackagePlus, Search, Eye, Check, X, QrCode, FileSignature, Truck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { receivingNotes } from '@/lib/warehouse-mock-data'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

const statusColors = {
  pending_qc: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  partial: 'bg-blue-100 text-blue-700'
}

const statusLabels = {
  pending_qc: 'Chờ QC',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  partial: 'Nhập một phần'
}

const materialStatusColors = {
  good: 'bg-emerald-100 text-emerald-700',
  damaged: 'bg-red-100 text-red-700',
  missing: 'bg-amber-100 text-amber-700'
}

const materialStatusLabels = {
  good: 'Tốt',
  damaged: 'Hỏng',
  missing: 'Thiếu'
}

export default function ReceivingPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredItems = receivingNotes.filter((note) =>
    note.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AppShell title="Quản lý nhập kho" subtitle="Tạo và quản lý phiếu nhập kho nguyên vật liệu">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <PackagePlus className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng phiếu nhập</p>
                  <p className="text-2xl font-bold">156</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-100 p-3">
                  <QrCode className="size-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chờ QC</p>
                  <p className="text-2xl font-bold">8</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-emerald-100 p-3">
                  <Check className="size-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đã duyệt hôm nay</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3">
                  <Truck className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">NCC giao hôm nay</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card>
          <CardContent className="p-0">
            <Tabs defaultValue="all" className="w-full">
              <CardHeader className="pb-0">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <TabsList>
                    <TabsTrigger value="all">Tất cả</TabsTrigger>
                    <TabsTrigger value="pending_qc">Chờ QC</TabsTrigger>
                    <TabsTrigger value="approved">Đã duyệt</TabsTrigger>
                    <TabsTrigger value="rejected">Từ chối</TabsTrigger>
                  </TabsList>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Tìm kiếm..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                    <Button>
                      <PackagePlus className="mr-2 size-4" />
                      Tạo phiếu nhập
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <TabsContent value="all" className="p-6 pt-4">
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã phiếu</TableHead>
                        <TableHead>Nhà cung cấp</TableHead>
                        <TableHead>Nguyên vật liệu</TableHead>
                        <TableHead>Người nhận</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Thời gian</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((note) => (
                        <TableRow key={note.id}>
                          <TableCell className="font-medium">{note.code}</TableCell>
                          <TableCell>{note.supplierName}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {note.materials.map((m, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <span>{m.name} × {m.quantity}</span>
                                  <Badge variant="secondary" className={materialStatusColors[m.status]}>
                                    {materialStatusLabels[m.status]}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{note.receivedBy}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[note.status]}>
                              {statusLabels[note.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(note.receivedAt, 'HH:mm dd/MM', { locale: vi })}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8">
                                    <Eye className="size-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[600px]">
                                  <DialogHeader>
                                    <DialogTitle>Chi tiết phiếu nhập {note.code}</DialogTitle>
                                    <DialogDescription>
                                      Thông tin chi tiết phiếu nhập kho
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label className="text-muted-foreground">Nhà cung cấp</Label>
                                        <p className="font-medium">{note.supplierName}</p>
                                      </div>
                                      <div>
                                        <Label className="text-muted-foreground">Người nhận</Label>
                                        <p className="font-medium">{note.receivedBy}</p>
                                      </div>
                                      <div>
                                        <Label className="text-muted-foreground">Trạng thái</Label>
                                        <Badge className={statusColors[note.status]}>
                                          {statusLabels[note.status]}
                                        </Badge>
                                      </div>
                                      <div>
                                        <Label className="text-muted-foreground">Thời gian nhận</Label>
                                        <p className="font-medium">
                                          {format(note.receivedAt, 'HH:mm dd/MM/yyyy', { locale: vi })}
                                        </p>
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Danh sách vật liệu</Label>
                                      <div className="mt-2 rounded-lg border divide-y">
                                        {note.materials.map((m, i) => (
                                          <div key={i} className="flex justify-between items-center p-3">
                                            <div>
                                              <p className="font-medium">{m.name}</p>
                                              <p className="text-sm text-muted-foreground">{m.quantity} {m.unit}</p>
                                            </div>
                                            <Badge className={materialStatusColors[m.status]}>
                                              {materialStatusLabels[m.status]}
                                            </Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  {note.status === 'pending_qc' && (
                                    <DialogFooter className="gap-2">
                                      <Button variant="outline" className="text-red-600">
                                        <X className="mr-2 size-4" />
                                        Từ chối
                                      </Button>
                                      <Button className="bg-emerald-600 hover:bg-emerald-700">
                                        <FileSignature className="mr-2 size-4" />
                                        Ký duyệt nhập kho
                                      </Button>
                                    </DialogFooter>
                                  )}
                                </DialogContent>
                              </Dialog>
                              {note.status === 'pending_qc' && (
                                <>
                                  <Button variant="ghost" size="icon" className="size-8">
                                    <QrCode className="size-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                                    <Check className="size-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="pending_qc" className="p-6 pt-4">
                <div className="text-center py-8 text-muted-foreground">
                  Hiển thị các phiếu chờ kiểm tra chất lượng
                </div>
              </TabsContent>

              <TabsContent value="approved" className="p-6 pt-4">
                <div className="text-center py-8 text-muted-foreground">
                  Hiển thị các phiếu đã duyệt
                </div>
              </TabsContent>

              <TabsContent value="rejected" className="p-6 pt-4">
                <div className="text-center py-8 text-muted-foreground">
                  Hiển thị các phiếu bị từ chối
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
