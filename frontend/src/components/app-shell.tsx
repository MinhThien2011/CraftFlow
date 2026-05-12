import React, { useState, useEffect, useMemo, memo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AppSidebar } from "./app-sidebar"
import { AppHeader } from "./app-header"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { Spinner } from "@/components/ui/spinner"
import { useUIStore } from "@/hooks/use-ui-store"

interface AppShellProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

// Memoize layout components to prevent unnecessary re-renders during tab switching
const MemoizedSidebar = memo(AppSidebar)
const MemoizedHeader = memo(AppHeader)

export function AppShell({ children, title, subtitle }: AppShellProps) {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { isAuthenticated, loading, role } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Use useMemo to optimize path configuration and avoid redundant computations on each render
  const pathConfig = useMemo(() => {
    const warehouseFeaturePrefixes = [
      "/receiving", "/issuing", "/requisitions", "/locations", "/alerts", "/defects",
    ]
    const adminPrefixes = [
      "/dashboard", "/products", "/production", "/users", "/system-log",
    ]

    const isReportsInventoryPath = pathname === "/reports/inventory" || pathname.startsWith("/reports/inventory/")
    const isAdminReportsPath = pathname.startsWith("/reports") && !isReportsInventoryPath
    const isInventoryRootPath = pathname === "/inventory" || pathname === "/inventory/"
    const isKhoInventoryAllowedPath = isInventoryRootPath || pathname.startsWith("/inventory/stocktake")

    return {
      isWarehouseFeaturePath: warehouseFeaturePrefixes.some(p => pathname === p || pathname.startsWith(`${p}/`)),
      isKhoManagerOnlyPath: pathname === "/dashboard_warehouse" || pathname.startsWith("/dashboard_warehouse/"),
      isAdminPath: adminPrefixes.some(p => pathname === p || pathname.startsWith(`${p}/`)),
      isProductionManagerPath: pathname.startsWith("/production-management"),
      isReportsInventoryPath,
      isAdminReportsPath,
      isInventoryRootPath,
      isKhoInventoryAllowedPath
    }
  }, [pathname])

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, loading, router])

  useEffect(() => {
    if (loading || !isAuthenticated || !role || !pathname) return

    const {
      isKhoManagerOnlyPath, isAdminPath, isProductionManagerPath,
      isAdminReportsPath, isInventoryRootPath, isKhoInventoryAllowedPath,
      isWarehouseFeaturePath, isReportsInventoryPath
    } = pathConfig

    // Unified redirection logic
    if (role === "admin") {
      if (isKhoManagerOnlyPath) {
        router.push("/dashboard")
      }
    } else if (role === "kho_manager") {
      if ((isAdminPath || isAdminReportsPath || isInventoryRootPath || isProductionManagerPath) && !isKhoInventoryAllowedPath) {
        router.push("/dashboard_warehouse")
      }
    } else if (role === "production_manager") {
      // Cho phép PM truy cập các trang production-management, alerts, và settings
      const isProductsPath = pathname === "/products" || pathname.startsWith("/products/")
      const isAllowedPMPath = isProductionManagerPath || isProductsPath || pathname === "/alerts" || pathname.startsWith("/alerts/") || pathname === "/settings";
      if (!isAllowedPMPath) {
        router.push("/production-management/dashboard")
      }
    } else {
      // Handle other roles or restricted access
      if (isProductionManagerPath || isAdminPath || isWarehouseFeaturePath) {
        router.push("/dashboard")
      }
    }
  }, [loading, isAuthenticated, role, pathname, pathConfig, router])

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
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <MemoizedSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MemoizedHeader title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background/50 scroll-smooth">
          {/* Add a fade-in animation to make tab switching feel smoother */}
          <div className="container mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-1 duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
