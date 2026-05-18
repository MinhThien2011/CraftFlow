"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Factory, User, Lock, Eye, EyeOff, HelpCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { toast } from "sonner"

// Hàm tạo bóng sao (box-shadow) tối ưu hiệu năng
const createStarShadows = (count: number, maxWidth: number, maxHeight: number) => {
  let shadow = '';
  for (let i = 0; i < count; i++) {
    shadow += `${Math.floor(Math.random() * maxWidth)}px ${Math.floor(Math.random() * maxHeight)}px #FFF`;
    if (i < count - 1) shadow += ', ';
  }
  return shadow;
}

const CodeUniverseBackground = () => {
  const [shadows, setShadows] = useState({ small: '', medium: '', large: '' });

  useEffect(() => {
    // Kích thước vùng sao (rộng hơn màn hình để khi parallax không bị lòi viền)
    const w = 3000;
    const h = 3000;
    setShadows({
      small: createStarShadows(300, w, h),
      medium: createStarShadows(100, w, h),
      large: createStarShadows(30, w, h),
    });
  }, []);

  return (
    <div className="absolute inset-[-50%] overflow-hidden bg-[#050505] pointer-events-none">
      {/* Tinh vân sử dụng Radial Gradient thay vì Filter Blur để đạt 60FPS */}
      <div 
        className="absolute inset-0 opacity-60 mix-blend-screen"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(147, 51, 234, 0.25) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(37, 99, 235, 0.25) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(219, 39, 119, 0.2) 0%, transparent 60%)
          `
        }}
      />

      {/* Box-shadow stars siêu tối ưu thay vì render hàng trăm DOM elements */}
      <div 
        className="absolute w-[1px] h-[1px] bg-transparent animate-pulse"
        style={{ boxShadow: shadows.small, animationDuration: '3s', left: '-500px', top: '-500px' }}
      />
      <div 
        className="absolute w-[2px] h-[2px] bg-transparent animate-pulse"
        style={{ boxShadow: shadows.medium, animationDuration: '4s', left: '-500px', top: '-500px' }}
      />
      <div 
        className="absolute w-[3px] h-[3px] bg-transparent animate-pulse"
        style={{ boxShadow: shadows.large, animationDuration: '5s', left: '-500px', top: '-500px' }}
      />
    </div>
  );
};

export default function LoginPage() {
  const router = useRouter()
  const { login, loading: authLoading, isAuthenticated, role } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  const loginInFlight = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<number>(0) // Sửa lỗi rớt FPS bằng rAF
  const xRef = useRef(0)
  const yRef = useRef(0)

  const getHomeByRole = (userRole: string) => {
    if (userRole === "kho_manager") return "/dashboard_warehouse"
    if (userRole === "production_manager") return "/production-management/dashboard"
    if (userRole === "staff") return "/staff/tasks"
    return "/dashboard"
  }

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && role) {
      router.push(getHomeByRole(role))
    }
  }, [isAuthenticated, role, router])

  const updateMousePosition = () => {
    if (containerRef.current) {
      containerRef.current.style.setProperty('--mouse-x', xRef.current.toString())
      containerRef.current.style.setProperty('--mouse-y', yRef.current.toString())
    }
    requestRef.current = 0
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e
    const { innerWidth, innerHeight } = window
    
    xRef.current = (clientX / innerWidth - 0.5) * 2
    yRef.current = (clientY / innerHeight - 0.5) * 2
    
    // Sử dụng requestAnimationFrame để hạn chế tần suất gọi DOM style, chống giật lag
    if (!requestRef.current) {
      requestRef.current = requestAnimationFrame(updateMousePosition)
    }
  }

  // Cleanup rAF
  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading || loginInFlight.current) return

    if (!username || !password) {
      toast.error("Vui lòng nhập tài khoản và mật khẩu")
      return
    }

    setIsLoading(true)
    loginInFlight.current = true

    try {
      const result = await login(username, password)
      if (result.success) {
        toast.success("Đăng nhập thành công")
      } else {
        toast.error(result.message || "Đăng nhập thất bại")
      }
    } catch (error) {
      toast.error("Đã xảy ra lỗi kết nối")
    } finally {
      loginInFlight.current = false
      setIsLoading(false)
    }
  }

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative flex min-h-screen flex-col overflow-hidden bg-[#050505] [perspective:1200px]"
      style={{
        '--mouse-x': '0',
        '--mouse-y': '0',
      } as React.CSSProperties}
    >
      {/* Background layer: di chuyển ngược hướng chuột nhẹ nhàng */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 transition-transform duration-200 ease-out"
        style={{
          transform: 'translateZ(-100px) translate(calc(var(--mouse-x) * 30px), calc(var(--mouse-y) * 30px)) scale(1.1)'
        }}
      >
        <CodeUniverseBackground />
      </div>

      {/* Header */}
      <header className="relative z-20 p-6 flex justify-end items-center">
        <Button variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 transition-colors">
          <HelpCircle className="h-5 w-5 text-white/70" />
        </Button>
      </header>

      {/* Main Content Form */}
      <main 
        className="relative z-20 flex flex-1 items-center justify-center px-4 py-12 transition-transform duration-100 ease-out"
        style={{
          transform: 'translateZ(0) translate(calc(var(--mouse-x) * -15px), calc(var(--mouse-y) * -15px)) rotateX(calc(var(--mouse-y) * 4deg)) rotateY(calc(var(--mouse-x) * -4deg))',
          transformStyle: 'preserve-3d'
        }}
      >
        <div className="w-full max-w-md">
          {/* Glassmorphism Card (Premium Sleek Design) */}
          <div 
            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_20px_50px_rgba(236,72,153,0.15)]"
            style={{ transform: 'translateZ(30px)' }}
          >
            
            {/* Subtle inner reflection (Tạo viền bóng bẩy) */}
            <div className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none" style={{ mixBlendMode: 'overlay' }} />
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

            <div className="relative z-20">
              {/* Logo Area */}
              <div className="mb-10 flex flex-col items-center">
                <div className="animate-float mb-6 relative">
                  {/* Hologram Box */}
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/10 to-pink-500/5 shadow-[0_0_30px_rgba(236,72,153,0.2)] backdrop-blur-md">
                    <Factory className="h-10 w-10 text-pink-300 drop-shadow-[0_0_10px_rgba(244,114,182,0.8)]" />
                  </div>
                  {/* Shadow */}
                  <div className="absolute -bottom-6 left-1/2 h-2 w-12 -translate-x-1/2 rounded-[100%] bg-pink-500/30 blur-sm" />
                </div>
                
                <h1 className="bg-gradient-to-r from-fuchsia-300 to-pink-300 bg-clip-text text-3xl font-black tracking-widest text-transparent drop-shadow-sm">
                  CRAFTFLOW
                </h1>
                <p className="mt-2 text-sm font-medium text-white/50 text-center">
                  Hệ thống quản lý sản xuất & kho
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-[11px] font-bold uppercase tracking-widest text-white/60 ml-1">
                    Tài khoản
                  </Label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-pink-300" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Nhập tên đăng nhập"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-14 rounded-xl border-white/5 bg-white/5 pl-12 text-base text-white placeholder:text-white/20 shadow-none transition-all focus:border-pink-500/50 focus:bg-white/10 focus:ring-0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-widest text-white/60 ml-1">
                    Mật khẩu
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-pink-300" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 rounded-xl border-white/5 bg-white/5 pl-12 pr-12 text-base text-white placeholder:text-white/20 shadow-none transition-all focus:border-pink-500/50 focus:bg-white/10 focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      className="text-[13px] font-medium text-white/50 transition-colors hover:text-pink-300 hover:underline"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="group relative mt-6 h-14 w-full overflow-hidden rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-500 text-base font-bold text-white shadow-[0_4px_20px_rgba(219,39,119,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(219,39,119,0.5)] disabled:opacity-70 border border-white/10"
                  disabled={isLoading}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isLoading ? "Đang xử lý..." : "Đăng nhập ngay"}
                  </span>
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 py-6 text-center">
        <div className="mb-4 flex items-center justify-center gap-8 text-[13px] font-medium text-white/40">
          <button className="transition-colors hover:text-white">Điều khoản</button>
          <button className="transition-colors hover:text-white">Bảo mật</button>
          <button className="transition-colors hover:text-white">Hỗ trợ</button>
        </div>
        <p className="text-[11px] font-medium text-white/20 uppercase tracking-widest">
          © 2026 CRAFTFLOW
        </p>
      </footer>
    </div>
  )
}
