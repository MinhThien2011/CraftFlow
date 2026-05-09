'use client'

import { AppShell } from '@/components/app-shell'
import { WarehouseStats } from '@/features/dashboard/components/warehouse-stats'
import { TopAlerts } from '@/features/dashboard/components/top-alerts'
import { RecentActivity } from '@/features/dashboard/components/recent-activity'

export default function WarehouseDashboardPage() {
  return (
    <AppShell
      title="Tổng quan Kho"
      subtitle="Dashboard Quản lý Kho - Warehouse Manager"
    >
      <div className="space-y-6">
        {/* Dashboard overview only for warehouse role */}
        <WarehouseStats />

        {/* Top Alerts + Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <TopAlerts />
          <RecentActivity />
        </div>
      </div>
    </AppShell>
  )
}
