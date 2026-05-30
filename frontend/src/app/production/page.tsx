"use client"

import { withPermission } from "@/components/guards/permission-guard"
import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { ProductionOrdersView } from "@/features/production/components/production-orders-view"

function AdminProductionPage() {
  return (
    <DashboardLayout title="Thông tin lệnh sản xuất" subtitle="Theo dõi tiến độ và trạng thái các lệnh sản xuất trong hệ thống">
      <ProductionOrdersView detailBasePath="/production" canCreate={false} />
    </DashboardLayout>
  )
}

export default withPermission(AdminProductionPage, ["admin"])
