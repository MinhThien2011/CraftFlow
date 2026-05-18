"use client"

import { useParams } from "next/navigation"
import { withPermission } from "@/components/guards/permission-guard"
import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { ProductionOrderReadonlyDetailView } from "@/features/production/components/production-order-readonly-detail-view"

function ProductionManagerOrderDetailPage() {
  const params = useParams()
  const id = params.id as string

  return (
    <DashboardLayout title="Chi tiết đơn sản xuất">
      <ProductionOrderReadonlyDetailView id={id} backHref="/production-management/orders" canManage />
    </DashboardLayout>
  )
}

export default withPermission(ProductionManagerOrderDetailPage, ["production_manager"])
