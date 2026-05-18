"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { LogOut, User, Menu, Bell, CheckCircle2, AlertCircle, Package, Info, X, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { toast } from "sonner"
import { getAvatarUrl, cn } from "@/lib/utils"
import { useUIStore } from "@/hooks/use-ui-store"
import { ModeToggle } from "./mode-toggle"
import { ChatWidget } from "@/components/chat/chat-widget"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { notificationApi, Notification } from "@/api/notification.api"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { ScrollArea } from "@/components/ui/scroll-area"
import { queryKeys } from "@/lib/query-keys"

interface AppHeaderProps {
  title: string
  subtitle?: string
}

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  const router = useRouter()
  const { user, logout, role } = useAuth()
  const { toggleSidebar } = useUIStore()
  const queryClient = useQueryClient()

  const { data: notificationData } = useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () => notificationApi.getNotifications({ limit: 10 }),
    enabled: !!user,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    }
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
      toast.success("Đã đánh dấu tất cả là đã đọc")
    }
  })

  const notifications = notificationData?.data?.notifications || []
  const unreadCount = notifications.filter(n => !n.isRead).length

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ORDER': return <Package className="h-4 w-4 text-blue-500" />
      case 'ALERT': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'APPROVAL': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case 'TASK': return <Clock className="h-4 w-4 text-amber-500" />
      default: return <Info className="h-4 w-4 text-slate-500" />
    }
  }

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead) {
      markReadMutation.mutate(n._id)
    }

    // Route based on role and metaData — staff must not access production-management paths
    if (n.metaData?.orderId) {
      if (role === "staff") {
        router.push(`/staff/tasks`)
      } else {
        router.push(`/production-management/orders/${n.metaData.orderId}`)
      }
    } else if (n.metaData?.purchaseOrderId) {
      router.push('/production-management/purchase-orders')
    } else if (n.metaData?.slipId || n.metaData?.slipNumber) {
      router.push('/receiving')
    } else if (n.type === 'ALERT') {
      router.push('/alerts')
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      toast.error("Đã xảy ra lỗi khi đăng xuất")
    }
  }

  return (
    <header className="flex h-[80px] items-center justify-between rounded-[1.5rem] border border-border/40 bg-gradient-to-r from-pink-50/90 to-purple-50/90 dark:from-pink-950/50 dark:to-purple-950/50 px-6 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 relative z-30">
      <div className="flex items-center gap-5">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="lg:hidden rounded-xl bg-primary/5 hover:bg-primary/10 text-primary transition-colors">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex flex-col justify-center">
          <h1 className="text-[22px] font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-[13px] font-medium text-muted-foreground/80 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full relative bg-muted/30 hover:bg-primary/10 transition-colors border border-transparent hover:border-primary/20 outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
              <Bell className="h-5 w-5 text-foreground/70" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground border-2 border-card shadow-[0_0_10px_rgba(219,39,119,0.5)]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 shadow-xl border-border/50 rounded-2xl overflow-hidden backdrop-blur-xl bg-card/95">
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/20">
              <h3 className="font-bold text-sm">Thông báo</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-primary hover:bg-primary/10 rounded-lg"
                  onClick={() => markAllReadMutation.mutate()}
                >
                  Đánh dấu tất cả đã đọc
                </Button>
              )}
            </div>
            <ScrollArea className="h-[400px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">Không có thông báo mới</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((n) => (
                    <button
                      key={n._id}
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "flex items-start gap-3 p-4 text-left transition-colors border-b border-border/50 last:border-0 hover:bg-muted/50",
                        !n.isRead && "bg-primary/5 hover:bg-primary/10"
                      )}
                    >
                      <div className="mt-1 flex-shrink-0">
                        {getNotificationIcon(n.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("text-sm font-semibold leading-none", !n.isRead ? "text-primary" : "text-foreground")}>
                            {n.title}
                          </p>
                          <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: vi })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                      {!n.isRead && (
                        <div className="mt-1.5 flex-shrink-0 h-2 w-2 rounded-full bg-primary shadow-[0_0_5px_rgba(219,39,119,0.5)]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="p-2 border-t border-border/50 text-center bg-muted/10">
              <Button variant="ghost" size="sm" className="w-full text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg" onClick={() => router.push('/settings')}>
                Xem tất cả cài đặt thông báo
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="hidden md:block">
          <ModeToggle />
        </div>
        
        <div className="h-8 w-px bg-border/50 mx-1 hidden sm:block rounded-full"></div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="group gap-3 px-2 py-1.5 h-auto hover:bg-primary/5 rounded-full border border-transparent hover:border-primary/20 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
              <div className="hidden md:flex flex-col items-end text-right leading-tight">
                <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{user?.fullName || user?.username || "Người dùng"}</span>
              <span className="text-[10px] font-bold text-primary/80 uppercase tracking-wider">
                {role === "kho_manager" ? "Quản lý kho" : role === "production_manager" ? "Quản lý SẢN XUẤT" : role === "staff" ? "Nhân viên" : role?.replace("_", " ")}
              </span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-2 ring-primary/20 overflow-hidden relative shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(219,39,119,0.3)]">
                {getAvatarUrl(user?.avatar) ? (
                  <Image
                    src={getAvatarUrl(user?.avatar)!}
                    alt={user?.fullName || "User avatar"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-border/50 backdrop-blur-xl bg-card/95">
            <div className="md:hidden flex flex-col p-2 mb-2 border-b border-border/50">
               <span className="text-sm font-bold text-foreground">{user?.fullName || user?.username || "Người dùng"}</span>
               <span className="text-[10px] font-bold text-primary/80 uppercase tracking-wider">{role.replace("_", " ")}</span>
            </div>
            <DropdownMenuItem onClick={() => router.push('/settings')} className="rounded-xl cursor-pointer py-2.5 hover:bg-primary/10">
              <User className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Hồ sơ cá nhân</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
