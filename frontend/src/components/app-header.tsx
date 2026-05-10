"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { LogOut, User, Menu, Bell } from "lucide-react"

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
import { getAvatarUrl } from "@/lib/utils"
import { useUIStore } from "@/hooks/use-ui-store"
import { ModeToggle } from "./mode-toggle"

interface AppHeaderProps {
  title: string
  subtitle?: string
}

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  const router = useRouter()
  const { user, logout, role } = useAuth()
  const { toggleSidebar } = useUIStore()

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
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-destructive"></span>
        </Button>
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
    </header>
  )
}
