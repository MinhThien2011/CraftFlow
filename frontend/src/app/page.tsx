"use client"

import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react"
import { useRouter } from "next/navigation"
import { Factory, User, Lock, Eye, EyeOff, HelpCircle, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { toast } from "sonner"

const createStarShadows = (count: number, maxWidth: number, maxHeight: number, color: string = '#FFF') => {
  let shadow = '';
  for (let i = 0; i < count; i++) {
    shadow += `${Math.floor(Math.random() * maxWidth)}px ${Math.floor(Math.random() * maxHeight)}px ${color}`;
    if (i < count - 1) shadow += ', ';
  }
  return shadow;
}

const CodeUniverseBackground = memo(({ isDark = false }: { isDark?: boolean }) => {
  const [shadows, setShadows] = useState({ small: '', medium: '', large: '' });
  const [lightParticles, setLightParticles] = useState<Array<{ x: number; y: number; size: number; duration: number }>>([]);

  useEffect(() => {
    const w = 3000;
    const h = 3000;
    setShadows({
      small: createStarShadows(300, w, h, isDark ? '#FFF' : '#7dd3fc'),
      medium: createStarShadows(100, w, h, isDark ? '#FFF' : '#38bdf8'),
      large: createStarShadows(30, w, h, isDark ? '#FFF' : '#0284c7'),
    });

    if (!isDark) {
      const particles = Array.from({ length: 20 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 60 + 40,
        duration: Math.random() * 10 + 15
      }));
      setLightParticles(particles);
    }
  }, [isDark]);

  const darkGradientStyle = useMemo(() => ({
    backgroundImage: `
      radial-gradient(circle at 20% 30%, rgba(147, 51, 234, 0.25) 0%, transparent 40%),
      radial-gradient(circle at 80% 70%, rgba(37, 99, 235, 0.25) 0%, transparent 50%),
      radial-gradient(circle at 50% 50%, rgba(219, 39, 119, 0.2) 0%, transparent 60%),
      radial-gradient(ellipse at 30% 60%, rgba(0, 0, 0, 0.8) 0%, transparent 40%)
    `
  }), []);

  if (isDark) {
    return (
      <div className="absolute inset-[-50%] overflow-hidden bg-[#050505] pointer-events-none will-change-transform">
        <div className="absolute inset-0 opacity-60 mix-blend-screen" style={darkGradientStyle} />
        <div className="absolute w-[1px] h-[1px] bg-transparent animate-pulse" style={{ boxShadow: shadows.small, animationDuration: '3s', left: '-500px', top: '-500px', willChange: 'opacity' }} />
        <div className="absolute w-[2px] h-[2px] bg-transparent animate-pulse" style={{ boxShadow: shadows.medium, animationDuration: '4s', left: '-500px', top: '-500px', willChange: 'opacity' }} />
        <div className="absolute w-[3px] h-[3px] bg-transparent animate-pulse" style={{ boxShadow: shadows.large, animationDuration: '5s', left: '-500px', top: '-500px', willChange: 'opacity' }} />
      </div>
    );
  }

  return (
    <div className="absolute inset-[-50%] overflow-hidden bg-gradient-to-b from-[#38bdf8] via-[#7dd3fc] to-[#e0f2fe] pointer-events-none will-change-transform">
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-50px) translateX(30px) scale(1.2); opacity: 0.8; }
        }
        .animate-float-particle {
          animation: float-particle ease-in-out infinite;
        }
        @keyframes cloud-pan {
          0% { transform: translateX(-15%) translateY(2%); }
          50% { transform: translateX(10%) translateY(-2%); }
          100% { transform: translateX(-15%) translateY(2%); }
        }
        @keyframes cloud-pan-reverse {
          0% { transform: translateX(10%) translateY(-2%); }
          50% { transform: translateX(-15%) translateY(2%); }
          100% { transform: translateX(10%) translateY(-2%); }
        }
        .animate-cloud-pan {
          animation: cloud-pan 45s ease-in-out infinite;
        }
        .animate-cloud-pan-reverse {
          animation: cloud-pan-reverse 55s ease-in-out infinite;
        }
      `}} />
      <div
        className="absolute inset-0 opacity-80 animate-cloud-pan"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 1200px 800px at 20% 30%, rgba(255, 255, 255, 0.9) 0%, transparent 55%),
            radial-gradient(ellipse 1000px 700px at 80% 20%, rgba(255, 255, 255, 0.8) 0%, transparent 60%),
            radial-gradient(ellipse 1100px 800px at 50% 80%, rgba(255, 255, 255, 0.8) 0%, transparent 60%)
          `
        }}
      />

      <div
        className="absolute inset-0 opacity-90 animate-cloud-pan-reverse"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 900px 600px at 10% 70%, rgba(255, 255, 255, 0.9) 0%, transparent 60%),
            radial-gradient(ellipse 1000px 600px at 90% 80%, rgba(255, 255, 255, 0.9) 0%, transparent 60%),
            radial-gradient(ellipse 800px 500px at 40% 40%, rgba(255, 255, 255, 0.7) 0%, transparent 50%)
          `
        }}
      />

      {lightParticles.map((particle, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white blur-xl animate-float-particle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${i * 0.5}s`
          }}
        />
      ))}

      <div className="absolute w-[1px] h-[1px] bg-transparent animate-pulse" style={{ boxShadow: shadows.small, animationDuration: '3s', left: '-500px', top: '-500px', willChange: 'opacity', opacity: 0.6 }} />
      <div className="absolute w-[2px] h-[2px] bg-transparent animate-pulse" style={{ boxShadow: shadows.medium, animationDuration: '4s', left: '-500px', top: '-500px', willChange: 'opacity', opacity: 0.7 }} />
      <div className="absolute w-[3px] h-[3px] bg-transparent animate-pulse" style={{ boxShadow: shadows.large, animationDuration: '5s', left: '-500px', top: '-500px', willChange: 'opacity', opacity: 0.8 }} />
    </div>
  );
});

