"use client"

import React, { useCallback, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  { name: "Kho thành phẩm", href: "/inventory/products", icon: Boxes, roles: ["kho_manager"] },
  { name: "Quản lý nguyên liệu", href: "/production-management/materials", icon: Package, roles: ["production_manager"] },
  { name: "Kiểm kê kho", href: "/inventory/stocktake", icon: ClipboardList, roles: ["kho_manager"] },
  { name: "Nhập kho", href: "/receiving", icon: PackagePlus, roles: ["kho_manager"] },
  { name: "Xuất kho", href: "/issuing/materials", icon: PackageMinus, roles: ["kho_manager"] },

  // --- Requisitions & Orders ---
  { name: "Yêu cầu vật liệu", href: "/requisitions/materials", icon: ClipboardList, roles: ["admin", "kho_manager", "production_manager"] },
  { name: "Xuất thành phẩm", href: "/requisitions/products", icon: PackageMinus, roles: ["admin", "production_manager"] },
  { name: "Yêu cầu mua hàng", href: "/production-management/purchase-orders", icon: PackagePlus, roles: ["admin", "production_manager"] },

  // --- Alerts & Issues ---
  {
    name: "Cảnh báo tồn kho", href: "/alerts", icon: Bell, roles: ["admin", "production_manager", "kho_manager"] },
  { name: "Hao hụt", href: "/production-management/issues", icon: AlertTriangle, roles: ["admin", "production_manager"] },

  // --- Reports ---
  { name: "Báo cáo", href: "/reports", icon: BarChart3, roles: ["admin"], badge: true },
  { name: "Báo cáo kho (N-X-T)", href: "/reports/inventory", icon: BarChart3, roles: ["kho_manager"], badge: true },
  { name: "Báo cáo", href: "/production-management/reports", icon: BarChart3, roles: ["production_manager"], badge: true },

  // --- System & Users ---
  { name: "Người dùng", href: "/users", icon: Users, roles: ["admin"] },
  { name: "Nhật ký hệ thống", href: "/system-log", icon: FileSearch, roles: ["admin"] },
]

