'use client'

import { AppShell } from '@/components/app-shell'
import { WarehouseStats } from '@/components/dashboard/warehouse-stats'
import { TopAlerts } from '@/components/dashboard/top-alerts'
import { PendingRequisitions } from '@/components/dashboard/pending-requisitions'
import { LowStockAlerts } from '@/components/dashboard/low-stock-alerts'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { ReceivingPending } from '@/components/dashboard/receiving-pending'
import { IssuingPending } from '@/components/dashboard/issuing-pending'

export default function WarehouseDashboardPage() {
  return (
    <AppShell 
      title="Tổng quan Kho" 
      subtitle="Dashboard Quản lý Kho - Warehouse Manager"
    >
      <div className="space-y-6">
        {/* Stats Cards - 5 thẻ số liệu chính */}
        <WarehouseStats />

        {/* Quick Actions */}
        <QuickActions />

        {/* Top Alerts + Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <TopAlerts />
          <RecentActivity />
        </div>

        {/* Pending Tables Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ReceivingPending />
          <IssuingPending />
        </div>

        {/* Material Requisitions - Full Width */}
        <PendingRequisitions />

        {/* Low Stock Alerts */}
        <LowStockAlerts />
      </div>
    </AppShell>
  )
}
