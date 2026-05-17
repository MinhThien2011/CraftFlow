"use client"

import React, { memo, useEffect, useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"

import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"
import { ChatWidget } from "@/components/chat/chat-widget"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useUIStore } from "@/hooks/use-ui-store"
import { Skeleton } from "@/components/ui/skeleton"

interface AppShellProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

const MemoizedSidebar = memo(AppSidebar)
const MemoizedHeader = memo(AppHeader)

function AppShellSkeleton() {
  return (
    <div className="flex h-dvh overflow-hidden bg-zinc-50 dark:bg-[#030303] text-foreground">
      {/* Floating Sidebar Skeleton */}
      <div className="py-4 pl-4 h-full shrink-0 z-40 hidden md:block">
        <aside className="relative w-64 h-full flex-col rounded-[2rem] border border-sidebar-border/30 bg-sidebar/60 backdrop-blur-2xl shadow-xl flex overflow-hidden">
          <div className="flex h-20 items-center gap-3 border-b border-sidebar-border/30 px-6">
            <Skeleton className="h-10 w-10 rounded-xl bg-primary/20" />
            <Skeleton className="h-6 w-32 bg-sidebar-accent/50" />
          </div>
          <div className="p-5 border-b border-sidebar-border/30">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-2xl bg-sidebar-accent/50" />
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-4 w-28 bg-sidebar-accent/50" />
                <Skeleton className="h-3 w-20 bg-primary/30" />
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-3 px-4 py-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-xl bg-sidebar-accent/30" />
            ))}
          </div>
        </aside>
      </div>
      
      {/* Main Content Skeleton */}
      <div className="flex min-w-0 flex-1 flex-col z-10">
        {/* Floating Header Skeleton */}
        <div className="pt-4 px-4 shrink-0">
          <header className="flex h-[72px] items-center justify-between rounded-2xl border border-border/40 bg-card/60 px-6 backdrop-blur-xl shadow-lg">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48 bg-muted" />
              <Skeleton className="h-3 w-64 bg-muted/50" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full bg-muted" />
              <Skeleton className="h-10 w-10 rounded-full bg-muted" />
              <Skeleton className="h-10 w-32 rounded-full bg-muted" />
            </div>
          </header>
        </div>
        
        <main className="flex-1 overflow-hidden mt-6">
          <div className="container mx-auto space-y-6 px-4 md:px-6 lg:px-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-2xl bg-card/50 border border-border/50 shadow-sm" />
              ))}
            </div>
            <Skeleton className="h-[500px] rounded-3xl bg-card/50 border border-border/50 shadow-sm" />
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

  const pathConfig = useMemo(() => {
    const warehouseFeaturePrefixes = ["/receiving", "/issuing", "/requisitions", "/locations", "/alerts", "/defects"]
    const adminPrefixes = ["/dashboard", "/products", "/production", "/users", "/system-log"]

    const isReportsInventoryPath = pathname === "/reports/inventory" || pathname.startsWith("/reports/inventory/")
    const isAdminReportsPath = pathname.startsWith("/reports") && !isReportsInventoryPath
    const isInventoryRootPath = pathname === "/inventory" || pathname === "/inventory/"
    const isKhoInventoryAllowedPath = isInventoryRootPath || pathname.startsWith("/inventory/stocktake")

    return {
      isWarehouseFeaturePath: warehouseFeaturePrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`)),
      isKhoManagerOnlyPath: pathname === "/dashboard_warehouse" || pathname.startsWith("/dashboard_warehouse/"),
      isAdminPath: adminPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`)),
      isProductionManagerPath: pathname.startsWith("/production-management"),
      isAdminReportsPath,
      isInventoryRootPath,
      isKhoInventoryAllowedPath,
    }
  }, [pathname])

  const redirectTarget = useMemo(() => {
    if (loading) return null
    if (!isAuthenticated) return "/"
    if (!role || !pathname) return null

    const {
      isKhoManagerOnlyPath,
      isAdminPath,
      isProductionManagerPath,
      isAdminReportsPath,
      isInventoryRootPath,
      isKhoInventoryAllowedPath,
      isWarehouseFeaturePath,
    } = pathConfig

    if (role === "admin") {
      return isKhoManagerOnlyPath ? "/dashboard" : null
    }

    if (role === "kho_manager") {
      if ((isAdminPath || isAdminReportsPath || isInventoryRootPath || isProductionManagerPath) && !isKhoInventoryAllowedPath) {
        return "/dashboard_warehouse"
      }
      return null
    }

    if (role === "production_manager") {
      const isProductsPath = pathname === "/products" || pathname.startsWith("/products/")
      const isRequisitionsPath = pathname.startsWith("/requisitions")
      const isAllowedPMPath =
        isProductionManagerPath ||
        isProductsPath ||
        isRequisitionsPath ||
        pathname === "/alerts" ||
        pathname.startsWith("/alerts/") ||
        pathname === "/settings"
      return isAllowedPMPath ? null : "/production-management/dashboard"
    }

    if (isProductionManagerPath || isAdminPath || isWarehouseFeaturePath) {
      return "/dashboard"
    }

    return null
  }, [isAuthenticated, loading, pathname, pathConfig, role])

  useEffect(() => {
    if (redirectTarget) {
      router.replace(redirectTarget)
    }
  }, [redirectTarget, router])

  if (loading || !!redirectTarget || !isAuthenticated) {
    return <AppShellSkeleton />
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-zinc-50 dark:bg-[#030303] text-foreground selection:bg-primary/20">
      
      {/* Vùng không gian (Margin) bọc Sidebar tạo Floating Island */}
      <div className="py-4 pl-4 h-full shrink-0 z-40 hidden md:block transition-all duration-300">
        <MemoizedSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      </div>

      {/* Dành cho Mobile Sidebar (sẽ hiển thị dạng absolute/drawer nếu code có hỗ trợ) */}
      <div className="md:hidden">
        <MemoizedSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      </div>
      
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden relative z-10">
        {/* Vùng không gian (Margin) bọc Header tạo Floating Island */}
        <div className="pt-4 px-4 shrink-0 transition-all duration-300">
          <MemoizedHeader title={title} subtitle={subtitle} />
        </div>
        
        {/* Vùng Main Content mượt mà */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth mt-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          <div className="container mx-auto px-4 pb-8 md:px-6 md:pb-12 lg:px-8 animate-in fade-in duration-500 slide-in-from-bottom-6">
            {children}
          </div>
        </main>
      </div>

      {/* Đặt ChatWidget ở Root để tránh lỗi Containing Block do backdrop-filter gây ra */}
      {isAuthenticated && <ChatWidget />}
    </div>
  )
}