CodeUniverseBackground.displayName = 'CodeUniverseBackground';

export default function LoginPage() {
  const router = useRouter()
  const { login, loading: authLoading, isAuthenticated, role } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  const loginInFlight = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const backgroundRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<number>(0)
  const xRef = useRef(0)
  const yRef = useRef(0)
  const lastUpdateTime = useRef(0)

  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark')
      setIsDarkMode(isDark)
    }

    checkDarkMode()

    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  const getHomeByRole = useCallback((userRole: string) => {
    if (userRole === "kho_manager") return "/dashboard_warehouse"
    if (userRole === "production_manager") return "/production-management/dashboard"
    if (userRole === "staff") return "/staff/tasks"
    return "/dashboard"
  }, [])

  useEffect(() => {
    if (isAuthenticated && role) {
      router.push(getHomeByRole(role))
    }
  }, [isAuthenticated, role, router, getHomeByRole])

  const updateMousePosition = useCallback(() => {
    const now = performance.now()

    if (now - lastUpdateTime.current < 16) {
      requestRef.current = requestAnimationFrame(updateMousePosition)
      return
    }

    lastUpdateTime.current = now

    if (backgroundRef.current) {
      backgroundRef.current.style.transform = `translateZ(-100px) translate(${xRef.current * 30}px, ${yRef.current * 30}px) scale(1.1)`
    }

    if (mainRef.current) {
      mainRef.current.style.transform = `translateZ(0) translate(${xRef.current * -15}px, ${yRef.current * -15}px) rotateX(${yRef.current * 4}deg) rotateY(${xRef.current * -4}deg)`
    }

    requestRef.current = 0
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e
    const { innerWidth, innerHeight } = window

    xRef.current = (clientX / innerWidth - 0.5) * 2
    yRef.current = (clientY / innerHeight - 0.5) * 2

    if (!requestRef.current) {
      requestRef.current = requestAnimationFrame(updateMousePosition)
    }
  }, [updateMousePosition])

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [])

  const handleLogin = useCallback(async (e: React.FormEvent) => {
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
  }, [isLoading, username, password, login])

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev)
  }, [])

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => !prev)
    if (isDarkMode) {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
  }, [isDarkMode])

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`relative flex min-h-screen flex-col overflow-hidden [perspective:1200px] ${isDarkMode
        ? '!bg-[#050505]'
        : '!bg-[#bae6fd]'
        }`}
    >
      <div
        ref={backgroundRef}
        className="pointer-events-none absolute inset-0 z-0 will-change-transform"
        style={{
          transform: 'translateZ(-100px) scale(1.1)',
          transition: 'transform 0.1s ease-out'
        }}
      >
        <CodeUniverseBackground isDark={isDarkMode} />
      </div>

      {!isDarkMode && (
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-white/30 via-transparent to-sky-100/20" />
      )}

      <header className="relative z-20 p-2 flex justify-between items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          className={`rounded-full backdrop-blur-md border transition-colors duration-200 shadow-sm ${isDarkMode
            ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
            : 'bg-white/80 hover:bg-sky-50 border-sky-100/80 text-sky-600'
            }`}
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={`rounded-full backdrop-blur-md border transition-colors duration-200 shadow-sm ${isDarkMode
            ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
            : 'bg-white/80 hover:bg-sky-50 border-sky-100/80 text-sky-600'
            }`}
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </header>

      <main
        ref={mainRef}
        className="relative z-20 flex flex-1 items-center justify-center px-4 py-4 will-change-transform"
        style={{
          transform: 'translateZ(0)',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.05s ease-out'
        }}
      >
        <div className="w-full max-w-md">
          <div
            className={`relative overflow-hidden rounded-3xl border p-8 backdrop-blur-2xl transition-all duration-300 will-change-[box-shadow] ${isDarkMode
              ? 'border-white/10 bg-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] hover:shadow-[0_25px_70px_rgba(251,207,232,0.2)]'
              : 'border-white/60 bg-white/80 shadow-[0_20px_60px_rgba(2,132,199,0.15)] hover:shadow-[0_25px_70px_rgba(2,132,199,0.2)]'
              }`}
            style={{ transform: 'translateZ(30px)' }}
          >
            <div className={`absolute inset-0 rounded-3xl border pointer-events-none ${isDarkMode ? 'border-white/5' : 'border-white/60'
              }`} style={{ mixBlendMode: 'overlay' }} />
            <div className={`absolute inset-0 bg-gradient-to-br pointer-events-none ${isDarkMode ? 'from-white/10 to-transparent' : 'from-sky-50/40 via-white/20 to-blue-50/30'
              }`} />

            {!isDarkMode && (
              <>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sky-200/20 to-transparent rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-blue-200/15 to-transparent rounded-full blur-3xl pointer-events-none" />
              </>
            )}

            <div className="relative z-20">
              <div className="mb-8 flex flex-col items-center">
                <div className="animate-float mb-5 relative will-change-transform">
                  <div className={`relative flex h-20 w-20 items-center justify-center rounded-2xl border backdrop-blur-md ${isDarkMode
                    ? 'border-pink-300/40 bg-gradient-to-br from-pink-400/15 to-rose-400/10 shadow-[0_0_30px_rgba(251,207,232,0.25)]'
                    : 'border-sky-200/60 bg-gradient-to-br from-white via-sky-50 to-blue-100/50 shadow-[0_8px_32px_rgba(56,189,248,0.25)]'
                    }`}>
                    <Factory className={`h-10 w-10 ${isDarkMode
                      ? 'text-pink-200 drop-shadow-[0_0_12px_rgba(251,207,232,0.9)]'
                      : 'text-sky-600 drop-shadow-[0_2px_8px_rgba(14,165,233,0.5)]'
                      }`} />
                  </div>
                  <div className={`absolute -bottom-5 left-1/2 h-2 w-12 -translate-x-1/2 rounded-[100%] blur-md ${isDarkMode ? 'bg-pink-400/35' : 'bg-sky-300/30'
                    }`} />
                </div>

                <h1 className={`bg-gradient-to-r bg-clip-text text-3xl font-black tracking-widest text-transparent drop-shadow-sm ${isDarkMode
                  ? 'from-pink-200 to-rose-200'
                  : 'from-sky-700 via-blue-700 to-cyan-700'
                  }`}>
                  CRAFTFLOW
                </h1>
                <p className={`mt-2 text-sm font-medium ${isDarkMode ? 'text-white/50' : 'text-slate-600'
                  }`}>
                  Hệ thống quản lý sản xuất & kho
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username" className={`text-[11px] font-bold uppercase tracking-widest ml-1 ${isDarkMode ? 'text-white/60' : 'text-slate-600'
                    }`}>
                    Tài khoản
                  </Label>
                  <div className="relative group">
                    <User className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors duration-200 ${isDarkMode
                      ? 'text-white/60 group-focus-within:text-pink-300'
                      : 'text-sky-400 group-focus-within:text-sky-600'
                      }`} />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Nhập tên đăng nhập"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={`h-14 rounded-xl pl-12 text-base shadow-sm transition-all duration-200 ${isDarkMode
                        ? 'border-white/5 bg-white/5 text-white placeholder:text-white/20 focus:border-pink-300/50 focus:bg-white/10 focus:ring-0'
                        : 'border-sky-100 bg-gradient-to-br from-white to-sky-50/30 text-slate-800 placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100'
                        }`}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className={`text-[11px] font-bold uppercase tracking-widest ml-1 ${isDarkMode ? 'text-white/60' : 'text-slate-600'
                    }`}>
                    Mật khẩu
                  </Label>
                  <div className="relative group">
                    <Lock className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors duration-200 ${isDarkMode
                      ? 'text-white/60 group-focus-within:text-pink-300'
                      : 'text-sky-400 group-focus-within:text-sky-600'
                      }`} />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`h-14 rounded-xl pl-12 pr-12 text-base shadow-sm transition-all duration-200 ${isDarkMode
                        ? 'border-white/5 bg-white/5 text-white placeholder:text-white/20 focus:border-pink-300/50 focus:bg-white/10 focus:ring-0'
                        : 'border-sky-100 bg-gradient-to-br from-white to-sky-50/30 text-slate-800 placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100'
                        }`}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-200 focus:outline-none ${isDarkMode
                        ? 'text-white/35 hover:text-pink-200'
                        : 'text-sky-400 hover:text-sky-600'
                        }`}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      className={`text-[13px] font-medium transition-colors duration-200 hover:underline ${isDarkMode
                        ? 'text-white/50 hover:text-pink-200'
                        : 'text-slate-500 hover:text-sky-600'
                        }`}
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className={`group relative mt-6 h-14 w-full overflow-hidden rounded-xl text-base font-bold text-white transition-all duration-200 hover:scale-[1.02] disabled:opacity-70 will-change-transform ${isDarkMode
                    ? 'bg-gradient-to-r from-pink-400 to-rose-400 shadow-[0_4px_20px_rgba(251,207,232,0.4)] hover:shadow-[0_8px_30px_rgba(251,207,232,0.6)] border border-white/10'
                    : 'bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500 shadow-[0_8px_24px_rgba(56,189,248,0.35)] hover:shadow-[0_12px_32px_rgba(56,189,248,0.5)] hover:from-sky-600 hover:via-blue-600 hover:to-cyan-600 border border-sky-200/40'
                    }`}
                  disabled={isLoading}
                >
                  <span className="relative z-10">{isLoading ? "Đang xử lý..." : "Đăng nhập ngay"}</span>
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 group-hover:translate-x-full will-change-transform" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-20 py-3 text-center">
        <div className={`mb-2 flex items-center justify-center gap-8 text-[13px] font-medium ${isDarkMode ? 'text-white/40' : 'text-slate-500'
          }`}>
          <button className={`transition-colors duration-200 ${isDarkMode ? 'hover:text-white' : 'hover:text-sky-600'
            }`}>Điều khoản</button>
          <button className={`transition-colors duration-200 ${isDarkMode ? 'hover:text-white' : 'hover:text-sky-600'
            }`}>Bảo mật</button>
          <button className={`transition-colors duration-200 ${isDarkMode ? 'hover:text-white' : 'hover:text-sky-600'
            }`}>Hỗ trợ</button>
        </div>
        <p className={`text-[11px] font-medium uppercase tracking-widest ${isDarkMode ? 'text-white/20' : 'text-slate-400'
          }`}>
          © 2026 CRAFTFLOW
        </p>
      </footer>
    </div>
  )
}
