'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { BarChart3, Download, Calendar, Filter, TrendingUp, TrendingDown, Package, PackagePlus, PackageMinus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line
} from 'recharts'

const reportData = [
  { month: 'T1', nhap: 1200, xuat: 980, ton: 4500 },
  { month: 'T2', nhap: 1500, xuat: 1100, ton: 4900 },
  { month: 'T3', nhap: 1300, xuat: 1250, ton: 4950 },
  { month: 'T4', nhap: 1800, xuat: 1400, ton: 5350 },
  { month: 'T5', nhap: 1600, xuat: 1550, ton: 5400 },
  { month: 'T6', nhap: 2000, xuat: 1700, ton: 5700 }
]

const inventoryDetails = [
  { category: 'Nguyên liệu', opening: 2500, incoming: 1200, outgoing: 980, closing: 2720, value: 45000000 },
  { category: 'Phụ kiện', opening: 1500, incoming: 500, outgoing: 450, closing: 1550, value: 12000000 },
  { category: 'Dụng cụ', opening: 300, incoming: 100, outgoing: 70, closing: 330, value: 5500000 },
  { category: 'Thành phẩm', opening: 800, incoming: 400, outgoing: 350, closing: 850, value: 85000000 }
]

export default function InventoryReportPage() {
  const [period, setPeriod] = useState('month')

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(value)
  }

  return (
    <AppShell title="Báo cáo Nhập - Xuất - Tồn" subtitle="Thống kê chi tiết tình hình kho hàng">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-2">
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Kỳ báo cáo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Theo ngày</SelectItem>
                    <SelectItem value="week">Theo tuần</SelectItem>
                    <SelectItem value="month">Theo tháng</SelectItem>
                    <SelectItem value="quarter">Theo quý</SelectItem>
                    <SelectItem value="year">Theo năm</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="materials">Nguyên liệu</SelectItem>
                    <SelectItem value="accessories">Phụ kiện</SelectItem>
                    <SelectItem value="tools">Dụng cụ</SelectItem>
                    <SelectItem value="products">Thành phẩm</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Calendar className="mr-2 size-4" />
                  Tháng 3/2024
                </Button>
              </div>
              <Button>
                <Download className="mr-2 size-4" />
                Xuất báo cáo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng nhập kho</p>
                  <p className="text-2xl font-bold text-emerald-600">2,000</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="size-3 text-emerald-500" />
                    <span className="text-xs text-emerald-600">+15% so với kỳ trước</span>
                  </div>
                </div>
                <div className="rounded-lg bg-emerald-100 p-3">
                  <PackagePlus className="size-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng xuất kho</p>
                  <p className="text-2xl font-bold text-blue-600">1,700</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="size-3 text-blue-500" />
                    <span className="text-xs text-blue-600">+10% so với kỳ trước</span>
                  </div>
                </div>
                <div className="rounded-lg bg-blue-100 p-3">
                  <PackageMinus className="size-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tồn kho cuối kỳ</p>
                  <p className="text-2xl font-bold text-primary">5,700</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="size-3 text-primary" />
                    <span className="text-xs text-primary">+5.5% so với đầu kỳ</span>
                  </div>
                </div>
                <div className="rounded-lg bg-primary/10 p-3">
                  <Package className="size-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Giá trị tồn kho</p>
                  <p className="text-2xl font-bold">147.5M</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="size-3 text-emerald-500" />
                    <span className="text-xs text-emerald-600">+8% so với kỳ trước</span>
                  </div>
                </div>
                <div className="rounded-lg bg-amber-100 p-3">
                  <BarChart3 className="size-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Biểu đồ Nhập - Xuất kho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e5e5',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="nhap" name="Nhập kho" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="xuat" name="Xuất kho" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Xu hướng tồn kho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reportData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e5e5',
                        borderRadius: '8px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ton"
                      name="Tồn kho"
                      stroke="#b8956a"
                      strokeWidth={2}
                      dot={{ fill: '#b8956a', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detail Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Chi tiết theo danh mục</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Danh mục</TableHead>
                    <TableHead className="text-right">Tồn đầu kỳ</TableHead>
                    <TableHead className="text-right">Nhập trong kỳ</TableHead>
                    <TableHead className="text-right">Xuất trong kỳ</TableHead>
                    <TableHead className="text-right">Tồn cuối kỳ</TableHead>
                    <TableHead className="text-right">Giá trị tồn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryDetails.map((item) => (
                    <TableRow key={item.category}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell className="text-right">{item.opening.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-emerald-600">+{item.incoming.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-blue-600">-{item.outgoing.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">{item.closing.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell>Tổng cộng</TableCell>
                    <TableCell className="text-right">5,100</TableCell>
                    <TableCell className="text-right text-emerald-600">+2,200</TableCell>
                    <TableCell className="text-right text-blue-600">-1,850</TableCell>
                    <TableCell className="text-right">5,450</TableCell>
                    <TableCell className="text-right">{formatCurrency(147500000)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
