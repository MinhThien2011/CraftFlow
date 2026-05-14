"use client"

import React, { useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { usePrefetch } from "@/hooks/use-prefetch"
import {
  LayoutDashboard,
  Package,
  PackageOpen,
  PackagePlus,
  PackageMinus,
  Boxes,
  Factory,
  AlertTriangle,
  Sparkles,
  Megaphone,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  ChevronRight,
  User,
  Users,
  FileSearch,
  ClipboardList,
  CircleOff,
  ListTodo,
  Bell,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { getAvatarUrl } from "@/lib/utils"

interface AppSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

// roles: array = chỉ các role đó mới thấy
const navigation = [
  // --- Dashboards ---
  { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { name: "Tổng quan sản xuất", href: "/production-management/dashboard", icon: LayoutDashboard, roles: ["production_manager"] },
  { name: "Tổng quan kho (WMS)", href: "/dashboard_warehouse", icon: PackageOpen, roles: ["kho_manager"] },

  // --- Products & Production ---
  { name: "Sản phẩm & BOM", href: "/products", icon: Boxes, roles: ["admin", "production_manager"] },
  { name: "Sản xuất", href: "/production", icon: Factory, roles: ["admin"] },
  { name: "Đơn sản xuất", href: "/production-management/orders", icon: ClipboardList, roles: ["production_manager"] },
  { name: "Công việc", href: "/production-management/tasks", icon: ListTodo, roles: ["production_manager"] },

  // --- Inventory & Warehouse ---
  { name: "Kho hàng", href: "/inventory", icon: Package, roles: ["admin", "kho_manager"] },
  { name: "Kho nguyên liệu", href: "/inventory/materials", icon: Package, roles: ["kho_manager"] },
  { name: "Quản lý nguyên liệu", href: "/production-management/materials", icon: Package, roles: ["production_manager"] },
  { name: "Kiểm kê kho", href: "/inventory/stocktake", icon: ClipboardList, roles: ["kho_manager"] },
  { name: "Nhập kho", href: "/receiving", icon: PackagePlus, roles: ["kho_manager"] },
  { name: "Xuất kho", href: "/issuing/materials", icon: PackageMinus, roles: ["kho_manager"] },

  // --- Requisitions & Orders ---
  { name: "Yêu cầu vật liệu", href: "/requisitions/materials", icon: ClipboardList, roles: ["admin", "kho_manager", "production_manager"] },
  { name: "Yêu cầu mua hàng", href: "/production-management/purchase-orders", icon: PackagePlus, roles: ["admin", "production_manager"] },

  // --- Alerts & Issues ---
  { name: "Cảnh báo tồn kho", href: "/alerts", icon: AlertTriangle, roles: ["kho_manager", "admin"] },
  { name: "Cảnh báo vật tư", href: "/alerts", icon: Bell, roles: ["production_manager"] },
  { name: "Hao hụt", href: "/production-management/issues", icon: AlertTriangle, roles: ["production_manager"] },

  // --- Reports ---
  { name: "Báo cáo", href: "/reports", icon: BarChart3, roles: ["admin"], badge: true },
  { name: "Báo cáo kho (N-X-T)", href: "/reports/inventory", icon: BarChart3, roles: ["kho_manager"], badge: true },
  { name: "Báo cáo", href: "/production-management/reports", icon: BarChart3, roles: ["production_manager"], badge: true },

  // --- System & Users ---
  { name: "Nhật ký hệ thống", href: "/system-log", icon: FileSearch, roles: ["admin"] },
  { name: "Người dùng", href: "/users", icon: Users, roles: ["admin"] },
]

const warehouseGroupedNavigation = [
  {
    name: "Tồn kho",
    icon: Package,
    roles: ["admin", "kho_manager", "production_manager"],
    children: [
      { name: "Nguyên vật liệu", href: "/inventory/materials" },
      { name: "Kiểm kê kho", href: "/inventory/stocktake" },
      { name: "Cảnh báo tồn kho", href: "/alerts" },
    ],
  },
  {
    name: "Vị trí kho",
    icon: FileSearch,
    roles: ["admin", "kho_manager"],
    children: [
      { name: "Kệ nguyên liệu", href: "/locations/materials" },
      { name: "Kệ thành phẩm", href: "/locations/materials/products" },
      { name: "Gắn vị trí lô hàng", href: "/locations/materials/assign" },
    ],
  },
  {
    name: "Nhập kho",
    icon: PackagePlus,
    badge: "6",
    roles: ["admin", "kho_manager"],
    children: [
      { name: "Phiếu nhập vật liệu", href: "/receiving/materials" },
      { name: "Phiếu nhập thành phẩm", href: "/receiving/products" },
    ],
  },
  {
    name: "Yêu cầu vật liệu",
    icon: ClipboardList,
    badge: "4",
    roles: ["admin", "kho_manager", "production_manager"],
    children: [
      { name: "Cấp vật tư", href: "/requisitions/materials" },
      { name: "Hoàn trả vật tư", href: "/requisitions/returns" },
    ],
  },
  {
    name: "Xuất kho",
    icon: PackageMinus,
    badge: "4",
    roles: ["admin", "kho_manager"],
    children: [
      { name: "Phiếu xuất vật liệu", href: "/issuing/materials" },
      { name: "Phiếu xuất thành phẩm", href: "/issuing/products" },
      { name: "Pick List", href: "/issuing/pick-list" },
    ],
  },
  {
    name: "Hàng lỗi & Phế liệu",
    icon: CircleOff,
    badge: "8",
    roles: ["admin", "kho_manager"],
    children: [
      { name: "Lỗi nội bộ (Internal)", href: "/defects/internal" },
      { name: "Hàng trả từ khách (RMA)", href: "/defects/rma" },
      { name: "Phế liệu", href: "/defects/scrap" },
    ],
  },
  {
    name: "Báo cáo",
    icon: BarChart3,
    roles: ["admin", "kho_manager"],
    children: [
      { name: "Báo cáo kho", href: "/reports/inventory" },
    ],
  },
]

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname()
  const { user, isAdmin, isKhoManager, isProductionManager, role } = useAuth()
  const prefetch = usePrefetch()

  // Logic kiểm tra tab đang active chính xác hơn sử dụng nguyên tắc Longest Prefix Match
  const checkActive = (href: string) => {
    // Chuẩn hóa path (loại bỏ trailing slash)
    const normalizedPath = pathname.replace(/\/$/, "") || "/"
    const normalizedHref = href.replace(/\/$/, "") || "/"

    if (normalizedPath === normalizedHref) return true

    if (normalizedPath.startsWith(`${normalizedHref}/`)) {
      const allPossibleHrefs = [
        ...navigation.map((n) => n.href),
        ...warehouseGroupedNavigation.flatMap((g) => g.children.map((c) => c.href)),
      ].map(h => h.replace(/\/$/, "") || "/")

      const isBetterMatchExists = allPossibleHrefs.some(
        (otherHref) =>
          otherHref !== normalizedHref &&
          otherHref.length > normalizedHref.length &&
          (normalizedPath === otherHref || normalizedPath.startsWith(`${otherHref}/`))
      )

      return !isBetterMatchExists
    }

    return false
  }

  const filteredNavigation = useMemo(() => {
    if (!role) return []
    return navigation.filter(item => !item.roles || item.roles.includes(role))
  }, [role])

  const filteredWarehouseGroupedNavigation = useMemo(() => {
    if (!role) return []
    return warehouseGroupedNavigation.filter(group => !group.roles || group.roles.includes(role))
  }, [role])

  const isKhoRole = isKhoManager && !isAdmin // Admin dùng flat navigation cho đầy đủ
  const isPMORAdmin = isProductionManager || isAdmin

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo Section */}
      <div className={cn(
        "flex h-16 items-center border-b border-sidebar-border px-6 transition-all duration-300",
        collapsed ? "justify-center px-0" : "justify-between"
      )}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">CRAFTFLOW</span>
          </Link>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="hidden lg:flex h-8 w-8 rounded-full hover:bg-sidebar-accent"
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4 text-muted-foreground" />
          ) : (
            <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>

      {/* User Profile */}
      <div className="border-b border-sidebar-border p-4">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent",
                collapsed && "justify-center"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted overflow-hidden relative">
                {getAvatarUrl(user?.avatar) ? (
                  <Image
                    src={getAvatarUrl(user?.avatar)!}
                    alt={user?.fullName || "User avatar"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium text-sidebar-foreground">
                      {user?.fullName || user?.username || "Người dùng"}
                    </p>
                    <span className="inline-flex items-center rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      {role === "kho_manager" ? "Quản lý kho" : role.replace("_", " ")}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </>
              )}
            </button>
          </CollapsibleTrigger>
          {!collapsed && (
            <CollapsibleContent className="mt-2 space-y-1">
              <Link
                href="/settings"
                className="block rounded-lg px-4 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
              >
                Cài đặt tài khoản
              </Link>
            </CollapsibleContent>
          )}
        </Collapsible>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 scrollbar-none">
        <nav className="space-y-1.5">
          {isKhoRole && !collapsed ? (
            <>
              {/* Grouped Navigation for Warehouse Role */}
              {filteredWarehouseGroupedNavigation.map((group) => {
                const isGroupActive = group.children.some(
                  (child) => checkActive(child.href)
                )
                const Icon = group.icon

                return (
                  <Collapsible key={group.name} defaultOpen={isGroupActive} className="space-y-1">
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "group flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          isGroupActive
                            ? "bg-sidebar-accent text-sidebar-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <Icon className={cn(
                          "h-5 w-5 shrink-0 transition-colors mr-3",
                          isGroupActive ? "text-primary" : "group-hover:text-sidebar-accent-foreground"
                        )} />
                        <span className="flex-1 text-left truncate">{group.name}</span>
                        {group.badge && (
                          <span className="mr-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            {group.badge}
                          </span>
                        )}
                        <ChevronRight className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-200",
                          isGroupActive && "rotate-90"
                        )} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 ml-9 overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                      {group.children.map((child) => {
                        const isChildActive = checkActive(child.href)
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            prefetch={true}
                            className={cn(
                              "block rounded-lg px-3 py-1.5 text-sm transition-all duration-200",
                              isChildActive
                                ? "bg-primary/10 font-medium text-primary"
                                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                          >
                            {child.name}
                          </Link>
                        )
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </>
          ) : (
            /* Flat Navigation for other roles or collapsed state */
            filteredNavigation.map((item) => {
              const isActive = checkActive(item.href)
              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    collapsed && "justify-center px-0"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    isActive ? "text-primary-foreground" : "group-hover:text-sidebar-accent-foreground",
                    !collapsed && "mr-3"
                  )} />
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.name}</span>
                  )}
                  {!collapsed && item.badge && (
                    <span className={cn(
                      "ml-auto h-2 w-2 rounded-full",
                      isActive ? "bg-primary-foreground" : "bg-primary"
                    )} />
                  )}
                </Link>
              )
            })
          )}
        </nav>
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
            collapsed && "justify-center px-2"
          )}
        >
          <Settings className="h-5 w-5" />
          {!collapsed && <span>Cài đặt</span>}
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "mt-2 w-full justify-start gap-3 text-muted-foreground hover:text-sidebar-foreground",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-5 w-5" />
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5" />
              <span>Thu gọn</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
