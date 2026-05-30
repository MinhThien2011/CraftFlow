"use client"

import { useAuth } from "@/features/auth/hooks/use-auth"
import ProductionAlertsPage from "./page-production"
import WarehouseAlertsPage from "./warehouse-alerts"

export default function UnifiedAlertsPage() {
  const { isKhoManager, isAdmin } = useAuth()

  // Admin and Production Manager use the full system alerts page
  // Warehouse Manager uses the simplified inventory alerts page
  if (isKhoManager && !isAdmin) {
    return <WarehouseAlertsPage />
  }

  return <ProductionAlertsPage />
}
