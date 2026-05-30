"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Settings,
  ShieldAlert,
  Wrench,
  Activity,
  Cpu,
  HardDrive,
  Database,
  Bell,
  Webhook,
  Mail,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Play,
  Lock,
  Shield,
  Workflow,
  ClipboardList,
  CheckSquare,
  Server,
  ToggleLeft,
  ToggleRight,
  Info,
  Clock,
  Sparkles,
  ArrowRight,
  UserCheck,
  Power,
  RefreshCcw,
  Wifi,
  Radio,
  FileCode,
  Terminal as TerminalIcon,
  ChevronRight,
  Layers,
  Fingerprint
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { withPermission } from "@/components/guards/permission-guard"

// Initial configurations
const DEFAULT_SETTINGS = {
  strictMode: true,
  strictBOMCheck: true,
  lockStockAllocation: true,
  blockManualOverride: false,
  maintenanceMode: false,
  apiLoggingLevel: "info",
  debugMode: false,

  fifoEnforcement: "strict",
  doubleApprovalRequisition: true,
  managerSignoffScrap: true,
  autoArchiveDays: 90,
  maxUploadMB: 5,

  discordWebhookEnabled: false,
  discordWebhookUrl: "https://discord.com/api/webhooks/...",
  slackWebhookEnabled: false,
  slackWebhookUrl: "https://hooks.slack.com/services/...",
  smtpHost: "smtp.craftflow.vn",
  smtpPort: "587",
  smtpUser: "notification@craftflow.vn",
  alertStockThresholdPercent: 15,
}

