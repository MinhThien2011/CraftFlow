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
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getNotifications({ limit: 10 }),
    enabled: !!user,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
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

    // Điều hướng dựa trên metaData nếu có
    if (n.metaData?.orderId) {
      router.push(`/production-management/orders/${n.metaData.orderId}`)
    } else if (n.type === 'ALERT') {
      router.push('/alerts')
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      toast.success("Đăng xuất thành công")
      router.push("/")
    } catch (error) {
      toast.error("Đã xảy ra lỗi khi đăng xuất")
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white border-2 border-card">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 shadow-xl border-border">
            <div className="flex items-center justify-between p-4 border-b bg-muted/30">
              <h3 className="font-bold text-sm">Thông báo</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-primary hover:bg-primary/5"
                  onClick={() => markAllReadMutation.mutate()}
                >
                  Đánh dấu tất cả đã đọc
                </Button>
              )}
            </div>
            <ScrollArea className="h-[400px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">Không có thông báo mới</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((n) => (
                    <button
                      key={n._id}
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "flex items-start gap-3 p-4 text-left transition-colors border-b last:border-0 hover:bg-muted/50",
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
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: vi })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                      {!n.isRead && (
                        <div className="mt-1.5 flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="p-2 border-t text-center bg-muted/10">
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => router.push('/settings')}>
                Xem tất cả cài đặt thông báo
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <ModeToggle />
        <div className="h-6 w-px bg-border mx-1 hidden sm:block"></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 px-2 hover:bg-accent rounded-full">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted overflow-hidden relative border border-border">
                {getAvatarUrl(user?.avatar) ? (
                  <Image
                    src={getAvatarUrl(user?.avatar)!}
                    alt={user?.fullName || "User avatar"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div className="hidden md:flex flex-col items-start text-left leading-tight">
                <span className="text-sm font-medium text-foreground">{user?.fullName || user?.username || "Người dùng"}</span>
                <span className="text-xs text-muted-foreground capitalize">{role.replace("_", " ")}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Hồ sơ
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {user && <ChatWidget />}
    </header>
  )
}
