"use client"

import { withPermission } from "@/components/guards/permission-guard"
import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { StaffTasksView } from "@/features/production/components/staff-tasks-view"

function StaffTasksPage() {
  return (
    <DashboardLayout 
      title="Công việc của tôi" 
      subtitle="Quản lý và báo cáo tiến độ các công việc được giao"
    >
      <StaffTasksView />
    </DashboardLayout>
  )
}

export default withPermission(StaffTasksPage, ["staff", "admin"])
