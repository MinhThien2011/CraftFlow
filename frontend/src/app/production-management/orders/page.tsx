"use client"

import { withPermission } from "@/components/guards/permission-guard"
import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { ProductionOrdersView } from "@/features/production/components/production-orders-view"

function ProductionManagerOrdersPage() {
  return (
    <DashboardLayout title="Đơn sản xuất">
      <ProductionOrdersView detailBasePath="/production-management/orders" canCreate />
    </DashboardLayout>
  )
}

export default withPermission(ProductionManagerOrdersPage, ["production_manager"])
