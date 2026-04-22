'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { AlertCircle, Search, Eye, Check, Wrench, Recycle, Trash2, User } from 'lucide-react'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { defectReports } from '@/lib/warehouse-mock-data'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

const severityColors = {
  light: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  heavy: 'bg-red-100 text-red-700'
}

const severityLabels = {
  light: 'Nhẹ',
  medium: 'Trung bình',
  heavy: 'Nặng'
}

const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  resolved: 'bg-emerald-100 text-emerald-700'
}

const statusLabels = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  resolved: 'Đã xử lý'
}

export default function InternalDefectsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAction, setSelectedAction] = useState('')

  const filteredItems = defectReports.filter((report) =>
    report.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.defectType.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AppShell title="Báo cáo lỗi nội bộ" subtitle="Quản lý và xử lý hàng lỗi trong quy trình sản xuất">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-100 p-3">
                  <AlertCircle className="size-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chờ xử lý</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3">
                  <Wrench className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đang sửa chữa</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-red-100 p-3">
                  <Trash2 className="size-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phế liệu</p>
                  <p className="text-2xl font-bold">2</p>
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
                  <p className="text-sm text-muted-foreground">Đã xử lý tháng này</p>
                  <p className="text-2xl font-bold">28</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Defect Reports Table */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-semibold">Danh sách báo cáo lỗi</CardTitle>
              <div className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Mức độ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="light">Nhẹ</SelectItem>
                    <SelectItem value="medium">Trung bình</SelectItem>
                    <SelectItem value="heavy">Nặng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Loại lỗi</TableHead>
                    <TableHead>Mức độ</TableHead>
                    <TableHead className="text-center">Số lượng</TableHead>
                    <TableHead>Báo cáo bởi</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.productName}</TableCell>
                      <TableCell>{report.defectType}</TableCell>
                      <TableCell>
                        <Badge className={severityColors[report.severity]}>
                          {severityLabels[report.severity]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{report.quantity}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="size-3.5 text-primary" />
                          </div>
                          <span className="text-sm">{report.reportedBy}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[report.status]}>
                          {statusLabels[report.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(report.reportedAt, 'HH:mm dd/MM', { locale: vi })}
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
                                <DialogTitle>Chi tiết báo cáo lỗi</DialogTitle>
                                <DialogDescription>
                                  Xem chi tiết và xử lý hàng lỗi
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-muted-foreground">Sản phẩm</Label>
                                    <p className="font-medium">{report.productName}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Loại lỗi</Label>
                                    <p className="font-medium">{report.defectType}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Mức độ</Label>
                                    <Badge className={severityColors[report.severity]}>
                                      {severityLabels[report.severity]}
                                    </Badge>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Số lượng</Label>
                                    <p className="font-medium">{report.quantity} sản phẩm</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Báo cáo bởi</Label>
                                    <p className="font-medium">{report.reportedBy}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Thời gian</Label>
                                    <p className="font-medium">
                                      {format(report.reportedAt, 'HH:mm dd/MM/yyyy', { locale: vi })}
                                    </p>
                                  </div>
                                </div>

                                {report.status === 'pending' && (
                                  <div className="space-y-3 pt-4 border-t">
                                    <Label>Chọn phương án xử lý</Label>
                                    <RadioGroup value={selectedAction} onValueChange={setSelectedAction}>
                                      <div className="flex items-center space-x-2 p-3 border rounded-lg">
                                        <RadioGroupItem value="repair" id="repair" />
                                        <Label htmlFor="repair" className="flex items-center gap-2 cursor-pointer flex-1">
                                          <Wrench className="size-4 text-blue-600" />
                                          <div>
                                            <p className="font-medium">Sửa chữa</p>
                                            <p className="text-xs text-muted-foreground">Gửi đi sửa chữa và nhập lại kho</p>
                                          </div>
                                        </Label>
                                      </div>
                                      <div className="flex items-center space-x-2 p-3 border rounded-lg">
                                        <RadioGroupItem value="recycle" id="recycle" />
                                        <Label htmlFor="recycle" className="flex items-center gap-2 cursor-pointer flex-1">
                                          <Recycle className="size-4 text-emerald-600" />
                                          <div>
                                            <p className="font-medium">Tái chế</p>
                                            <p className="text-xs text-muted-foreground">Tái sử dụng nguyên liệu</p>
                                          </div>
                                        </Label>
                                      </div>
                                      <div className="flex items-center space-x-2 p-3 border rounded-lg">
                                        <RadioGroupItem value="scrap" id="scrap" />
                                        <Label htmlFor="scrap" className="flex items-center gap-2 cursor-pointer flex-1">
                                          <Trash2 className="size-4 text-red-600" />
                                          <div>
                                            <p className="font-medium">Phế liệu</p>
                                            <p className="text-xs text-muted-foreground">Chuyển thành phế liệu</p>
                                          </div>
                                        </Label>
                                      </div>
                                    </RadioGroup>
                                    
                                    <div className="space-y-2">
                                      <Label>Ghi chú xử lý</Label>
                                      <Textarea placeholder="Nhập ghi chú..." />
                                    </div>
                                  </div>
                                )}
                              </div>
                              {report.status === 'pending' && (
                                <DialogFooter>
                                  <Button disabled={!selectedAction}>
                                    Phê duyệt xử lý
                                  </Button>
                                </DialogFooter>
                              )}
                            </DialogContent>
                          </Dialog>
                          {report.status === 'pending' && (
                            <Button variant="ghost" size="icon" className="size-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                              <Wrench className="size-4" />
                            </Button>
                          )}
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