const warehouseGroupedNavigation = [
  {
    name: "Tổng quan",
    href: "/dashboard_warehouse",
    icon: LayoutDashboard,
    roles: ["kho_manager"],
  },
  {
    name: "Tồn kho",
    icon: Package,
    roles: ["admin", "kho_manager", "production_manager"],
    children: [
      { name: "Nguyên vật liệu", href: "/inventory/materials" },
      { name: "Thành phẩm", href: "/inventory/products" },
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
      { name: "Truy xuất lô hàng", href: "/inventory/traceability" },
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
      { name: "Xuất thành phẩm", href: "/requisitions/products" },
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

const allNavigationHrefs = [
  ...navigation.map((item) => item.href),
  ...warehouseGroupedNavigation.flatMap((group) => group.children ? group.children.map((child) => child.href) : [group.href!]),
].map((href) => href.replace(/\/$/, "") || "/")

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname()
  const { user, isAdmin, isKhoManager, role } = useAuth()

  const normalizedPath = useMemo(() => pathname.replace(/\/$/, "") || "/", [pathname])
  const avatarUrl = useMemo(() => getAvatarUrl(user?.avatar), [user?.avatar])
  const roleLabel = role === "kho_manager" ? "Quản lý kho" : role?.replace("_", " ") || ""

  const checkActive = useCallback((href: string) => {
    const normalizedHref = href.replace(/\/$/, "") || "/"
    if (normalizedPath === normalizedHref) return true

    if (normalizedPath.startsWith(`${normalizedHref}/`)) {
      const isBetterMatchExists = allNavigationHrefs.some(
        (otherHref) =>
          otherHref !== normalizedHref &&
          otherHref.length > normalizedHref.length &&
          (normalizedPath === otherHref || normalizedPath.startsWith(`${otherHref}/`))
      )
      return !isBetterMatchExists
    }
    return false
  }, [normalizedPath])

  const filteredNavigation = useMemo(() => {
    if (!role) return []
    return navigation.filter(item => !item.roles || item.roles.includes(role))
  }, [role])

  const filteredWarehouseGroupedNavigation = useMemo(() => {
    if (!role) return []
    return warehouseGroupedNavigation.filter(group => !group.roles || group.roles.includes(role))
  }, [role])

  const isKhoRole = isKhoManager && !isAdmin

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col border border-sidebar-border/30 bg-sidebar/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-sidebar/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] rounded-[2rem] overflow-hidden z-40 transition-[width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-[width]",
        collapsed ? "w-[80px]" : "w-[260px]"
      )}
    >
      {/* Logo Section */}
      <div className={cn(
        "flex h-16 items-center border-b border-sidebar-border/50 px-6 transition-all duration-300",
        collapsed ? "justify-center px-0" : "justify-between"
      )}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 group outline-none">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md transition-transform duration-300 group-hover:scale-110">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-sidebar-foreground">CRAFTFLOW</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md transition-transform duration-300 hover:scale-110 outline-none">
            <Sparkles className="h-5 w-5" />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="hidden lg:flex h-8 w-8 rounded-full hover:bg-sidebar-accent/80 transition-colors"
          aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4 text-muted-foreground" />
          ) : (
            <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>

      {/* User Profile */}
      <div className="border-b border-sidebar-border/50 p-4">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-all duration-200 hover:bg-sidebar-accent hover:shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                collapsed && "justify-center"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent overflow-hidden relative border border-sidebar-border shadow-sm transition-transform duration-200 group-hover:scale-105">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
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
                    <p className="text-sm font-semibold text-sidebar-foreground group-hover:text-primary transition-colors">
                      {user?.fullName || user?.username || "Người dùng"}
                    </p>
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {roleLabel}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </>
              )}
            </button>
          </CollapsibleTrigger>
          {!collapsed && (
            <CollapsibleContent className="mt-2 space-y-1 overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <Link
                href="/settings"
                prefetch={false}
                className="block rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                Cài đặt tài khoản
              </Link>
            </CollapsibleContent>
          )}
        </Collapsible>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-3 scrollbar-none">
        <nav className="space-y-1.5">
          {isKhoRole && !collapsed ? (
            <>
              {/* Grouped Navigation */}
              {filteredWarehouseGroupedNavigation.map((group) => {
                const Icon = group.icon

                if (group.href) {
                  const isActive = checkActive(group.href)
                  return (
                    <Link
                      key={group.name}
                      href={group.href}
                      prefetch={false}
                      className={cn(
                        "group relative flex items-center rounded-xl px-3 py-2.5 text-sm transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                        isActive
                          ? "bg-primary/10 font-bold text-primary shadow-sm"
                          : "text-muted-foreground font-medium hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_8px_rgba(0,0,0,0.5)] shadow-primary/50" />
                      )}
                      <Icon className={cn(
                        "h-5 w-5 shrink-0 transition-all duration-200 mr-3",
                        isActive ? "text-primary" : "group-hover:scale-110",
                      )} />
                      <span className="flex-1 truncate">{group.name}</span>
                    </Link>
                  )
                }

                const isGroupActive = group.children?.some((child) => checkActive(child.href)) ?? false

                return (
                  <Collapsible key={group.name} defaultOpen={isGroupActive} className="space-y-1 group/collapsible">
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "group flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                          isGroupActive
                            ? "text-primary"
                            : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                      >
                        <Icon className={cn(
                          "h-5 w-5 shrink-0 transition-all duration-200 mr-3",
                          isGroupActive ? "text-primary" : "group-hover:scale-110"
                        )} />
                        <span className="flex-1 text-left truncate">{group.name}</span>
                        {group.badge && (
                          <span className="mr-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            {group.badge}
                          </span>
                        )}
                        <ChevronRight className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                          "group-data-[state=open]/collapsible:rotate-90"
                        )} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                      <div className="ml-5 mt-1 space-y-1 border-l-2 border-sidebar-border/50 pl-4 py-1">
                        {group.children?.map((child) => {
                          const isChildActive = checkActive(child.href)
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              prefetch={false}
                              className={cn(
                                "relative block rounded-lg px-3 py-2 text-sm transition-all duration-200",
                                isChildActive
                                  ? "bg-primary/10 font-bold text-primary shadow-sm"
                                  : "text-muted-foreground font-medium hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                                isChildActive && "before:absolute before:-left-[18px] before:top-1/2 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full before:bg-primary"
                              )}
                            >
                              {child.name}
                            </Link>
                          )
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </>
          ) : (
            /* Flat Navigation */
            filteredNavigation.map((item) => {
              const isActive = checkActive(item.href)
              const Icon = item.icon

              return (
                <Link
                  key={`${item.href}-${(item.roles || []).join("_")}`}
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "group relative flex items-center rounded-xl px-3 py-2.5 text-sm transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                    isActive
                      ? "bg-primary/10 font-bold text-primary shadow-sm"
                      : "text-muted-foreground font-medium hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    collapsed && "justify-center px-0"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  {/* Indicator lấp lánh cho item active */}
                  {isActive && !collapsed && (
                    <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_8px_rgba(0,0,0,0.5)] shadow-primary/50" />
                  )}
                  {isActive && collapsed && (
                    <div className="absolute left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-primary shadow-primary/50" />
                  )}

                  <Icon className={cn(
                    "h-5 w-5 shrink-0 transition-all duration-200",
                    isActive ? "text-primary" : "group-hover:scale-110",
                    !collapsed && "mr-3"
                  )} />
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.name}</span>
                  )}
                  {!collapsed && item.badge && (
                    <span className={cn(
                      "ml-auto h-2 w-2 rounded-full",
                      isActive ? "bg-primary shadow-[0_0_5px_rgba(0,0,0,0.5)] shadow-primary/50" : "bg-muted-foreground/30"
                    )} />
                  )}
                </Link>
              )
            })
          )}
        </nav>
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border/50 p-3 bg-sidebar/50 backdrop-blur-sm">
        <Link
          href="/settings"
          prefetch={false}
          className={cn(
            "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            collapsed && "justify-center px-2"
          )}
        >
          <Settings className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" />
          {!collapsed && <span>Cài đặt</span>}
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "group mt-1 w-full justify-start gap-3 rounded-xl text-muted-foreground transition-all hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
              <span className="font-medium">Thu gọn</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
