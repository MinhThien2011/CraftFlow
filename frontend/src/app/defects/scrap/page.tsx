'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { Trash2, Search, Plus, Eye, CheckCircle2, Scale, DollarSign, FileSignature } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface ScrapItem {
  id: string
  code: string
  items: { name: string; quantity: number; unit: string; weight: number }[]
  totalWeight: number
  estimatedValue: number
  createdBy: string
  createdAt: Date
  status: 'pending' | 'approved' | 'sold' | 'disposed'
  requireAdminApproval: boolean
}

const scrapItems: ScrapItem[] = [
  {
    id: '1',
    code: 'SCRAP-2024-015',
    items: [
      { name: 'Len phế phẩm', quantity: 50, unit: 'cuộn', weight: 25 },
      { name: 'Vải vụn', quantity: 100, unit: 'mảnh', weight: 15 }
    ],
    totalWeight: 40,
    estimatedValue: 2500000,
    createdBy: 'Nguyễn Văn Kho',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: 'pending',
    requireAdminApproval: true
  },
  {
    id: '2',
    code: 'SCRAP-2024-014',
    items: [
      { name: 'Bông gòn hư', quantity: 20, unit: 'kg', weight: 20 }
    ],
    totalWeight: 20,
    estimatedValue: 500000,
    createdBy: 'Trần Thị Staff',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    status: 'pending',
    requireAdminApproval: false
  },
  {
    id: '3',
    code: 'SCRAP-2024-013',
    items: [
      { name: 'Sản phẩm lỗi không sửa được', quantity: 15, unit: 'cái', weight: 8 }
    ],
    totalWeight: 8,
    estimatedValue: 0,
    createdBy: 'Lê Văn Staff',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    status: 'approved'
  }
]

const statusConfig = {
  pending: { label: 'Chờ duyệt', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Đã duyệt', color: 'bg-blue-100 text-blue-700' },
  sold: { label: 'Đã bán', color: 'bg-emerald-100 text-emerald-700' },
  disposed: { label: 'Đã hủy', color: 'bg-gray-100 text-gray-700' }
}

export default function ScrapPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const filteredItems = scrapItems.filter((item) =>
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
  }

  return (
    <AppShell 
      title="Xử lý Phế liệu" 
      subtitle="Quản lý và xử lý phế liệu từ sản xuất"
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-100 p-3">
                  <Trash2 className="size-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chờ duyệt</p>
                  <p className="text-2xl font-bold">4</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3">
                  <Scale className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng KL chờ xử lý</p>
                  <p className="text-2xl font-bold">68 kg</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-emerald-100 p-3">
                  <DollarSign className="size-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Giá trị thu hồi (tháng)</p>
                  <p className="text-2xl font-bold">8.5M</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-red-100 p-3">
                  <FileSignature className="size-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cần Admin duyệt</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scrap Table */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-semibold">Danh sách phiếu phế liệu</CardTitle>
              <div className="flex gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="size-4 mr-2" />
                      Tạo phiếu
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Tạo Phiếu xử lý phế liệu</DialogTitle>
                      <DialogDescription>
                        Nhập thông tin phế liệu cần xử lý
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Loại phế liệu</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn loại" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fabric">Vải vụn</SelectItem>
                              <SelectItem value="yarn">Len phế phẩm</SelectItem>
                              <SelectItem value="cotton">Bông gòn hư</SelectItem>
                              <SelectItem value="product">Sản phẩm lỗi</SelectItem>
                              <SelectItem value="other">Khác</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Số lượng</Label>
                          <Input type="number" placeholder="0" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Đơn vị</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn đơn vị" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kg">Kilogram (kg)</SelectItem>
                              <SelectItem value="pcs">Cái</SelectItem>
                              <SelectItem value="roll">Cuộn</SelectItem>
                              <SelectItem value="piece">Mảnh</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Trọng lượng (kg)</Label>
                          <Input type="number" placeholder="0.00" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Giá trị thu hồi dự kiến (VND)</Label>
                        <Input type="number" placeholder="0" />
                        <p className="text-xs text-muted-foreground">
                          Phế liệu có giá trị &gt; 2,000,000 VND cần Admin phê duyệt
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Ghi chú</Label>
                        <Textarea placeholder="Mô tả chi tiết phế liệu..." />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                        Hủy
                      </Button>
                      <Button>Tạo phiếu</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã phiếu</TableHead>
                    <TableHead>Phế liệu</TableHead>
                    <TableHead className="text-right">Trọng lượng</TableHead>
                    <TableHead className="text-right">Giá trị thu hồi</TableHead>
                    <TableHead>Người tạo</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.code}
                          {item.requireAdminApproval && (
                            <Badge variant="destructive" className="text-[10px]">Admin</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {item.items.map((i, idx) => (
                            <p key={idx} className="text-sm">
                              • {i.name} × {i.quantity} {i.unit}
                            </p>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{item.totalWeight} kg</TableCell>
                      <TableCell className="text-right">
                        {item.estimatedValue > 0 ? (
                          <span className="text-emerald-600 font-medium">
                            {formatCurrency(item.estimatedValue)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Không thu hồi</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div>
                          <p>{item.createdBy}</p>
                          <p className="text-xs">{format(item.createdAt, 'dd/MM/yyyy', { locale: vi })}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[item.status].color}>
                          {statusConfig[item.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-8">
                            <Eye className="size-4" />
                          </Button>
                          {item.status === 'pending' && !item.requireAdminApproval && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                                  <CheckCircle2 className="size-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Phê duyệt phiếu phế liệu</DialogTitle>
                                  <DialogDescription>
                                    Xác nhận phê duyệt phiếu {item.code}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Tổng trọng lượng</span>
                                      <span className="font-medium">{item.totalWeight} kg</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Giá trị thu hồi</span>
                                      <span className="font-medium text-emerald-600">
                                        {formatCurrency(item.estimatedValue)}
                                      </span>
                                    </div>
                                  </div>
                                  <Separator className="my-4" />
                                  <div className="space-y-2">
                                    <Label>Chữ ký điện tử xác nhận</Label>
                                    <Button variant="outline" className="w-full">
                                      <FileSignature className="size-4 mr-2" />
                                      Ký xác nhận
                                    </Button>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline">Hủy</Button>
                                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                                    Phê duyệt & Trừ kho
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
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
