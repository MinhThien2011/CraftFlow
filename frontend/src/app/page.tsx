"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Factory, User, Lock, Eye, EyeOff, HelpCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simulate login delay
    await new Promise((resolve) => setTimeout(resolve, 800))
    
    // For demo, accept any credentials
    router.push("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="p-4">
        <span className="text-sm text-muted-foreground">Đăng Nhập</span>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-card p-8 shadow-sm">
            {/* Logo */}
            <div className="mb-6 flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-muted">
                <Factory className="h-8 w-8 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold tracking-wider text-foreground">
                CRAFTFLOW
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Hệ thống quản lý sản xuất & kho nguyên liệu
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tài khoản
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Nhập tên đăng nhập"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 pl-11 text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-11 pr-11 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-12 w-full text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-6 border-t border-border" />

            {/* Help Link */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <HelpCircle className="h-4 w-4" />
              <span>Cần hỗ trợ kỹ thuật?</span>
              <button className="font-medium text-primary hover:underline">
                Liên hệ ngay
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <div className="mb-3 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <button className="hover:text-foreground">Điều khoản</button>
          <button className="hover:text-foreground">Bảo mật</button>
          <button className="hover:text-foreground">Hỗ trợ</button>
        </div>
        <p className="text-sm text-muted-foreground">
          © 2026 CRAFTFLOW. Tất cả quyền được bảo lưu.
        </p>
      </footer>
    </div>
  )
}
