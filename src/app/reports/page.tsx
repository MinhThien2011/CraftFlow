"use client"

import { useState } from "react"
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  Package,
  DollarSign,
  Factory,
} from "lucide-react"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const revenueData = [
  { month: "T1", revenue: 45000000, cost: 28000000 },
  { month: "T2", revenue: 52000000, cost: 31000000 },
  { month: "T3", revenue: 48000000, cost: 29000000 },
  { month: "T4", revenue: 61000000, cost: 35000000 },
  { month: "T5", revenue: 55000000, cost: 32000000 },
  { month: "T6", revenue: 67000000, cost: 38000000 },
]

const productionTrend = [
  { week: "Tuần 1", produced: 42, target: 40 },
  { week: "Tuần 2", produced: 38, target: 40 },
  { week: "Tuần 3", produced: 45, target: 40 },
  { week: "Tuần 4", produced: 50, target: 40 },
]

const topProducts = [
  { name: "Gấu bông Teddy", quantity: 45, revenue: 18900000 },
  { name: "Túi đeo chéo", quantity: 38, revenue: 13300000 },
  { name: "Móc khóa thú mini", quantity: 120, revenue: 10200000 },
  { name: "Mũ len tai mèo", quantity: 25, revenue: 5500000 },
  { name: "Khăn choàng cổ", quantity: 12, revenue: 6600000 },
]

export default function ReportsPage() {
  const [period, setPeriod] = useState("6months")

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      notation: "compact",
      compactDisplay: "short",
    }).format(value)
  }

  return (
    <AppShell title="Reports" subtitle="Welcome to CRAFTFLOW">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Reports & Analytics
            </h2>
            <p className="text-sm text-muted-foreground">
              View business insights and performance metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">7 ngày qua</SelectItem>
                <SelectItem value="30days">30 ngày qua</SelectItem>
                <SelectItem value="3months">3 tháng qua</SelectItem>
                <SelectItem value="6months">6 tháng qua</SelectItem>
                <SelectItem value="1year">1 năm qua</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E8F5E9]">
                <DollarSign className="h-6 w-6 text-[#4A7C23]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng doanh thu</p>
                <p className="text-2xl font-bold text-[#4A7C23]">328M VND</p>
                <p className="text-xs text-muted-foreground">+15% so với kỳ trước</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FFF3E0]">
                <TrendingUp className="h-6 w-6 text-[#D4A574]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lợi nhuận</p>
                <p className="text-2xl font-bold">135M VND</p>
                <p className="text-xs text-muted-foreground">Margin: 41%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E3F2FD]">
                <Factory className="h-6 w-6 text-[#17A2B8]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sản phẩm SX</p>
                <p className="text-2xl font-bold">240</p>
                <p className="text-xs text-muted-foreground">+8% so với kỳ trước</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F5F0EB]">
                <Package className="h-6 w-6 text-[#8B7355]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đơn hàng</p>
                <p className="text-2xl font-bold">156</p>
                <p className="text-xs text-muted-foreground">+12% so với kỳ trước</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="revenue">Doanh thu & Chi phí</TabsTrigger>
            <TabsTrigger value="production">Sản xuất</TabsTrigger>
            <TabsTrigger value="products">Top sản phẩm</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Doanh thu và Chi phí theo tháng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={revenueData} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD3" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#7A7A7A", fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#7A7A7A", fontSize: 12 }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        new Intl.NumberFormat("vi-VN").format(value) + " VND",
                      ]}
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #E5DDD3",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#4A7C23"
                      radius={[4, 4, 0, 0]}
                      name="Doanh thu"
                    />
                    <Bar
                      dataKey="cost"
                      fill="#D4A574"
                      radius={[4, 4, 0, 0]}
                      name="Chi phí"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="production">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Xu hướng sản xuất theo tuần
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={productionTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD3" />
                    <XAxis
                      dataKey="week"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#7A7A7A", fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#7A7A7A", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #E5DDD3",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="produced"
                      stroke="#4A7C23"
                      strokeWidth={2}
                      dot={{ fill: "#4A7C23" }}
                      name="Sản xuất"
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="#D4A574"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: "#D4A574" }}
                      name="Mục tiêu"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top sản phẩm bán chạy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div
                      key={product.name}
                      className="flex items-center gap-4 rounded-lg bg-muted/50 p-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Đã bán: {product.quantity} sản phẩm
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[#4A7C23]">
                          {new Intl.NumberFormat("vi-VN").format(product.revenue)} VND
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
