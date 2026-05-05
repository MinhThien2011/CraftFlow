"use client"

import { DashboardLayout } from "@/components/production-management/dashboard-layout"
import { StatCard } from "@/components/production-management/stat-card"
import { PerformanceChart } from "@/components/production-management/performance-chart"
import { StatusChart } from "@/components/production-management/status-chart"
import { RecentOrders } from "@/components/production-management/recent-orders"
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


