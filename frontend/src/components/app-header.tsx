"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { LogOut, Moon, Sun, User, Menu } from "lucide-react"

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

interface AppHeaderProps {
  title: string
  subtitle?: string
}

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  const router = useRouter()
  const { user, logout } = useAuth()
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted overflow-hidden relative">
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
              <span className="hidden md:inline">{user?.fullName || user?.username || "Người dùng"}</span>
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
