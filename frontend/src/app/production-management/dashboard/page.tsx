"use client"

import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { StatCard } from "@/features/production/components/stat-card"
import { PerformanceChart } from "@/features/production/components/performance-chart"
import { StatusChart } from "@/features/production/components/status-chart"
import { RecentOrders } from "@/features/production/components/recent-orders"
import {
  Package,
  ClipboardList,
  Users,
  AlertTriangle,
} from "lucide-react"

export default function DashboardPage() {
  return (
    <DashboardLayout title="Tổng quan">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Sản phẩm đã duyệt"
            value={128}
            icon={Package}
          />
          <StatCard
            title="Đơn sản xuất"
            value={85}
            icon={ClipboardList}
          />
          <StatCard
            title="Nhân viên hoạt động"
            value={24}
            icon={Users}
          />
          <StatCard
            title="Báo cáo hao hụt"
            value={7}
            icon={AlertTriangle}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PerformanceChart />
          </div>
          <div>
            <StatusChart />
          </div>
        </div>

        {/* Recent Orders */}
        <RecentOrders />
      </div>
    </DashboardLayout>
  )
}


