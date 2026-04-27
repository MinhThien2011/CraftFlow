"use client"

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
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useAuth } from "@/hooks/user"
import { getAvatarUrl } from "@/lib/utils"

interface AppSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

// roles: array = chỉ các role đó mới thấy
const navigation = [
  { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { name: "Tổng quan kho (WMS)", href: "/dashboard_warehouse", icon: PackageOpen, roles: ["kho_manager"] },
  { name: "Kho hàng", href: "/inventory", icon: Package, roles: ["admin", "kho_manager"] },
  { name: "Kho nguyên liệu", href: "/inventory/materials", icon: Package, roles: ["admin"] },
  { name: "Kiểm kê kho", href: "/inventory/stocktake", icon: ClipboardList, roles: ["kho_manager"] },
  { name: "Nhập kho", href: "/receiving", icon: PackagePlus, roles: ["kho_manager"] },
  { name: "Xuất kho", href: "/issuing", icon: PackageMinus, roles: ["kho_manager"] },
  { name: "Yêu cầu vật liệu", href: "/requisitions/pending", icon: ClipboardList, roles: ["kho_manager"] },
  { name: "Sản phẩm & BOM", href: "/products", icon: Boxes, roles: ["admin"] },
  { name: "Sản xuất", href: "/production", icon: Factory, roles: ["admin"] },
  { name: "Cảnh báo tồn kho", href: "/alerts", icon: AlertTriangle, roles: ["kho_manager"] },
  { name: "Nhật ký hệ thống", href: "/system-log", icon: FileSearch, roles: ["admin"] },
  { name: "Người dùng", href: "/users", icon: Users, roles: ["admin"] },
  { name: "Báo cáo", href: "/reports", icon: BarChart3, roles: ["admin"], badge: true },
  { name: "Báo cáo kho (N-X-T)", href: "/reports/inventory", icon: BarChart3, roles: ["kho_manager"], badge: true },
]

const warehouseGroupedNavigation = [
  {
    name: "Nhập kho",
    icon: PackagePlus,
    badge: "6",
    children: [
      { name: "Danh sách phiếu nhập", href: "/receiving" },
      { name: "Tạo phiếu nhập", href: "/receiving/create" },
      { name: "Kiểm tra chất lượng (QC)", href: "/receiving/qc" },
      { name: "Phiếu chờ duyệt", href: "/receiving/pending" },
    ],
  },
  {
    name: "Xuất kho",
    icon: PackageMinus,
    badge: "4",
    children: [
      { name: "Danh sách phiếu xuất", href: "/issuing" },
      { name: "Chờ duyệt", href: "/issuing/pending" },
      { name: "Pick List", href: "/issuing/pick-list" },
      { name: "Dual Confirmation", href: "/issuing/confirm" },
    ],
  },
  {
    name: "Yêu cầu vật liệu",
    icon: ClipboardList,
    badge: "12",
    children: [
      { name: "Chờ duyệt", href: "/requisitions/pending" },
      { name: "Timeout", href: "/requisitions/timeout" },
    ],
  },
  {
    name: "Hàng lỗi & Phế liệu",
    icon: CircleOff,
    badge: "8",
    children: [
      { name: "Lỗi nội bộ (Internal)", href: "/defects/internal" },
      { name: "Hàng trả từ khách (RMA)", href: "/defects/rma" },
      { name: "Phế liệu", href: "/defects/scrap" },
    ],
  },
  {
    name: "Tồn kho",
    icon: Package,
    children: [
      { name: "Nguyên vật liệu", href: "/inventory/materials" },
      { name: "Kiểm kê kho", href: "/inventory/stocktake" },
      { name: "Cảnh báo tồn kho", href: "/alerts" },
    ],
  },
  {
    name: "Vị trí kho",
    icon: FileSearch,
    children: [
      { name: "Kệ nguyên liệu", href: "/locations/materials" },
      { name: "Kệ thành phẩm", href: "/locations/materials?zone=finished" },
      { name: "Gắn vị trí lô hàng", href: "/locations/materials?mode=assign" },
    ],
  },
  {
    name: "Báo cáo",
    icon: BarChart3,
    children: [
      { name: "Báo cáo kho", href: "/reports/inventory" },
    ],
  },
]

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname()
  const { user, role } = useAuth()

  const filteredNavigation = navigation.filter(item =>
    !item.roles || item.roles.includes(role)
  )
  const isKhoRole = role === "kho_manager"

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Factory className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-wide text-foreground">CRAFTFLOW</span>
          </div>
        )}
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
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted overflow-hidden">
                {getAvatarUrl(user?.avatar) ? (
                  <img src={getAvatarUrl(user?.avatar)} alt={user?.fullName} className="h-full w-full object-cover" />
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
                    <span className="inline-flex items-center rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground uppercase">
                      {typeof user?.role === "string"
                        ? user.role
                        : (user?.role as any)?.roleName || "user"}
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

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {isKhoRole && !collapsed ? (
          <>
            <Link
              href="/dashboard_warehouse"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === "/dashboard_warehouse" || pathname.startsWith("/dashboard_warehouse/")
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <PackageOpen className="h-5 w-5 shrink-0" />
              <span className="flex-1">Tổng quan kho (WMS)</span>
            </Link>
            <Link
              href="/inventory"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === "/inventory" || pathname.startsWith("/inventory/")
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Package className="h-5 w-5 shrink-0" />
              <span className="flex-1">Kho hàng</span>
            </Link>

            {warehouseGroupedNavigation.map((group) => {
              const isGroupActive = group.children.some(
                (child) => pathname === child.href || pathname.startsWith(`${child.href}/`)
              )
              return (
                <Collapsible key={group.name} defaultOpen={isGroupActive} className="space-y-1">
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isGroupActive
                          ? "bg-sidebar-accent text-sidebar-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <group.icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1 text-left">{group.name}</span>
                      {group.badge ? (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                          {group.badge}
                        </span>
                      ) : null}
                      <ChevronRight className="h-4 w-4 shrink-0 transition-transform data-[state=open]:rotate-90" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pl-9">
                    {group.children.map((child) => {
                      const isChildActive =
                        pathname === child.href || pathname.startsWith(`${child.href}/`)
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "block rounded-md px-2 py-1.5 text-sm transition-colors",
                            isChildActive
                              ? "bg-primary text-primary-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-accent"
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
          filteredNavigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className="flex h-2 w-2 rounded-full bg-primary/50" />
                    )}
                  </>
                )}
              </Link>
            )
          })
        )}
      </nav>

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
