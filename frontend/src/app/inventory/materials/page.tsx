'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { Search, Filter, Download, Plus, Edit2, Trash2, Eye, MapPin } from 'lucide-react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
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
import { inventoryItems } from '@/lib/warehouse-mock-data'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

const statusColors = {
  normal: 'bg-emerald-100 text-emerald-700',
  low: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
  overstock: 'bg-blue-100 text-blue-700'
}

const statusLabels = {
  normal: 'Bình thường',
  low: 'Sắp hết',
  critical: 'Nguy hiểm',
  overstock: 'Tồn dư'
}

export default function InventoryMaterialsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  const categories = [...new Set(inventoryItems.map(item => item.category))]

  return (
    <AppShell title="Tồn kho nguyên vật liệu" subtitle="Quản lý tồn kho realtime">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng mặt hàng</p>
                  <p className="text-2xl font-bold">{inventoryItems.length}</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-3">
                  <MapPin className="size-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bình thường</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {inventoryItems.filter(i => i.status === 'normal').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sắp hết</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {inventoryItems.filter(i => i.status === 'low').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Nguy hiểm</p>
                  <p className="text-2xl font-bold text-red-600">
                    {inventoryItems.filter(i => i.status === 'critical').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-semibold">Danh sách nguyên vật liệu</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="mr-2 size-4" />
                  Xuất Excel
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 size-4" />
                      Thêm mới
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Thêm nguyên vật liệu mới</DialogTitle>
                      <DialogDescription>
                        Nhập thông tin nguyên vật liệu cần thêm vào kho
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="code" className="text-right">Mã NVL</Label>
                        <Input id="code" placeholder="NVL-XXX" className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Tên</Label>
                        <Input id="name" placeholder="Tên nguyên vật liệu" className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">Danh mục</Label>
                        <Select>
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Chọn danh mục" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="minStock" className="text-right">Tồn tối thiểu</Label>
                        <Input id="minStock" type="number" placeholder="0" className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="location" className="text-right">Vị trí kho</Label>
                        <Input id="location" placeholder="A1-01" className="col-span-3" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Thêm vào kho</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 mb-6 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo mã hoặc tên..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Danh mục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả danh mục</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="normal">Bình thường</SelectItem>
                  <SelectItem value="low">Sắp hết</SelectItem>
                  <SelectItem value="critical">Nguy hiểm</SelectItem>
                  <SelectItem value="overstock">Tồn dư</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã NVL</TableHead>
                    <TableHead>Tên nguyên vật liệu</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead className="text-center">Tồn kho</TableHead>
                    <TableHead className="text-center">Tối thiểu</TableHead>
                    <TableHead className="text-center">Tối đa</TableHead>
                    <TableHead>Vị trí</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Cập nhật</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {item.currentStock} {item.unit}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {item.minStock}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {item.maxStock}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground" />
                          {item.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[item.status]}>
                          {statusLabels[item.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(item.lastUpdated, 'HH:mm dd/MM', { locale: vi })}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-8">
                            <Eye className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8">
                            <Edit2 className="size-4" />
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
