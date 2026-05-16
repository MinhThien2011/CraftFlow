"use client"

import React, { useEffect, useMemo, memo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AppSidebar } from "./app-sidebar"
import { AppHeader } from "./app-header"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { Skeleton } from "@/components/ui/skeleton"
import { useUIStore } from "@/hooks/use-ui-store"

interface AppShellProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

// Memoize layout components to prevent unnecessary re-renders during tab switching
const MemoizedSidebar = memo(AppSidebar)
const MemoizedHeader = memo(AppHeader)

function AppShellSkeleton() {
  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="border-b border-sidebar-border p-4">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2 px-3 py-6">
          {Array.from({ length: 9 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
        </header>
        <main className="flex-1 overflow-hidden bg-background/50">
          <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-[420px] rounded-lg" />
          </div>
        </main>
      </div>
    </div>
  )
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { isAuthenticated, loading, role } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isRedirecting, setIsRedirecting] = React.useState(false)

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
      setIsRedirecting(true)
      router.replace("/")
    }
  }, [isAuthenticated, loading, router])

  useEffect(() => {
    if (loading || !isAuthenticated || !role || !pathname) return
    setIsRedirecting(false)

    const {
      isKhoManagerOnlyPath, isAdminPath, isProductionManagerPath,
      isAdminReportsPath, isInventoryRootPath, isKhoInventoryAllowedPath,
      isWarehouseFeaturePath, isReportsInventoryPath
    } = pathConfig

    // Unified redirection logic
    if (role === "admin") {
      if (isKhoManagerOnlyPath) {
        setIsRedirecting(true)
        router.replace("/dashboard")
      }
    } else if (role === "kho_manager") {
      if ((isAdminPath || isAdminReportsPath || isInventoryRootPath || isProductionManagerPath) && !isKhoInventoryAllowedPath) {
        setIsRedirecting(true)
        router.replace("/dashboard_warehouse")
      }
    } else if (role === "production_manager") {
      // Cho phép PM truy cập các trang production-management, alerts, và settings
      const isProductsPath = pathname === "/products" || pathname.startsWith("/products/")
      const isRequisitionsPath = pathname.startsWith("/requisitions")
      const isAllowedPMPath = isProductionManagerPath || isProductsPath || isRequisitionsPath || pathname === "/alerts" || pathname.startsWith("/alerts/") || pathname === "/settings";
      if (!isAllowedPMPath) {
        setIsRedirecting(true)
        router.replace("/production-management/dashboard")
      }
    } else {
      // Handle other roles or restricted access
      if (isProductionManagerPath || isAdminPath || isWarehouseFeaturePath) {
        setIsRedirecting(true)
        router.replace("/dashboard")
      }
    }
  }, [loading, isAuthenticated, role, pathname, pathConfig, router])

  if (loading || isRedirecting) {
    return <AppShellSkeleton />
  }

  if (!isAuthenticated) {
    return <AppShellSkeleton />
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <MemoizedSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <MemoizedHeader title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background/50 scroll-smooth">
          <div className="container mx-auto p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
