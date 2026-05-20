"use client"

import { useParams } from "next/navigation"
import { withPermission } from "@/components/guards/permission-guard"
import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { ProductionOrderReadonlyDetailView } from "@/features/production/components/production-order-readonly-detail-view"
import { useSmartBack } from "@/hooks/use-smart-back"

function ProductionManagerOrderDetailPage() {
  const params = useParams()
  const id = params.id as string

  // useSmartBack resolves: ?from=tasks → /tasks, referrer, then fallback
  const { backHref } = useSmartBack({
    fallback: "/production-management/orders",
    fromMap: {
      tasks: "/production-management/tasks",
      orders: "/production-management/orders",
      dashboard: "/production-management/dashboard",
    },
  })

  return (
    <DashboardLayout title="Chi tiết lệnh sản xuất">
      <ProductionOrderReadonlyDetailView id={id} backHref={backHref} canManage />
    </DashboardLayout>
  )
}

export default withPermission(ProductionManagerOrderDetailPage, ["production_manager"])
