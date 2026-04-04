"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
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
  User,
  Users,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { currentUser } from "@/lib/mock-data"

interface AppSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Inventory",
    href: "/inventory",
    icon: Package,
  },
  {
    name: "Products & BOM",
    href: "/products",
    icon: Boxes,
  },
  {
    name: "Production",
    href: "/production",
    icon: Factory,
  },
  {
    name: "Stock Alerts",
    href: "/alerts",
    icon: AlertTriangle,
  },
  {
    name: "Users",
    href: "/users",
    icon: Users,
  },
  {
    name: "AI Pricing",
    href: "/ai-pricing",
    icon: Sparkles,
    badge: true,
  },
  {
    name: "AI Marketing",
    href: "/ai-marketing",
    icon: Megaphone,
    badge: true,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
    badge: true,
  },
]

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname()

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
            <span className="text-xs text-muted-foreground">v1.0.0</span>
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
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium text-sidebar-foreground">
                      {currentUser.name}
                    </p>
                    <span className="inline-flex items-center rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                      {currentUser.role}
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
        {navigation.map((item) => {
          const isActive = pathname === item.href
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
              <item.icon className="h-5 w-5 flex-shrink-0" />
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
        })}
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
          {!collapsed && <span>Settings</span>}
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
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