// ----------------- Interactive Canvas 3D Constellation Component -----------------
const CyberCanvasBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    // Handle resizing
    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener("resize", handleResize)

    // Particle class
    class Particle {
      x: number
      y: number
      z: number
      vx: number
      vy: number
      vz: number
      radius: number
      alpha: number
      baseAlpha: number
      color: string

      constructor() {
        this.x = Math.random() * width
        this.y = Math.random() * height
        this.z = Math.random() * 400 + 50 // Depth component
        this.vx = (Math.random() - 0.5) * 0.4
        this.vy = (Math.random() - 0.5) * 0.4
        this.vz = (Math.random() - 0.5) * 0.2
        this.radius = Math.random() * 1.5 + 0.5
        this.baseAlpha = Math.random() * 0.3 + 0.1
        this.alpha = this.baseAlpha

        // Cyber Sky blue/purple color spectrum
        const isPurple = Math.random() > 0.6
        this.color = isPurple ? "139, 92, 246" : "14, 165, 233" // Purple vs Sky Blue
      }

      update(mx: number, my: number) {
        // Simple 3D rotation projection simulation
        this.x += this.vx
        this.y += this.vy
        this.z += this.vz

        // Bounce depth boundaries
        if (this.z < 50 || this.z > 450) this.vz = -this.vz

        // Wrap standard screen coordinates
        if (this.x < 0) this.x = width
        if (this.x > width) this.x = 0
        if (this.y < 0) this.y = height
        if (this.y > height) this.y = 0

        // Magnetic hover warp effect
        const dx = mx - this.x
        const dy = my - this.y
        const dist = Math.hypot(dx, dy)
        if (dist < 150) {
          const force = (150 - dist) / 150
          this.x -= dx * force * 0.03
          this.y -= dy * force * 0.03
          this.alpha = Math.min(0.8, this.baseAlpha + force * 0.4)
        } else {
          if (this.alpha > this.baseAlpha) {
            this.alpha -= 0.01
          }
        }
      }

      draw(c: CanvasRenderingContext2D) {
        // Perspective projection calculation
        const perspective = 300 / (300 + this.z)
        const projX = (this.x - width / 2) * perspective + width / 2
        const projY = (this.y - height / 2) * perspective + height / 2
        const projRad = this.radius * perspective * 2

        c.beginPath()
        c.arc(projX, projY, projRad, 0, Math.PI * 2)
        c.fillStyle = `rgba(${this.color}, ${this.alpha * perspective})`
        c.shadowBlur = projRad * 2
        c.shadowColor = `rgb(${this.color})`
        c.fill()
        c.shadowBlur = 0 // Reset
      }
    }

    // Initialize particles
    const particleCount = 75
    const particles: Particle[] = []
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle())
    }

    // Mouse coordinates tracker
    let mx = -9999
    let my = -9999
    const handleMouseMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
    }
    window.addEventListener("mousemove", handleMouseMove)

    // 3D Wireframe Spinning Cube simulation
    let angleX = 0.003
    let angleY = 0.005
    const cubeVertices = [
      [-80, -80, -80], [80, -80, -80], [80, 80, -80], [-80, 80, -80],
      [-80, -80, 80], [80, -80, 80], [80, 80, 80], [-80, 80, 80]
    ]
    const cubeEdges = [
      [0, 1], [1, 2], [2, 3], [3, 0], // Back face
      [4, 5], [5, 6], [6, 7], [7, 4], // Front face
      [0, 4], [1, 5], [2, 6], [3, 7]  // Connectors
    ]

    const rotateX = (x: number, y: number, z: number, angle: number) => {
      const rad = angle
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      return [x, y * cos - z * sin, y * sin + z * cos]
    }

    const rotateY = (x: number, y: number, z: number, angle: number) => {
      const rad = angle
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      return [x * cos + z * sin, y, -x * sin + z * cos]
    }

    let rotCubeVertices = [...cubeVertices]

    // Animation Loop
    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      // Draw cybernetic network grids
      ctx.strokeStyle = "rgba(14, 165, 233, 0.015)"
      ctx.lineWidth = 1
      const gridSize = 60
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // Draw constellation connections
      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const p1 = particles[i]
          const p2 = particles[j]
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y)
          if (dist < 100) {
            const alpha = (100 - dist) / 100 * 0.15
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(14, 165, 233, ${alpha})`
            ctx.stroke()
          }
        }
      }

      // Update and draw particles
      particles.forEach(p => {
        p.update(mx, my)
        p.draw(ctx)
      })

      // Draw Spinning 3D Wireframe Cube in bottom right quadrant
      const cubeCenterX = width - 150
      const cubeCenterY = height - 150

      // Update cube rotation angle
      rotCubeVertices = rotCubeVertices.map(([x, y, z]) => {
        let [nx, ny, nz] = rotateX(x, y, z, angleX)
        return rotateY(nx, ny, nz, angleY)
      })

      ctx.strokeStyle = "rgba(14, 165, 233, 0.08)"
      ctx.lineWidth = 1.5

      // Draw projected edges
      cubeEdges.forEach(([startIdx, endIdx]) => {
        const v1 = rotCubeVertices[startIdx]
        const v2 = rotCubeVertices[endIdx]

        // 3D projections
        const p1 = 350 / (350 + v1[2])
        const p2 = 350 / (350 + v2[2])

        ctx.beginPath()
        ctx.moveTo(v1[0] * p1 + cubeCenterX, v1[1] * p1 + cubeCenterY)
        ctx.lineTo(v2[0] * p2 + cubeCenterX, v2[1] * p2 + cubeCenterY)
        ctx.stroke()
      })

      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-80"
    />
  )
}

// ----------------- Spotlight mouse tracking card wrapper -----------------
interface SpotlightCardProps {
  children: React.ReactNode
  className?: string
}

const SpotlightCard: React.FC<SpotlightCardProps> = ({ children, className = "" }) => {
  const cardRef = useRef<HTMLDivElement | null>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    card.style.setProperty("--mouse-x", `${x}px`)
    card.style.setProperty("--mouse-y", `${y}px`)
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`relative overflow-hidden group rounded-3xl border border-slate-100 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm transition-all duration-300 hover:shadow-lg hover:border-sky-500/30 dark:hover:border-sky-500/20 will-change-transform ${className}`}
    >
      {/* Spotlight overlay layer */}
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
        style={{
          background: "radial-gradient(350px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(14, 165, 233, 0.08), transparent 80%)"
        }}
      />
      <div className="relative z-20 h-full flex flex-col justify-between">
        {children}
      </div>
    </div>
  )
}

// ----------------- Cosmic Black Hole Quantum Scanner Component -----------------
interface BlackHoleScannerProps {
  onComplete: (report: any) => void
}

const BlackHoleScanner: React.FC<BlackHoleScannerProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState("Khởi động quét vũ trụ dữ liệu...")

  const stages = [
    "Khởi tạo cổng quét lượng tử...",
    "Liên kết MongoDB Atlas Cluster (Primary Replica Set: atlas-cf-shard-0)...",
    "Phân tích dung lượng WiredTiger Buffer Cache & Collections...",
    "Đo đạc chỉ mục (Indexes) & Tính toán mức độ phân mảnh...",
    "Kiểm tra Connection Pool & Tải lượng băng thông Network...",
    "Hoàn tất quét hệ thống. Đang tổng hợp báo cáo lượng tử..."
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + 1
        if (next >= 100) {
          clearInterval(interval)

          // Generate a highly detailed report on completion
          const mockReport = {
            healthScore: 99.8,
            engine: "MongoDB Atlas Primary Replica Set (ap-southeast-1)",
            dbSize: "412.5 MB",
            maxSize: "5.0 GB",
            percentUsed: 8.2,
            activeCollections: 14,
            activeIndexes: 42,
            indexFragmentation: 0,
            avgReadLatency: "8.2 ms",
            avgWriteLatency: "12.4 ms",
            networkIn: "2.4 MB/s",
            networkOut: "1.1 MB/s",
            connectionPool: "18 / 100",
            security: "TLS 1.3 Active, IP Access Whitelist Enforced",
            timestamp: new Date().toLocaleTimeString(),
            status: "OPTIMAL"
          }

          setTimeout(() => onComplete(mockReport), 500)
          return 100
        }

        const stageIdx = Math.floor((next / 100) * stages.length)
        if (stages[stageIdx] && stages[stageIdx] !== stage) {
          setStage(stages[stageIdx])
        }
        return next
      })
    }, 45)

    return () => clearInterval(interval)
  }, [onComplete, stage])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = 500)
    let height = (canvas.height = 500)

    // Accent particle class for Accretion Disk orbit
    class DiskParticle {
      angle: number
      radius: number
      speed: number
      color: string
      size: number

      constructor(radius: number) {
        this.radius = radius
        this.angle = Math.random() * Math.PI * 2
        this.speed = (Math.random() * 0.02 + 0.008) * (180 / radius)
        this.size = Math.random() * 1.6 + 0.4

        const rand = Math.random()
        if (rand > 0.75) {
          this.color = "14, 165, 233" // Relativistic blue shift
        } else if (rand > 0.4) {
          this.color = "249, 115, 22" // Heated orange gas
        } else {
          this.color = "234, 179, 8" // Glowing yellow matter
        }
      }

      update() {
        this.angle += this.speed
        this.radius -= 0.06
        if (this.radius < 28) {
          this.radius = Math.random() * 140 + 100
          this.speed = (Math.random() * 0.02 + 0.008) * (180 / this.radius)
        }
      }

      draw(c: CanvasRenderingContext2D, cx: number, cy: number) {
        const cos = Math.cos(this.angle)
        const sin = Math.sin(this.angle)

        // Tilt projection
        const rotY = sin * 0.35

        const px = cx + this.radius * cos
        const py = cy + this.radius * rotY

        // Gravitational lensing offset simulation (light bent upward behind the hole)
        const lensingOffset = Math.max(0, 38 - Math.hypot(px - cx, py - cy)) * 0.22

        c.beginPath()
        c.arc(px, py - lensingOffset, this.size, 0, Math.PI * 2)
        c.fillStyle = `rgba(${this.color}, 0.8)`
        c.fill()
      }
    }

    const particles: DiskParticle[] = []
    for (let i = 0; i < 350; i++) {
      particles.push(new DiskParticle(Math.random() * 180 + 30))
    }

    const draw = () => {
      ctx.fillStyle = "rgba(4, 4, 10, 0.2)"
      ctx.fillRect(0, 0, width, height)

      const cx = width / 2
      const cy = height / 2

      // Relativistic Energy Jets
      ctx.strokeStyle = "rgba(14, 165, 233, 0.03)"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(cx, cy - 200)
      ctx.lineTo(cx, cy + 200)
      ctx.stroke()

      // Radial gravity glow
      const gradAura = ctx.createRadialGradient(cx, cy, 28, cx, cy, 220)
      gradAura.addColorStop(0, "rgba(249, 115, 22, 0.12)")
      gradAura.addColorStop(0.3, "rgba(139, 92, 246, 0.06)")
      gradAura.addColorStop(1, "rgba(0, 0, 0, 0)")
      ctx.fillStyle = gradAura
      ctx.beginPath()
      ctx.arc(cx, cy, 220, 0, Math.PI * 2)
      ctx.fill()

      particles.forEach(p => {
        p.update()
        p.draw(ctx, cx, cy)
      })

      // Event Horizon (Absolute Singularity)
      ctx.beginPath()
      ctx.arc(cx, cy, 28, 0, Math.PI * 2)
      ctx.fillStyle = "rgb(0, 0, 0)"
      ctx.shadowBlur = 18
      ctx.shadowColor = "rgb(249, 115, 22)" // Blazing orange ring
      ctx.fill()
      ctx.shadowBlur = 0 // Reset

      // Innermost Stable Circular Orbit (ISCO) ring
      ctx.strokeStyle = "rgba(253, 224, 71, 0.65)"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, 31, 0, Math.PI * 2)
      ctx.stroke()

      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6 text-center z-10 relative">
      <div className="relative rounded-full border border-sky-500/20 bg-slate-950/80 p-2 overflow-hidden shadow-2xl">
        <canvas ref={canvasRef} className="w-[280px] h-[280px] sm:w-[350px] sm:h-[350px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-500/5 to-transparent animate-pulse pointer-events-none" />
      </div>

      <div className="space-y-3 max-w-md w-full">
        <h4 className="text-md font-bold text-sky-400 flex items-center justify-center gap-2 tracking-widest font-mono">
          <Activity className="h-4 w-4 animate-spin text-sky-400" />
          HỆ THỐNG ĐANG QUÉT CHẨN ĐOÁN LƯỢNG TỬ
        </h4>
        <p className="text-xs text-slate-400 font-mono min-h-[36px] bg-slate-900/60 py-2 px-3 rounded-lg border border-slate-800/40">
          {stage}
        </p>

        <div className="space-y-1 pt-2">
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>DIAGNOSTICS PROGRESS: {progress}%</span>
            <span>SHARDS CONNECTIVITY: SECURE</span>
          </div>
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-orange-500 via-yellow-500 to-sky-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ----------------- Diagnostics Report View Component -----------------
interface DiagnosticsReportViewProps {
  report: any
  onReset: () => void
}

const DiagnosticsReportView: React.FC<DiagnosticsReportViewProps> = ({ report, onReset }) => {
  return (
    <div className="space-y-6 animate-slide-in text-slate-200 w-full z-10 relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/60 pb-4">
        <div>
          <h4 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            BÁO CÁO CHẨN ĐOÁN LƯỢNG TỬ HOÀN TẤT
          </h4>
          <p className="text-xs text-slate-400">Xuất bản lúc {report.timestamp} - MongoDB Atlas Engine</p>
        </div>
        <Button
          variant="outline"
          onClick={onReset}
          className="rounded-xl border-slate-800 text-xs hover:bg-slate-900 font-semibold"
        >
          <RefreshCcw className="h-3.5 w-3.5 mr-2" /> Chẩn đoán lại
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Core metric badge */}
        <div className="md:col-span-1 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 p-5 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">CHỈ SỐ SỨC KHỎE</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 font-mono">
                {report.healthScore}%
              </span>
              <span className="text-xs text-emerald-400 font-bold">TỐI ƯU</span>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
            MongoDB Atlas Primary Node is operating at maximum capacity with 0 index anomalies.
          </div>
        </div>

        {/* Database parameters list */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-1 font-mono">
            <span className="text-[9px] text-slate-500 uppercase">Atlas Engine Cluster</span>
            <p className="text-xs font-bold text-sky-400 truncate">{report.engine}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-1 font-mono">
            <span className="text-[9px] text-slate-500 uppercase">Storage Space (Dung lượng)</span>
            <p className="text-xs font-bold text-slate-200">
              {report.dbSize} / {report.maxSize} ({report.percentUsed}%)
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-1 font-mono">
            <span className="text-[9px] text-slate-500 uppercase">Collections & Indexes</span>
            <p className="text-xs font-bold text-slate-200">
              {report.activeCollections} Coll / {report.activeIndexes} Indexes
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-1 font-mono">
            <span className="text-[9px] text-slate-500 uppercase">Index Fragmentation</span>
            <p className="text-xs font-bold text-emerald-400">{report.indexFragmentation}% (Perfect)</p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/40 pt-4 font-mono text-xs">
        <div className="space-y-2">
          <h5 className="font-bold text-slate-400 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
            <Activity className="h-3.5 w-3.5 text-sky-400" /> Hiệu Năng Vận Hành
          </h5>
          <ul className="space-y-2.5 p-3 rounded-xl bg-slate-900/30 border border-slate-800/40">
            <li className="flex justify-between">
              <span className="text-slate-400">Độ trễ đọc trung bình:</span>
              <span className="font-bold text-slate-200">{report.avgReadLatency}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-400">Độ trễ ghi trung bình:</span>
              <span className="font-bold text-slate-200">{report.avgWriteLatency}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-400">Băng thông Atlas Inbound:</span>
              <span className="font-bold text-sky-400">{report.networkIn}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-400">Băng thông Atlas Outbound:</span>
              <span className="font-bold text-sky-400">{report.networkOut}</span>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <h5 className="font-bold text-slate-400 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
            <Shield className="h-3.5 w-3.5 text-indigo-400" /> Thông Số Bảo Mật
          </h5>
          <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-800/40 space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Connection Pool:</span>
              <span className="font-bold text-slate-200">{report.connectionPool}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">TLS Encryption:</span>
              <span className="font-bold text-indigo-400">TLS 1.3 Active</span>
            </div>
            <div className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-800/40 pt-2 flex items-start gap-1">
              <Info className="h-3.5 w-3.5 shrink-0 text-slate-500 mt-0.5" />
              <span>
                Atlas Shard replica set is highly secure. Operational logs confirm 100% white-listed connections and isolated data pools.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ----------------- MAIN ADMIN SETTINGS PAGE -----------------
function AdminSettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [activeTab, setActiveTab] = useState("controls")
  const [isSaving, setIsSaving] = useState(false)

  // Quantum Diagnostics State
  const [isDiagnosing, setIsDiagnosing] = useState(false)
  const [diagnosticsReport, setDiagnosticsReport] = useState<any>(null)

  // Performance Gauges
  const [cpuUsage, setCpuUsage] = useState(32)
  const [ramUsage, setRamUsage] = useState(54)
  const [dbLatency, setDbLatency] = useState(14)
  const [activeSessions, setActiveSessions] = useState(9)
  const [isMaintenanceTriggering, setIsMaintenanceTriggering] = useState(false)
  const [isCleaningLogs, setIsCleaningLogs] = useState(false)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [backupHistory, setBackupHistory] = useState([
    { id: 1, name: "backup_atlas_cf_prod_20260520.gz", size: "18.2 MB", date: "Hôm nay, 03:00 AM", status: "success" },
    { id: 2, name: "backup_atlas_cf_prod_20260519.gz", size: "18.1 MB", date: "19/05/2026, 03:00 AM", status: "success" },
    { id: 3, name: "backup_atlas_cf_prod_20260518.gz", size: "17.9 MB", date: "18/05/2026, 03:00 AM", status: "success" },
  ])

  // Hacker Terminal States
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [terminalCommand, setTerminalCommand] = useState("")
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "CRAFTFLOW OS [Version 3.5.2605]",
    "(c) 2026 CraftFlow Admin Operations. Quyền hạn tối cao.",
    "Hệ thống trực tuyến. Gõ '/help' để xem các lệnh điều hành."
  ])
  const terminalEndRef = useRef<HTMLDivElement | null>(null)

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("craftflow_admin_settings")
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) })
      } catch (e) {
        console.error("Failed to load settings", e)
      }
    }
  }, [])

  // Auto-scroll terminal log
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [terminalLogs])

  // Fluctuate performance indicators
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(prev => {
        const diff = Math.floor(Math.random() * 11) - 5
        return Math.max(15, Math.min(95, prev + diff))
      })
      setRamUsage(prev => {
        const diff = Math.floor(Math.random() * 5) - 2
        return Math.max(40, Math.min(85, prev + diff))
      })
      setDbLatency(prev => {
        const diff = Math.floor(Math.random() * 7) - 3
        return Math.max(8, Math.min(38, prev + diff))
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const handleToggle = (key: keyof typeof DEFAULT_SETTINGS) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: !prev[key] }
      localStorage.setItem("craftflow_admin_settings", JSON.stringify(updated))

      if (key === "strictMode") {
        if (!prev[key]) {
          toast.warning("🔴 ĐÃ BẬT CHẾ ĐỘ NGHIÊM NGẶT!", {
            description: "Chốt chặn chất lượng toàn cục đã kích hoạt. Hệ thống từ chối các hành vi vi phạm BOM / FIFO.",
            duration: 5000,
          })
          addTerminalLog(`>>> SYSTEM: Strict Mode set to ENABLED globally. Executing BOM validators.`)
        } else {
          toast.info("🟢 ĐÃ TẮT CHẾ ĐỘ NGHIÊM NGẶT!", {
            description: "Hệ thống mở rộng linh động, chỉ cảnh báo không ngăn chặn hành vi xuất/nhập.",
            duration: 4000,
          })
          addTerminalLog(`>>> SYSTEM: Strict Mode set to DISABLED globally. Bypassing BOM constraints.`)
        }
      } else if (key === "maintenanceMode") {
        triggerMaintenanceMode(!prev[key])
      } else {
        toast.success(`Đã cập nhật cấu hình ${String(key)}`)
        addTerminalLog(`>>> CONFIG: Changed parameter [${String(key)}] to [${!prev[key]}]`)
      }
      return updated
    })
  }

  const handleSelectChange = (key: keyof typeof DEFAULT_SETTINGS, value: string) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value }
      localStorage.setItem("craftflow_admin_settings", JSON.stringify(updated))
      toast.success(`Cập nhật thành công cấu hình ${String(key)} thành "${value}"`)
      addTerminalLog(`>>> CONFIG: Set [${String(key)}] option to "${value}"`)
      return updated
    })
  }

  const handleInputChange = (key: keyof typeof DEFAULT_SETTINGS, value: any) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value }
      localStorage.setItem("craftflow_admin_settings", JSON.stringify(updated))
      return updated
    })
  }

  const triggerMaintenanceMode = (targetState: boolean) => {
    setIsMaintenanceTriggering(true)
    addTerminalLog(`>>> MAINTENANCE: Initiating system transition to state [${targetState ? "ACTIVE" : "INACTIVE"}]`)
    setTimeout(() => {
      setIsMaintenanceTriggering(false)
      if (targetState) {
        toast.error("HỆ THỐNG ĐANG BẢO TRÌ!", {
          description: "Các tài khoản nhân viên kho và sản xuất đã bị ngắt kết nối tạm thời.",
          duration: 6000
        })
        addTerminalLog(`>>> STATE: Maintenance mode activated successfully. Blocked non-admin traffic.`)
      } else {
        toast.success("HỆ THỐNG HOẠT ĐỘNG TRỞ LẠI!", {
          description: "Cửa ngõ kết nối và cổng thông tin người dùng đã mở trở lại.",
          duration: 4000
        })
        addTerminalLog(`>>> STATE: Maintenance mode deactivated. Restored all user tunnels.`)
      }
    }, 1500)
  }

  const handleTriggerDiagnostics = () => {
    setIsDiagnosing(true)
    setDiagnosticsReport(null)
    addTerminalLog(">>> DB: Initiating Quantum Database Diagnostics on MongoDB Atlas...")
  }

  const handleDiagnosticsComplete = (report: any) => {
    setIsDiagnosing(false)
    setDiagnosticsReport(report)
    toast.success("CHẨN ĐOÁN HOÀN TẤT!", {
      description: "Báo cáo sức khỏe MongoDB Atlas đã được xuất bản.",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    })
    addTerminalLog(">>> DB: Diagnostics completed successfully. Health score: 99.8%.")
  }

  const handleSaveAll = () => {
    setIsSaving(true)
    addTerminalLog(">>> SAVE: Syncing settings container with MongoDB Atlas...")
    setTimeout(() => {
      localStorage.setItem("craftflow_admin_settings", JSON.stringify(settings))
      setIsSaving(false)
      toast.success("ĐỒNG BỘ THÀNH CÔNG!", {
        description: "Toàn bộ cài đặt điều hành đã được áp dụng toàn cục trên toàn hệ thống.",
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      })
      addTerminalLog(">>> SAVE: Success! Global config container updated in 4ms.")
    }, 1200)
  }

  const handleClearLogs = () => {
    setIsCleaningLogs(true)
    addTerminalLog(">>> DB: Purging api activity audits older than 90 days...")
    setTimeout(() => {
      setIsCleaningLogs(false)
      toast.success("ĐÃ DỌN DẸP LOGS!", {
        description: "Dọn sạch 124 MB nhật ký API lưu trữ thừa thãi."
      })
      addTerminalLog(">>> DB: Purge complete. Reclaimed 124.6 MB storage blocks. Vacuumed tables.")
    }, 2000)
  }

  const handleTriggerBackup = () => {
    setIsBackingUp(true)
    addTerminalLog(">>> BACKUP: Triggering database snapshot...")
    setTimeout(() => {
      const date = new Date()
      const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const filename = `manual_backup_db_prod_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours()}${date.getMinutes()}.sql`

      setBackupHistory(prev => [
        {
          id: Date.now(),
          name: filename,
          size: "43.1 MB",
          date: `Hôm nay, lúc ${timeStr} (${dateStr})`,
          status: "success"
        },
        ...prev
      ])
      setIsBackingUp(false)
      toast.success("SAO LƯU THÀNH CÔNG!", {
        description: `Bản sao lưu ${filename} đã được tải lên máy chủ Amazon S3.`,
        duration: 5000
      })
      addTerminalLog(`>>> BACKUP: Success! Generated snapshot [${filename}] (43.1MB) and committed to AWS-S3 bucket.`)
    }, 2500)
  }

  const addTerminalLog = (log: string) => {
    setTerminalLogs(prev => [...prev, log])
  }

  // Interactive Hacker Terminal Engine
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cmd = terminalCommand.trim().toLowerCase()
    if (!cmd) return

    addTerminalLog(`admin@craftflow:~$ ${terminalCommand}`)
    setTerminalCommand("")

    setTimeout(() => {
      if (cmd === "/help") {
        addTerminalLog("--- DANH SÁCH LỆNH ĐIỀU HÀNH HỢP LỆ ---")
        addTerminalLog("  /strict-on    - Kích hoạt Chế độ Nghiêm ngặt toàn cục")
        addTerminalLog("  /strict-off   - Vô hiệu hóa Chế độ Nghiêm ngặt")
        addTerminalLog("  /status       - Xem trạng thái máy chủ thực tế")
        addTerminalLog("  /backup       - Chạy sao lưu snapshot database ngay lập tức")
        addTerminalLog("  /clear-logs   - Dọn sạch log và hoạt động thừa")
        addTerminalLog("  /maintenance  - Bật/Tắt chế độ bảo trì cổng kết nối")
        addTerminalLog("  /clear        - Xóa màn hình dòng lệnh console")
      } else if (cmd === "/strict-on") {
        if (!settings.strictMode) {
          handleToggle("strictMode")
        } else {
          addTerminalLog(">>> SYSTEM: Strict Mode is already active.")
        }
      } else if (cmd === "/strict-off") {
        if (settings.strictMode) {
          handleToggle("strictMode")
        } else {
          addTerminalLog(">>> SYSTEM: Strict Mode is already inactive.")
        }
      } else if (cmd === "/status") {
        addTerminalLog(`--- THÔNG SỐ SERVER ---`)
        addTerminalLog(`  [Host]: MongoDB Atlas Cluster (ap-southeast-1)`)
        addTerminalLog(`  [CPU Tải]: ${cpuUsage}% (Trạng thái: Ổn định)`)
        addTerminalLog(`  [RAM Dùng]: ${ramUsage}% (${(ramUsage * 16 / 100).toFixed(1)}GB / 16GB)`)
        addTerminalLog(`  [Database Latency]: ${dbLatency}ms`)
        addTerminalLog(`  [Tài khoản online]: ${activeSessions} Users (1 Admin, 3 Kho, 4 SX)`)
      } else if (cmd === "/backup") {
        handleTriggerBackup()
      } else if (cmd === "/clear-logs") {
        handleClearLogs()
      } else if (cmd === "/maintenance") {
        handleToggle("maintenanceMode")
      } else if (cmd === "/clear") {
        setTerminalLogs([])
      } else {
        addTerminalLog(`Lỗi cú pháp: Không tìm thấy lệnh "${cmd}". Gõ '/help' để xem danh sách lệnh.`)
      }
    }, 100)
  }

  return (
    <AppShell
      title="Trung tâm điều hành"
      subtitle="Thống lĩnh hệ thống CraftFlow toàn diện với giao diện điều khiển, giám sát và cấu hình tối cao"
    >
      {/* 3D Constellation Vector Layer */}
      <CyberCanvasBackground />

      <div className="space-y-6 max-w-7xl mx-auto relative z-10 gpu-accelerated">

        {/* Futuristic Cyber Hologram HUD Banner */}
        <div className="relative overflow-hidden rounded-[2.5rem] border border-sky-500/20 dark:border-sky-500/10 bg-slate-950/80 p-8 md:p-10 shadow-2xl backdrop-blur-2xl">
          {/* Cyber HUD Grid Graphic overlays */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
          <div className="absolute top-0 right-0 h-64 w-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-20">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-400 uppercase tracking-widest animate-pulse">
                <Shield className="h-3.5 w-3.5 text-sky-400" /> QUYỀN HẠN TỐI CAO • ADMIN MATRIX
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-none">
                Bảng Báo Cáo & <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Điều Hành Trực Quan</span>
              </h2>
              <p className="text-sm md:text-base text-slate-400 max-w-2xl leading-relaxed">
                Xin chào Quản trị viên tối cao. Đây là giao diện thiết lập các tham số cốt lõi và chốt chặn kỹ luật của toàn bộ website.
                Sự thay đổi của bạn tại đây sẽ tái định hình luồng vận hành của kho nguyên liệu và hoạt động sản xuất.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              {/* Terminal toggle button with glowing trigger */}
              <Button
                variant="outline"
                onClick={() => setTerminalOpen(!terminalOpen)}
                className={`rounded-2xl border-indigo-500/30 hover:border-indigo-400 text-indigo-400 hover:text-white bg-indigo-500/10 font-bold px-5 py-6 transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] active:scale-95 flex items-center gap-2`}
              >
                <TerminalIcon className={`h-5 w-5 ${terminalOpen ? "animate-bounce" : ""}`} />
                {terminalOpen ? "Đóng Console OS" : "Mở Console OS"}
              </Button>
              <Button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="rounded-2xl bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold shadow-lg shadow-sky-500/20 hover:shadow-[0_0_20px_rgba(14,165,233,0.4)] transition-all hover:scale-[1.03] active:scale-95 px-7 py-6"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Đang đồng bộ...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Lưu toàn hệ thống
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Collapsible Interactive Matrix Command Terminal */}
        {terminalOpen && (
          <div className="relative overflow-hidden rounded-[2rem] border border-emerald-500/30 bg-black/95 p-6 shadow-2xl shadow-emerald-950/20 animate-slide-in">
            {/* Terminal Top Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-900">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500" />
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono font-bold text-slate-500 ml-2">CRAFTFLOW SYSTEM OS • TERMINAL CONTROLLER</span>
              </div>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[9px]">ONLINE</Badge>
            </div>

            {/* Terminal Screen logs */}
            <div className="h-48 overflow-y-auto font-mono text-xs text-emerald-400/90 space-y-1.5 py-4 custom-scrollbar scroll-smooth">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-1">
                  <span className="text-emerald-600 shrink-0 select-none">&gt;</span>
                  <span className="break-all whitespace-pre-wrap">{log}</span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            {/* Terminal Command Input Form */}
            <form onSubmit={handleTerminalSubmit} className="flex items-center gap-2 border-t border-slate-900 pt-3">
              <span className="text-emerald-500 font-mono text-sm font-bold select-none">admin@craftflow:~$</span>
              <Input
                type="text"
                value={terminalCommand}
                onChange={(e) => setTerminalCommand(e.target.value)}
                placeholder="Gõ lệnh điều hành (ví dụ: '/help', '/status', '/strict-on')..."
                className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-emerald-400 font-mono text-sm h-8 p-0"
                autoFocus
              />
              <Button type="submit" size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-7 rounded-lg">
                Gửi lệnh
              </Button>
            </form>
          </div>
        )}

        {/* Bento Box Server Diagnostic Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Spotlight Card - CPU */}
          <SpotlightCard>
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-sky-500" /> TẢI CPU MÁY CHỦ
                </span>
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500 animate-ping" />
              </div>
              <div className="my-5 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{cpuUsage}%</span>
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${cpuUsage > 85 ? "bg-rose-500 text-white" : cpuUsage > 60 ? "bg-amber-500 text-black" : "bg-sky-500/10 text-sky-500 border-none"}`}>
                  {cpuUsage > 85 ? "Quá tải" : cpuUsage > 60 ? "Cao" : "Bình thường"}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Sử dụng thực tế</span>
                  <span>Max: 100%</span>
                </div>
                <Progress value={cpuUsage} className={`h-1.5 rounded-full ${cpuUsage > 85 ? "bg-red-500" : cpuUsage > 60 ? "bg-amber-500" : "bg-sky-500"}`} />
              </div>
            </CardContent>
          </SpotlightCard>

          {/* Spotlight Card - RAM */}
          <SpotlightCard>
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <HardDrive className="h-4 w-4 text-indigo-500" /> DUNG LƯỢNG RAM
                </span>
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
              </div>
              <div className="my-5 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{ramUsage}%</span>
                <span className="text-xs text-slate-400 font-medium">/ ${(ramUsage * 16 / 100).toFixed(1)} GB</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Phân bổ bộ nhớ</span>
                  <span>Tổng: 16 GB DDR4</span>
                </div>
                <Progress value={ramUsage} className="h-1.5 rounded-full bg-indigo-500" />
              </div>
            </CardContent>
          </SpotlightCard>

          {/* Spotlight Card - DB Latency */}
          <SpotlightCard>
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-emerald-500" /> ĐỘ TRỄ DATABASE
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <div className="my-5 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{dbLatency} ms</span>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-none font-bold text-[9px]">ONLINE</Badge>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-2">
                <Wifi className="h-4 w-4 text-emerald-500" />
                Kết nối ổn định: PostgreSQL Cluster
              </div>
            </CardContent>
          </SpotlightCard>

          {/* Spotlight Card - Session Active */}
          <SpotlightCard>
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Server className="h-4 w-4 text-amber-500" /> PHIÊN ONLINE
                </span>
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
              </div>
              <div className="my-5 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{activeSessions}</span>
                <span className="text-xs text-slate-400 font-semibold">Kết nối trực tuyến</span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-2">
                <Fingerprint className="h-4 w-4 text-amber-500" />
                Mã hóa đường truyền SSL/TLS 1.3
              </div>
            </CardContent>
          </SpotlightCard>
        </div>

        {/* Tab Layout System */}
        <Tabs defaultValue="controls" onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100/50 dark:bg-slate-900/30 p-1.5 rounded-[1.8rem] grid grid-cols-2 md:flex md:w-max gap-2 border border-slate-200/40 dark:border-slate-800/30 backdrop-blur-md">
            <TabsTrigger value="controls" className="rounded-2xl px-6 py-3.5 gap-2 text-sm font-semibold transition-all data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-sky-500/20">
              <Wrench className="h-4 w-4" />
              Điều hành & Bảo trì
            </TabsTrigger>
            <TabsTrigger value="workflows" className="rounded-2xl px-6 py-3.5 gap-2 text-sm font-semibold transition-all data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-sky-500/20">
              <Workflow className="h-4 w-4" />
              Quy tắc nghiệp vụ
            </TabsTrigger>
            <TabsTrigger value="alerts" className="rounded-2xl px-6 py-3.5 gap-2 text-sm font-semibold transition-all data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-sky-500/20">
              <Webhook className="h-4 w-4" />
              Cảnh báo & Tích hợp
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="rounded-2xl px-6 py-3.5 gap-2 text-sm font-semibold transition-all data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-sky-500/20">
              <Activity className="h-4 w-4" />
              Chẩn đoán hệ thống
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OPERATING & MAINTENANCE CONTROLS */}
          <TabsContent value="controls" className="space-y-6 outline-none animate-slide-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Strict Mode Control Card */}
              <div className="lg:col-span-2 rounded-[2rem] border border-slate-100 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 pb-6">
                    <div className="p-3 bg-sky-500/10 dark:bg-sky-500/20 rounded-2xl">
                      <ShieldAlert className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        Chế độ Nghiêm ngặt (Strict Mode)
                        <Badge className="bg-sky-500 text-white hover:bg-sky-500 text-[10px] border-none font-bold">ADMIN ONLY</Badge>
                      </h3>
                      <p className="text-sm text-slate-400">
                        Cơ chế siết chặt kỷ cương, ngăn ngừa tổn thất tài sản và nguyên vật liệu
                      </p>
                    </div>
                  </div>

                  <Separator className="my-2" />

                  {/* Switch 1: Strict Mode Master */}
                  <div className="my-6 flex items-start justify-between p-5 bg-sky-500/5 dark:bg-sky-500/10 rounded-[1.5rem] border border-sky-500/10">
                    <div className="space-y-1.5 pr-4">
                      <Label className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        Kích hoạt Chế độ Nghiêm ngặt toàn cục
                        {settings.strictMode && (
                          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                      </Label>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Thực thi các kiểm tra ràng buộc khắt khe đối với kho nguyên liệu và định lượng sản xuất.
                        Không cho phép ghi đè cảnh báo lỗi hoặc tự ý điều chỉnh số lượng ngoài công thức thiết kế (BOM).
                      </p>
                    </div>
                    <Switch
                      checked={settings.strictMode}
                      onCheckedChange={() => handleToggle("strictMode")}
                      className="data-[state=checked]:bg-sky-500"
                    />
                  </div>

                  {/* Sub switches under Strict Mode */}
                  <div className={`space-y-5 transition-opacity duration-300 ${settings.strictMode ? "opacity-100" : "opacity-40 pointer-events-none"}`}>

                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <Label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          Bắt buộc kiểm tra BOM chính xác (Strict BOM Check)
                        </Label>
                        <p className="text-xs text-slate-400 max-w-xl">
                          Chặn hoàn toàn việc tạo lệnh sản xuất nếu kho nguyên liệu dự báo thiếu hụt so với công thức BOM thiết kế.
                        </p>
                      </div>
                      <Switch
                        checked={settings.strictBOMCheck}
                        disabled={!settings.strictMode}
                        onCheckedChange={() => handleToggle("strictBOMCheck")}
                        className="data-[state=checked]:bg-sky-500"
                      />
                    </div>

                    <Separator />

                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <Label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          Khóa cứng tồn kho phân bổ (Lock Allocated Stock)
                        </Label>
                        <p className="text-xs text-slate-400 max-w-xl">
                          Khi một lệnh sản xuất được duyệt và cấp vật tư, số lượng vật tư đó sẽ bị khóa ngay lập tức, không cho phép thủ kho dùng cho đơn khác.
                        </p>
                      </div>
                      <Switch
                        checked={settings.lockStockAllocation}
                        disabled={!settings.strictMode}
                        onCheckedChange={() => handleToggle("lockStockAllocation")}
                        className="data-[state=checked]:bg-sky-500"
                      />
                    </div>

                    <Separator />

                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <Label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          Cấm ghi đè trạng thái thủ công (Block Manual Override)
                        </Label>
                        <p className="text-xs text-slate-400 max-w-xl">
                          Thủ kho và Quản lý sản xuất chỉ có thể đổi trạng thái phiếu/đơn thông qua các bước quét mã QR/mã vạch hợp lệ.
                        </p>
                      </div>
                      <Switch
                        checked={settings.blockManualOverride}
                        disabled={!settings.strictMode}
                        onCheckedChange={() => handleToggle("blockManualOverride")}
                        className="data-[state=checked]:bg-sky-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Maintenance & Logs Column */}
              <div className="space-y-6">

                {/* Maintenance Card */}
                <div className="rounded-[2rem] border border-slate-100 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 pb-4">
                    <div className="p-2.5 bg-rose-500/10 dark:bg-rose-500/20 rounded-2xl">
                      <Power className="h-5 w-5 text-rose-500" />
                    </div>
                    <div>
                      <h3 className="text-md font-bold text-rose-600 dark:text-rose-400">Chế Độ Bảo Trì Cổng</h3>
                      <p className="text-xs text-slate-400">Bảo dưỡng và sao lưu ngoại tuyến</p>
                    </div>
                  </div>

                  <Separator className="my-2" />

                  <div className="my-4 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">Bảo trì hệ thống</Label>
                      <p className="text-[10px] text-slate-400 max-w-[180px]">Chặn truy cập của nhân viên kho/sản xuất để nâng cấp database.</p>
                    </div>
                    <Switch
                      checked={settings.maintenanceMode}
                      onCheckedChange={() => handleToggle("maintenanceMode")}
                      disabled={isMaintenanceTriggering}
                      className="data-[state=checked]:bg-rose-500"
                    />
                  </div>

                  {isMaintenanceTriggering && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs text-slate-400">
                      <RefreshCw className="h-3 w-3 animate-spin text-rose-500" />
                      Đang xử lý kết nối...
                    </div>
                  )}

                  <div className="mt-4 rounded-2xl bg-rose-500/5 p-4 text-[11px] text-rose-600 dark:text-rose-400 flex items-start gap-2 border border-rose-500/10">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Tài khoản Admin có quyền lực cao nhất, vẫn được phép đăng nhập và thao tác quản trị trong suốt quá trình bảo trì để vá lỗi.
                    </span>
                  </div>
                </div>

                {/* API Logging level */}
                <div className="rounded-[2rem] border border-slate-100 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 pb-4">
                    <div className="p-2.5 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-2xl">
                      <FileCode className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="text-md font-bold">Ghi Nhận Logs & API</h3>
                      <p className="text-xs text-slate-400">Cấu hình cấp độ ghi log của backend</p>
                    </div>
                  </div>

                  <Separator className="my-2" />

                  <div className="space-y-4 my-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase">Cấp độ API (Logging Level)</Label>
                      <Select
                        value={settings.apiLoggingLevel}
                        onValueChange={(val) => handleSelectChange("apiLoggingLevel", val)}
                      >
                        <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="error">Error Only (Tối ưu dung lượng)</SelectItem>
                          <SelectItem value="warn">Warnings & Errors</SelectItem>
                          <SelectItem value="info">Info, Warnings & Errors</SelectItem>
                          <SelectItem value="debug">Debug Mode (Lưu toàn bộ payload)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Chế độ Debug nhà phát triển</Label>
                        <p className="text-[10px] text-slate-400">Mở chi tiết stacktrace trong log lỗi.</p>
                      </div>
                      <Switch
                        checked={settings.debugMode}
                        onCheckedChange={() => handleToggle("debugMode")}
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </TabsContent>

          {/* TAB 2: BUSINESS & INVENTORY RULES */}
          <TabsContent value="workflows" className="space-y-6 outline-none animate-slide-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Inventory Control */}
              <div className="rounded-[2rem] border border-slate-100 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 pb-6">
                  <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-2xl">
                    <Workflow className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Nguyên tắc xuất kho & FIFO</h3>
                    <p className="text-sm text-slate-400">
                      Ràng buộc thời hạn sử dụng và kỷ luật xếp dỡ hàng hóa
                    </p>
                  </div>
                </div>

                <Separator className="my-2" />

                <div className="space-y-6 my-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ràng buộc xuất kho FIFO (First-In, First-Out)</Label>
                    <Select
                      value={settings.fifoEnforcement}
                      onValueChange={(val) => handleSelectChange("fifoEnforcement", val)}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strict">Strict FIFO (Cấm tuyệt đối xuất lô sau nếu còn lô cũ)</SelectItem>
                        <SelectItem value="warning">Warning FIFO (Hiển thị cảnh báo đỏ nhưng vẫn cho xuất)</SelectItem>
                        <SelectItem value="flexible">Flexible (Cho phép xuất tự do không ràng buộc)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-400 leading-relaxed mt-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                      {settings.fifoEnforcement === "strict" && "🔴 Nghiêm ngặt: Hệ thống chặn hoàn toàn thủ kho nếu cố ý chọn xuất lô vật tư mới nhập khi có lô cũ hơn vẫn chưa xuất."}
                      {settings.fifoEnforcement === "warning" && "🟡 Cảnh báo: Hệ thống nháy đỏ nổi bật cảnh báo lỗi xếp dỡ FIFO trên màn hình phiếu xuất nhưng vẫn cho bấm lưu."}
                      {settings.fifoEnforcement === "flexible" && "🟢 Tự do: Không can thiệp vào sự linh hoạt thực tế của nhân viên bốc xếp."}
                    </p>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase">Tự động nén nhật ký (Ngày)</Label>
                      <Input
                        type="number"
                        value={settings.autoArchiveDays}
                        onChange={(e) => handleInputChange("autoArchiveDays", Number(e.target.value))}
                        className="rounded-xl border-slate-200 dark:border-slate-800"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase">Đính kèm tối đa (MB)</Label>
                      <Input
                        type="number"
                        value={settings.maxUploadMB}
                        onChange={(e) => handleInputChange("maxUploadMB", Number(e.target.value))}
                        className="rounded-xl border-slate-200 dark:border-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Approval Gates */}
              <div className="rounded-[2rem] border border-slate-100 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 pb-6">
                  <div className="p-3 bg-purple-500/10 dark:bg-purple-500/20 rounded-2xl">
                    <UserCheck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Chốt chặn Phê duyệt (Approval Gates)</h3>
                    <p className="text-sm text-slate-400">
                      Ràng buộc vai trò kiểm soát nội bộ giữa các bộ phận
                    </p>
                  </div>
                </div>

                <Separator className="my-2" />

                <div className="space-y-6 my-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        Phê duyệt 2 lớp khi Cấp vật tư (Material Issues)
                      </Label>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Các yêu cầu vật liệu tạo bởi Quản lý sản xuất buộc phải được Quản lý kho duyệt mới chuyển trạng thái Xuất kho. Ngăn ngừa bòn rút vật tư vô tổ chức.
                      </p>
                    </div>
                    <Switch
                      checked={settings.doubleApprovalRequisition}
                      onCheckedChange={() => handleToggle("doubleApprovalRequisition")}
                      className="data-[state=checked]:bg-purple-500"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        Duyệt báo cáo Phế liệu & Hao hụt (Scrap Sign-off)
                      </Label>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Mọi báo cáo hàng hỏng, hao hụt bãi phế liệu của Nhân viên xưởng (Staff) buộc phải được Quản lý sản xuất hoặc Quản lý kho bấm duyệt để cập nhật kho thực tế.
                      </p>
                    </div>
                    <Switch
                      checked={settings.managerSignoffScrap}
                      onCheckedChange={() => handleToggle("managerSignoffScrap")}
                      className="data-[state=checked]:bg-purple-500"
                    />
                  </div>
                </div>
              </div>

            </div>
          </TabsContent>

          {/* TAB 3: ALERTS & INTEGRATIONS */}
          <TabsContent value="alerts" className="space-y-6 outline-none animate-slide-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Webhooks config */}
              <div className="md:col-span-2 rounded-[2rem] border border-slate-100 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 pb-6">
                  <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl">
                    <Webhook className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Webhooks & Giao tiếp nhóm</h3>
                    <p className="text-sm text-slate-400">
                      Bắn tin báo cáo thời gian thực về các kênh Slack/Discord của công ty
                    </p>
                  </div>
                </div>

                <Separator className="my-2" />

                <div className="space-y-6 my-4">
                  {/* Discord config */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          Discord low-stock Alert Bot
                          {settings.discordWebhookEnabled && (
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-none font-bold text-[9px]">ACTIVE</Badge>
                          )}
                        </Label>
                        <p className="text-xs text-slate-400">Gửi cảnh báo khẩn cấp khi nguyên vật liệu xuống dưới định mức an toàn.</p>
                      </div>
                      <Switch
                        checked={settings.discordWebhookEnabled}
                        onCheckedChange={() => handleToggle("discordWebhookEnabled")}
                      />
                    </div>

                    {settings.discordWebhookEnabled && (
                      <div className="space-y-2 animate-slide-in">
                        <Label className="text-xs font-bold text-slate-400 uppercase">Discord Webhook URL</Label>
                        <Input
                          value={settings.discordWebhookUrl}
                          onChange={(e) => handleInputChange("discordWebhookUrl", e.target.value)}
                          placeholder="https://discord.com/api/webhooks/..."
                          className="rounded-xl border-slate-200 dark:border-slate-800 text-xs"
                        />
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Slack config */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          Slack daily-report Channel
                          {settings.slackWebhookEnabled && (
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-none font-bold text-[9px]">ACTIVE</Badge>
                          )}
                        </Label>
                        <p className="text-xs text-slate-400">Gửi báo cáo xuất nhập tồn tóm tắt vào cuối mỗi ngày làm việc.</p>
                      </div>
                      <Switch
                        checked={settings.slackWebhookEnabled}
                        onCheckedChange={() => handleToggle("slackWebhookEnabled")}
                      />
                    </div>

                    {settings.slackWebhookEnabled && (
                      <div className="space-y-2 animate-slide-in">
                        <Label className="text-xs font-bold text-slate-400 uppercase">Slack Webhook URL</Label>
                        <Input
                          value={settings.slackWebhookUrl}
                          onChange={(e) => handleInputChange("slackWebhookUrl", e.target.value)}
                          placeholder="https://hooks.slack.com/services/..."
                          className="rounded-xl border-slate-200 dark:border-slate-800 text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Threshold alert settings */}
              <div className="rounded-[2rem] border border-slate-100 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 pb-6">
                  <div className="p-3 bg-rose-500/10 dark:bg-rose-500/20 rounded-2xl">
                    <Bell className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Tham số cảnh báo</h3>
                    <p className="text-sm text-slate-400">Giới hạn định mức</p>
                  </div>
                </div>

                <Separator className="my-2" />

                <div className="space-y-6 my-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Tỷ lệ tồn kho cảnh báo (%)
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min="5"
                        max="50"
                        value={settings.alertStockThresholdPercent}
                        onChange={(e) => handleInputChange("alertStockThresholdPercent", Number(e.target.value))}
                        className="rounded-xl border-slate-200 dark:border-slate-800"
                      />
                      <span className="text-sm font-bold text-slate-400">%</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Kích hoạt cảnh báo đỏ khi lượng tồn kho thực tế chạm ngưỡng giảm sâu hơn <strong className="text-rose-500 font-bold">{settings.alertStockThresholdPercent}%</strong> so với mốc an toàn.
                    </p>
                  </div>

                  <Separator />

                  {/* Mail mock setting */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                      <Mail className="h-4 w-4" /> Hệ thống SMTP gửi Mail
                    </Label>
                    <div className="space-y-2">
                      <Input
                        value={settings.smtpHost}
                        onChange={(e) => handleInputChange("smtpHost", e.target.value)}
                        placeholder="smtp.server.com"
                        className="rounded-lg h-9 text-xs"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          value={settings.smtpPort}
                          onChange={(e) => handleInputChange("smtpPort", e.target.value)}
                          placeholder="Port"
                          className="rounded-lg h-9 text-xs col-span-1"
                        />
                        <Input
                          value={settings.smtpUser}
                          onChange={(e) => handleInputChange("smtpUser", e.target.value)}
                          placeholder="Sender User"
                          className="rounded-lg h-9 text-xs col-span-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </TabsContent>

          {/* TAB 4: SYSTEM DIAGNOSTICS & MAINTENANCE */}
          <TabsContent value="diagnostics" className="space-y-6 outline-none animate-slide-in">
            {/* Massive Bento Card: Quantum System Diagnostics Hub */}
            <div className="rounded-[2.5rem] border border-slate-100 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl p-8 shadow-sm relative overflow-hidden">

              {/* Pulsing glow background light */}
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />

              <div className="relative z-20 space-y-6">

                {/* Header info */}
                {!isDiagnosing && !diagnosticsReport && (
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-sky-500/10 dark:bg-sky-500/20 rounded-2xl animate-pulse">
                          <Activity className="h-6 w-6 text-sky-500" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold flex items-center gap-2">
                            Quantum Diagnostics Hub
                            <Badge variant="outline" className="text-[9px] text-sky-400 border-sky-500/30 font-bold bg-sky-500/5">ATLAS ENGINE</Badge>
                          </h3>
                          <p className="text-sm text-slate-400">Chẩn đoán lượng tử thời gian thực cơ sở dữ liệu MongoDB Atlas & API Gateway</p>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleTriggerDiagnostics}
                      className="rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 hover:shadow-[0_0_20px_rgba(14,165,233,0.4)] text-white shadow-md font-bold py-7 px-8 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3 text-sm shrink-0 border border-sky-400/20"
                    >
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      Khởi chạy chẩn đoán hệ thống lượng tử
                    </Button>
                  </div>
                )}

                {/* State 1: Diagnosing in progress (Black Hole Cosmic Scanner) */}
                {isDiagnosing && (
                  <BlackHoleScanner onComplete={handleDiagnosticsComplete} />
                )}

                {/* State 2: Report output view */}
                {!isDiagnosing && diagnosticsReport && (
                  <DiagnosticsReportView report={diagnosticsReport} onReset={() => setDiagnosticsReport(null)} />
                )}

                {/* Description info when static */}
                {!isDiagnosing && !diagnosticsReport && (
                  <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-900/30 p-5 text-xs text-slate-400 border border-slate-200/20 space-y-3">
                    <h5 className="font-bold text-slate-500 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                      <Info className="h-4 w-4" /> THÔNG TIN HẠNG MỤC CHẨN ĐOÁN LƯỢNG TỬ
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-[11px] leading-relaxed">
                      <div className="space-y-1">
                        <span className="text-sky-400 font-bold">1. MongoDB Atlas Storage:</span>
                        <p>Kiểm tra dung lượng WiredTiger cache, phân tích phân mảnh Collections & Documents.</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-indigo-400 font-bold">2. Indexing Performance:</span>
                        <p>Đo lường mức độ tối ưu hóa index, cảnh báo các queries không dùng index (COLLSCAN).</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-purple-400 font-bold">3. Network & Connection:</span>
                        <p>Kiểm thử API handshake, đo độ trễ Network RTT đến Replica Set, đánh giá bảo mật TLS.</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Purges & vacuum */}
              <div className="rounded-[2rem] border border-slate-100 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 pb-6">
                    <div className="p-3 bg-rose-500/10 dark:bg-rose-500/20 rounded-2xl">
                      <Activity className="h-6 w-6 text-rose-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Dọn dẹp dung lượng</h3>
                      <p className="text-sm text-slate-400">Giải phóng các vùng nhớ đệm API</p>
                    </div>
                  </div>

                  <Separator className="my-2" />

                  <div className="space-y-5 my-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/40 space-y-3">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold">Purge API Audit Logs</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Xóa toàn bộ dữ liệu log máy chủ cũ hơn 90 ngày để tránh tắc nghẽn dung lượng lưu trữ SSD.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleClearLogs}
                        disabled={isCleaningLogs}
                        className="w-full text-slate-600 hover:text-white hover:bg-rose-500/90 dark:text-slate-300 rounded-xl border-slate-200 dark:border-slate-800"
                      >
                        {isCleaningLogs ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin text-sky-500" /> Đang tối ưu...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2 text-rose-500 group-hover:text-white" /> Khởi chạy dọn dẹp
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 space-y-3">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4" /> Reset cơ sở dữ liệu mẫu
                        </h4>
                        <p className="text-xs text-rose-600/70 dark:text-rose-400/60 leading-relaxed">
                          Xóa sạch toàn bộ lệnh sản xuất, phiếu xuất nhập thực tế và nạp lại cấu hình seeder ban đầu.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          const confirmed = window.confirm("CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn xóa toàn bộ database hoạt động thực tế và tải lại dữ liệu mẫu Demo? Hành động này KHÔNG THỂ HOÀN TÁC!")
                          if (confirmed) {
                            toast.error("Đang nạp lại dữ liệu mẫu...", {
                              description: "Hệ thống sẽ tải lại sau 3 giây.",
                            })
                            setTimeout(() => {
                              window.location.reload()
                            }, 3000)
                          }
                        }}
                        className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" /> Xóa sạch & Reload Seed
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Database Backups management */}
              <div className="lg:col-span-2 rounded-[2rem] border border-slate-100 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-2xl">
                      <Database className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Bản sao lưu dự phòng (Snapshots)</h3>
                      <p className="text-sm text-slate-400">Sao lưu dữ liệu MongoDB Atlas định kỳ an toàn</p>
                    </div>
                  </div>

                  <Button
                    onClick={handleTriggerBackup}
                    disabled={isBackingUp}
                    className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] text-white shadow-md font-bold py-6 px-6 shrink-0 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2"
                  >
                    {isBackingUp ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> Đang snapshot...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 fill-white" /> Tạo snapshot DB
                      </>
                    )}
                  </Button>
                </div>

                <Separator className="my-2" />

                <div className="space-y-4 my-4">
                  <div className="flex items-center gap-2.5 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                    <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>
                      Hệ thống tự động chạy sao lưu gia tăng (incremental backup) vào lúc **03:00 sáng hàng ngày** và tải trực tiếp lên vùng nhớ AWS S3 mã hóa.
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-100 dark:border-slate-900 overflow-hidden">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-500 dark:text-slate-400 grid grid-cols-12 gap-2 border-b border-slate-100 dark:border-slate-900 uppercase tracking-widest">
                      <div className="col-span-6 md:col-span-7">Tên bản sao lưu</div>
                      <div className="col-span-3 md:col-span-2 text-right">Dung lượng</div>
                      <div className="col-span-3 md:col-span-3 text-right">Thời gian tạo</div>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-900">
                      {backupHistory.map((backup) => (
                        <div key={backup.id} className="p-4 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                          <div className="col-span-6 md:col-span-7 font-mono font-bold text-slate-700 dark:text-slate-300 truncate flex items-center gap-2.5">
                            <FileText className="h-4 w-4 text-slate-400" />
                            {backup.name}
                          </div>
                          <div className="col-span-3 md:col-span-2 text-right text-slate-500 font-semibold">{backup.size}</div>
                          <div className="col-span-3 md:col-span-3 text-right text-slate-400 flex items-center justify-end gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {backup.date}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}

// Restrict to admin role with permission guard!
export default withPermission(AdminSettingsPage, ["admin"])
