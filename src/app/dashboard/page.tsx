"use client"

import {
  Package,
  Factory,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  dashboardStats,
  monthlyProduction,
  materialConsumption,
  stockAlerts,
  recentActivities,
} from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const statCards = [
  {
    title: "Nguyên liệu trong kho",
    value: dashboardStats.totalMaterials,
    change: dashboardStats.materialsChange,
    changePrefix: "+",
    icon: Package,
    iconBg: "bg-[#F5F0EB]",
    iconColor: "text-[#8B7355]",
  },
  {
    title: "Sản phẩm đang sản xuất",
    value: dashboardStats.inProduction,
    change: dashboardStats.productionChange,
    changePrefix: "+",
    icon: Factory,
    iconBg: "bg-[#E8F5E9]",
    iconColor: "text-[#4A7C23]",
  },
  {
    title: "Sản phẩm hoàn thành",
    value: dashboardStats.completedProducts,
    change: dashboardStats.completedChange,
    changePrefix: "+",
    icon: CheckCircle,
    iconBg: "bg-[#FFF3E0]",
    iconColor: "text-[#D4A574]",
  },
  {
    title: "Cảnh báo tồn kho",
    value: dashboardStats.stockAlerts,
    change: dashboardStats.alertsChange,
    changePrefix: "",
    icon: AlertTriangle,
    iconBg: "bg-[#FFEBEE]",
    iconColor: "text-[#DC3545]",
  },
]

export default function DashboardPage() {
  return (
    <AppShell title="Tổng quan" subtitle="Chào mừng đến với CRAFTFLOW">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="mt-1 text-3xl font-bold text-foreground">
                      {stat.value}
                    </p>
                    <p
                      className={cn(
                        "mt-1 flex items-center text-sm font-medium",
                        stat.change >= 0 ? "text-[#4A7C23]" : "text-[#DC3545]"
                      )}
                    >
                      {stat.change >= 0 ? (
                        <TrendingUp className="mr-1 h-4 w-4" />
                      ) : (
                        <TrendingDown className="mr-1 h-4 w-4" />
                      )}
                      {stat.changePrefix}
                      {Math.abs(stat.change)}%
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-lg",
                      stat.iconBg
                    )}
                  >
                    <stat.icon className={cn("h-6 w-6", stat.iconColor)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Production Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Tổng quan sản xuất
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyProduction} barGap={8}>
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
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E5DDD3",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="produced"
                    fill="#2D5016"
                    radius={[4, 4, 0, 0]}
                    name="Sản xuất"
                  />
                  <Bar
                    dataKey="target"
                    fill="#D4A574"
                    radius={[4, 4, 0, 0]}
                    name="Mục tiêu"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Material Consumption Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Tiêu hao nguyên liệu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={materialConsumption}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name} ${value}%`}
                    labelLine={true}
                  >
                    {materialConsumption.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, "Tỷ lệ"]}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E5DDD3",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Stock Alerts */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-[#FFA500]" />
                <CardTitle className="text-base font-semibold">
                  Cảnh báo sắp hết hàng
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {stockAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {alert.materialName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Hiện có: {alert.currentStock} {alert.unit} / Tối thiểu:{" "}
                      {alert.minStock} {alert.unit}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "text-xs",
                      alert.status === "Critical"
                        ? "border-[#DC3545] text-[#DC3545] hover:bg-[#DC3545]/10"
                        : "border-[#FFA500] text-[#FFA500] hover:bg-[#FFA500]/10"
                    )}
                  >
                    {alert.status === "Critical" ? "Cấp bách" : "Cảnh báo"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Hoạt động gần đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-1 h-2 w-2 rounded-full",
                        activity.type === "production" && "bg-[#4A7C23]",
                        activity.type === "import" && "bg-[#8B7355]",
                        activity.type === "alert" && "bg-[#FFA500]",
                        activity.type === "product" && "bg-[#17A2B8]"
                      )}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {activity.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activity.description}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
