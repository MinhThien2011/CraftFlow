"use client"

import { useParams } from "next/navigation"
import { withPermission } from "@/components/guards/permission-guard"
import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { ProductionOrderReadonlyDetailView } from "@/features/production/components/production-order-readonly-detail-view"
import { useSmartBack } from "@/hooks/use-smart-back"

function AdminProductionOrderDetailPage() {
  const params = useParams()
  const id = params.id as string

  const { backHref } = useSmartBack({
    fallback: "/production",
    fromMap: {
      dashboard: "/dashboard",
      list: "/production",
    },
  })

  return (
    <DashboardLayout title="Chi tiết đơn sản xuất">
      <ProductionOrderReadonlyDetailView id={id} backHref={backHref} canManage={false} />
    </DashboardLayout>
  )
}

export default withPermission(AdminProductionOrderDetailPage, ["admin"])
