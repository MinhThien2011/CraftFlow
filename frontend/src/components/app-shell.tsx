"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AppSidebar } from "./app-sidebar"
import { AppHeader } from "./app-header"
import { useAuth } from "@/hooks/user"
import { Spinner } from "@/components/ui/spinner"

interface AppShellProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { isAuthenticated, loading, role } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const warehouseFeaturePrefixes = [
    "/receiving",
    "/issuing",
    "/requisitions",
    "/locations",
    "/alerts",
    "/defects",
  ]
  const khoManagerOnlyPrefixes = ["/dashboard_warehouse"]

  const adminPrefixes = [
    "/dashboard",
    "/products",
    "/production",
    "/users",
    "/system-log",
  ]

  /** /reports and /reports/inventory are admin only */
  const isReportsInventoryPath =
    pathname === "/reports/inventory" || pathname.startsWith("/reports/inventory/")
  const isAdminReportsPath =
    pathname === "/reports" ||
    (pathname.startsWith("/reports/") && !isReportsInventoryPath)
  const isInventoryRootPath = pathname === "/inventory" || pathname === "/inventory/"
  const isKhoInventoryAllowedPath =
    isInventoryRootPath ||
    pathname === "/inventory/stocktake" ||
    pathname.startsWith("/inventory/stocktake/")

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, loading, router])

  useEffect(() => {
    if (loading || !isAuthenticated || !role || !pathname) return

    const isWarehouseFeaturePath = warehouseFeaturePrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
    const isKhoManagerOnlyPath = khoManagerOnlyPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
    const isAdminPath = adminPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )

    if (role === "admin" && isKhoManagerOnlyPath) {
      router.push("/dashboard")
      return
    }

    if (role === "admin" && (isWarehouseFeaturePath || isReportsInventoryPath)) {
      router.push("/dashboard")
      return
    }

    if (
      role === "kho_manager" &&
      (
        isAdminPath ||
        isAdminReportsPath ||
        isInventoryRootPath
      ) &&
      !isKhoInventoryAllowedPath
    ) {
      router.push("/dashboard_warehouse")
    }
  }, [loading, isAuthenticated, role, pathname, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
