'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { PackageMinus, Search, Eye, Check, FileSignature, Truck, ClipboardList } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { issuingNotes } from '@/lib/warehouse-mock-data'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  picking: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-purple-100 text-purple-700'
}

const statusLabels = {
  pending: 'Chờ xử lý',
  picking: 'Đang lấy hàng',
  completed: 'Hoàn thành',
  partial: 'Xuất một phần'
}

export default function IssuingPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredItems = issuingNotes.filter((note) =>
    note.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AppShell title="Quản lý xuất kho" subtitle="Duyệt và xử lý phiếu xuất kho">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <PackageMinus className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng phiếu xuất</p>
                  <p className="text-2xl font-bold">234</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-100 p-3">
                  <ClipboardList className="size-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chờ duyệt</p>
                  <p className="text-2xl font-bold">5</p>
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
                  <p className="text-sm text-muted-foreground">Đang lấy hàng</p>
                  <p className="text-2xl font-bold">3</p>
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
                  <p className="text-sm text-muted-foreground">Hoàn thành hôm nay</p>
                  <p className="text-2xl font-bold">18</p>
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
                    <TabsTrigger value="pending">Chờ duyệt</TabsTrigger>
                    <TabsTrigger value="picking">Đang lấy hàng</TabsTrigger>
                    <TabsTrigger value="completed">Hoàn thành</TabsTrigger>
                  </TabsList>
                  <div className="relative w-64">
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

              <TabsContent value="all" className="p-6 pt-4">
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã phiếu</TableHead>
                        <TableHead>Khách hàng</TableHead>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead>Người xuất</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Thời gian</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((note) => (
                        <TableRow key={note.id}>
                          <TableCell className="font-medium">{note.code}</TableCell>
                          <TableCell>{note.customerName}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {note.products.map((p, i) => (
                                <p key={i} className="text-sm">
                                  {p.name} × {p.quantity} {p.unit}
                                </p>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{note.issuedBy}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[note.status]}>
                              {statusLabels[note.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(note.issuedAt, 'HH:mm dd/MM', { locale: vi })}
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
                                    <DialogTitle>Chi tiết phiếu xuất {note.code}</DialogTitle>
                                    <DialogDescription>
                                      Thông tin chi tiết phiếu xuất kho
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label className="text-muted-foreground">Khách hàng</Label>
                                        <p className="font-medium">{note.customerName}</p>
                                      </div>
                                      <div>
                                        <Label className="text-muted-foreground">Người xuất</Label>
                                        <p className="font-medium">{note.issuedBy}</p>
                                      </div>
                                      <div>
                                        <Label className="text-muted-foreground">Trạng thái</Label>
                                        <Badge className={statusColors[note.status]}>
                                          {statusLabels[note.status]}
                                        </Badge>
                                      </div>
                                      <div>
                                        <Label className="text-muted-foreground">Thời gian</Label>
                                        <p className="font-medium">
                                          {format(note.issuedAt, 'HH:mm dd/MM/yyyy', { locale: vi })}
                                        </p>
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Pick List</Label>
                                      <div className="mt-2 rounded-lg border divide-y">
                                        {note.products.map((p, i) => (
                                          <div key={i} className="flex items-center gap-3 p-3">
                                            <Checkbox id={`product-${i}`} defaultChecked={note.status === 'completed'} />
                                            <div className="flex-1">
                                              <Label htmlFor={`product-${i}`} className="font-medium cursor-pointer">
                                                {p.name}
                                              </Label>
                                              <p className="text-sm text-muted-foreground">
                                                Số lượng: {p.quantity} {p.unit}
                                              </p>
                                            </div>
                                            {note.status === 'picking' && (
                                              <Badge variant="outline">Vị trí: D1-05</Badge>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  {(note.status === 'pending' || note.status === 'picking') && (
                                    <DialogFooter className="gap-2">
                                      {note.status === 'pending' && (
                                        <Button variant="outline">
                                          <ClipboardList className="mr-2 size-4" />
                                          Tạo Pick List
                                        </Button>
                                      )}
                                      <Button className="bg-emerald-600 hover:bg-emerald-700">
                                        <FileSignature className="mr-2 size-4" />
                                        {note.status === 'pending' ? 'Duyệt xuất kho' : 'Ký xác nhận xuất'}
                                      </Button>
                                    </DialogFooter>
                                  )}
                                </DialogContent>
                              </Dialog>
                              {note.status === 'picking' && (
                                <Button variant="ghost" size="icon" className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                                  <Check className="size-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="pending" className="p-6 pt-4">
                <div className="text-center py-8 text-muted-foreground">
                  Hiển thị các phiếu chờ duyệt
                </div>
              </TabsContent>

              <TabsContent value="picking" className="p-6 pt-4">
                <div className="text-center py-8 text-muted-foreground">
                  Hiển thị các phiếu đang lấy hàng
                </div>
              </TabsContent>

              <TabsContent value="completed" className="p-6 pt-4">
                <div className="text-center py-8 text-muted-foreground">
                  Hiển thị các phiếu đã hoàn thành
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
