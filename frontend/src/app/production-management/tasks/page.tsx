"use client"

import { useMemo, useState } from "react"
import { format, isToday, isPast } from "date-fns"
import {
  Search, ChevronDown, CheckCircle, Package, AlertTriangle,
  Loader2, Users, ClipboardList, Activity, RefreshCw,
  ExternalLink, CalendarCheck, History, TrendingUp,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  getProductionOrderStatusConfig,
  getAssignmentStatusConfig,
  getPriorityConfig,
  PRODUCTION_STATUS_FILTERS,
} from "@/features/production/utils/production-status"
import { useProductionOrders } from "@/features/production/hooks/use-production"



function pctColor(p: number) {
  if (p >= 100) return "bg-emerald-500"
  if (p >= 75)  return "bg-blue-500"
  if (p >= 40)  return "bg-amber-500"
  return "bg-red-400"
}

function calcPct(completed: number, assigned: number) {
  return assigned > 0 ? Math.min(100, Math.round((completed / assigned) * 100)) : 0
}

// ─── Staff Avatar ────────────────────────────────────────────────────────────

function StaffAvatar({ name, avatarUrl, size = 8 }: { name: string; avatarUrl?: string; size?: number }) {
  const initials = name.split(" ").slice(-2).map(w => w[0]?.toUpperCase() ?? "").join("") || "NV"
  const dim = `h-${size} w-${size}`
  if (avatarUrl) {
    return (
      <div className={cn(dim, "shrink-0 rounded-full overflow-hidden ring-2 ring-primary/20")}>
        <Image src={avatarUrl} alt={name} width={40} height={40} className="object-cover w-full h-full" />
      </div>
    )
  }
  return (
    <div className={cn(dim, "shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-primary/25 to-primary/10 text-xs font-bold text-primary ring-2 ring-primary/20")}>
      {initials}
    </div>
  )
}

// ─── Animated Collapse (CSS grid trick — handles nested panels correctly) ───
// grid-template-rows: 0fr → 1fr is animatable in Chrome 107+, FF 109+, Safari 16.4+
// The outer grid has no overflow constraint, so nested collapsibles expand freely.
function AnimatedCollapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className="grid transition-all"
      style={{
        gridTemplateRows: open ? "1fr" : "0fr",
        opacity: open ? 1 : 0,
        transitionDuration: "280ms",
        transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* min-h-0 is required for 0fr to collapse correctly */}
      <div className="min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}


// ─── Report History ──────────────────────────────────────────────────────────
// Backend stores milestones (50/75/100) + lastReportedAt + completedQuantity.
// We render the milestone timeline + final report info as "history" entries.

function ReportHistory({ assignment }: { assignment: any }) {
  const milestones: number[] = assignment.reportedMilestones ?? []
  const unit = assignment.product?.unit ?? ""

  if (milestones.length === 0 && !assignment.lastReportedAt) {
    return (
      <p className="py-3 text-center text-xs text-muted-foreground italic">
        Chưa có báo cáo tiến độ nào.
      </p>
    )
  }

  const entries = milestones.map((m, i) => ({
    key: `m-${i}`,
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    label: `Đạt mốc ${m}%`,
    detail: `${Math.round((m / 100) * assignment.assignedQuantity)} / ${assignment.assignedQuantity} ${unit}`,
    isLast: false,
  }))

  if (assignment.lastReportedAt) {
    entries.push({
      key: "last",
      icon: <CalendarCheck className="w-3.5 h-3.5" />,
      label: `Báo cáo cuối: ${format(new Date(assignment.lastReportedAt), "dd/MM/yyyy HH:mm")}${isToday(new Date(assignment.lastReportedAt)) ? " (Hôm nay)" : ""}`,
      detail: `Hoàn thành: ${assignment.completedQuantity ?? 0} / ${assignment.assignedQuantity} ${unit}`,
      isLast: true,
    })
  }

  return (
    <div className="pt-2 pb-1 pl-2 space-y-2">
      {entries.map((e, i) => (
        <div key={e.key} className="flex items-start gap-2.5">
          <div className={cn("mt-0.5 p-1 rounded-full shrink-0", e.isLast ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
            {e.icon}
          </div>
          <div>
            <p className="text-xs font-semibold">{e.label}</p>
            <p className="text-[11px] text-muted-foreground">{e.detail}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Assignment Row ──────────────────────────────────────────────────────────

function AssignmentRow({ assignment }: { assignment: any }) {
  const [historyOpen, setHistoryOpen] = useState(false)

  const statusCfg = getAssignmentStatusConfig(assignment.status)
  const pct = calcPct(assignment.completedQuantity || 0, assignment.assignedQuantity)
  const staffName = assignment.staff?.fullName || assignment.staff?.username || "Chưa phân công"
  const avatarUrl = assignment.staff?.avatar || undefined
  const productName = assignment.product?.name || "—"
  const unit = assignment.product?.unit ?? ""
  const reportedToday = assignment.lastReportedAt ? isToday(new Date(assignment.lastReportedAt)) : false
  const hasMilestones = (assignment.reportedMilestones?.length ?? 0) > 0 || !!assignment.lastReportedAt

  return (
    <div className="rounded-xl border border-border/40 bg-background/60 overflow-hidden">
      {/* Main info row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5">
        {/* Staff */}
        <div className="flex items-center gap-2.5 sm:w-52 shrink-0 min-w-0">
          <StaffAvatar name={staffName} avatarUrl={avatarUrl} size={9} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{staffName}</p>
            <p className="text-xs text-muted-foreground truncate">{productName}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Tiến độ cá nhân</span>
            <span className="font-bold">{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", pctColor(pct))} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground">{assignment.completedQuantity ?? 0} / {assignment.assignedQuantity} {unit}</p>
        </div>

        {/* Status */}
        <Badge variant="outline" className={cn("shrink-0 text-xs font-medium", statusCfg.color)}>
          {statusCfg.label}
        </Badge>

        {/* Last report */}
        <div className="shrink-0 text-right min-w-[140px]">
          {assignment.lastReportedAt ? (
            <>
              <p className="text-xs font-medium flex items-center justify-end gap-1">
                <CalendarCheck className="w-3 h-3 text-primary shrink-0" />
                {format(new Date(assignment.lastReportedAt), "dd/MM HH:mm")}
              </p>
              <p className={cn("text-[10px]", reportedToday ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                {reportedToday ? "✅ Đã báo cáo hôm nay" : "Báo cáo cuối cùng"}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">Chưa báo cáo</p>
          )}
        </div>

        {/* History toggle */}
        <button
          onClick={() => setHistoryOpen(v => !v)}
          disabled={!hasMilestones}
          className={cn(
            "shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors border",
            historyOpen
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
            !hasMilestones && "opacity-40 cursor-not-allowed"
          )}
          title="Lịch sử báo cáo"
        >
          <History className="w-3 h-3" />
          Lịch sử
          <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", historyOpen && "rotate-180")} />
        </button>
      </div>

      {/* Animated history panel */}
      <AnimatedCollapse open={historyOpen}>
        <div className="border-t border-border/30 mx-3.5 pb-3">
          <ReportHistory assignment={assignment} />
        </div>
      </AnimatedCollapse>
    </div>
  )
}

// ─── Order Row ───────────────────────────────────────────────────────────────

function OrderRow({ order }: { order: any }) {
  const [expanded, setExpanded] = useState(false)

  const orderStatusCfg = getProductionOrderStatusConfig(order.status)
  const priorityCfg = getPriorityConfig(order.priority)
  const assignments: any[] = order.assignments || []
  const products: any[] = order.products || []

  const totalAssigned  = assignments.reduce((s, a) => s + (a.assignedQuantity  || 0), 0)
  const totalCompleted = assignments.reduce((s, a) => s + (a.completedQuantity || 0), 0)
  const orderPct = calcPct(totalCompleted, totalAssigned)

  const mainProductName = products[0]?.product?.name || products[0]?.productName || "—"
  const extraProducts   = products.length - 1
  const isDeadlinePast  = order.deadline ? isPast(new Date(order.deadline)) : false

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden transition-all duration-200",
      expanded ? "border-primary/40 shadow-lg shadow-primary/5" : "border-border/50 hover:border-border"
    )}>
      {/* ── Header ── */}
      <button className="w-full text-left" onClick={() => setExpanded(v => !v)}>
        <div className="flex flex-col md:flex-row md:items-center gap-3 p-4 bg-card hover:bg-accent/5 transition-colors">

          {/* Chevron + Order code */}
          <div className="flex items-center gap-3 shrink-0">
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg border transition-all duration-200",
              expanded ? "bg-primary text-primary-foreground border-primary rotate-0" : "bg-muted/50 border-border/50 text-muted-foreground"
            )}>
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", !expanded && "-rotate-90")} />
            </div>
            <div>
              <Link
                href={`/production-management/orders/${order._id}?from=tasks`}
                className="font-mono text-sm font-bold text-primary hover:underline flex items-center gap-1 group"
                onClick={e => e.stopPropagation()}
              >
                {order.orderCode}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {mainProductName}{extraProducts > 0 ? ` +${extraProducts} SP khác` : ""}
              </p>
            </div>
          </div>

          {/* Labeled badge groups — clearly separate order status from priority */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 leading-none">
                Trạng thái
              </span>
              <Badge variant="outline" className={cn("w-fit text-xs font-medium", orderStatusCfg.color)}>
                {orderStatusCfg.label}
              </Badge>
            </div>

            {priorityCfg && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 leading-none">
                  Ưu tiên
                </span>
                <Badge variant="outline" className={cn("w-fit text-xs font-medium", priorityCfg.color)}>
                  {priorityCfg.label}
                </Badge>
              </div>
            )}
          </div>

          {/* Staff count */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Users className="w-3.5 h-3.5" />
            {assignments.length} nhân viên
          </div>

          {/* Progress + deadline pushed right */}
          <div className="md:ml-auto flex items-center gap-5">
            <div className="min-w-[120px] space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Tổng tiến độ</span>
                <span className="font-bold">{orderPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-500", pctColor(orderPct))} style={{ width: `${orderPct}%` }} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={cn("text-xs font-semibold", isDeadlinePast ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                {order.deadline ? format(new Date(order.deadline), "dd/MM/yyyy") : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">Hạn hoàn thành</p>
            </div>
          </div>
        </div>
      </button>

      {/* ── Expandable assignments ── */}
      <AnimatedCollapse open={expanded}>
        <div className="border-t border-border/40 bg-muted/20 p-4 space-y-2.5">
          {assignments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Users className="w-4 h-4" /> Chưa có nhân viên nào được phân công.
            </p>
          ) : (
            assignments.map(a => <AssignmentRow key={a._id} assignment={a} />)
          )}
        </div>
      </AnimatedCollapse>
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number
  icon: React.ElementType
  gradient: string
  glow: string
  loading?: boolean
}

function StatCard({ label, value, icon: Icon, gradient, glow, loading }: StatCardProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-5 text-white shadow-lg transition-transform duration-300 hover:-translate-y-1",
      gradient
    )}>
      {/* Glow blob */}
      <div className={cn("absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-30 blur-2xl", glow)} />
      {/* Icon watermark */}
      <Icon className="absolute right-4 bottom-3 w-16 h-16 opacity-10" />

      <div className="relative z-10">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-3xl font-black tabular-nums tracking-tight">
          {loading ? <span className="inline-block w-8 h-7 bg-white/20 rounded animate-pulse" /> : value}
        </p>
        <p className="mt-1 text-sm font-medium text-white/80">{label}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const { data: response, isLoading, refetch, isFetching } = useProductionOrders({ limit: 200 })

  const orders: any[] = useMemo(() => {
    const raw = response?.data?.orders || []
    return Array.isArray(raw) ? raw : []
  }, [response])

  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return orders.filter(order => {
      const matchStatus = statusFilter === "all" || order.status === statusFilter
      if (!q) return matchStatus
      const matchSearch =
        order.orderCode?.toLowerCase().includes(q) ||
        order.products?.some((p: any) => p.product?.name?.toLowerCase().includes(q) || p.productName?.toLowerCase().includes(q)) ||
        order.assignments?.some((a: any) => a.staff?.fullName?.toLowerCase().includes(q) || a.staff?.username?.toLowerCase().includes(q))
      return matchStatus && matchSearch
    })
  }, [orders, searchQuery, statusFilter])

  const stats = useMemo(() => {
    const allAssignments = orders.flatMap(o => o.assignments || [])
    return {
      orders: orders.length,
      active: allAssignments.filter(a => ["in_production", "partially_complete"].includes(a.status)).length,
      completed: allAssignments.filter(a => a.status === "completed").length,
      overdue: orders.filter(o => o.deadline && isPast(new Date(o.deadline)) && !["completed","cancelled"].includes(o.status)).length,
    }
  }, [orders])

  const STAT_CARDS: StatCardProps[] = [
    { label: "Đơn sản xuất",          value: stats.orders,    icon: ClipboardList, gradient: "bg-gradient-to-br from-violet-600 to-indigo-600", glow: "bg-violet-400",  loading: isLoading },
    { label: "Công việc đang thực hiện", value: stats.active,  icon: Activity,      gradient: "bg-gradient-to-br from-amber-500 to-orange-500",  glow: "bg-amber-300",  loading: isLoading },
    { label: "Công việc hoàn thành",   value: stats.completed, icon: CheckCircle,   gradient: "bg-gradient-to-br from-emerald-500 to-teal-600",   glow: "bg-emerald-300",loading: isLoading },
    { label: "Đơn quá hạn",           value: stats.overdue,   icon: AlertTriangle,  gradient: "bg-gradient-to-br from-rose-500 to-pink-600",      glow: "bg-rose-300",   loading: isLoading },
  ]

  return (
    <DashboardLayout title="Quản lý công việc">
      <div className="space-y-6">

        {/* Stat Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {STAT_CARDS.map((s, i) => <StatCard key={i} {...s} />)}
        </div>

        {/* Search + Refresh */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm mã đơn, sản phẩm hoặc tên nhân viên..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-card border-border/50"
            />
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
          </Button>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {PRODUCTION_STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150",
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground border border-border/50 hover:bg-muted"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Order List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Đang tải dữ liệu công việc...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed text-center">
            <Package className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <h3 className="text-base font-semibold mb-1">Không có đơn sản xuất nào</h3>
            <p className="text-sm text-muted-foreground">Thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground pl-1">
              <strong>{filteredOrders.length}</strong> đơn — click vào để xem nhân viên &amp; tiến độ
            </p>
            {filteredOrders.map(order => <OrderRow key={order._id} order={order} />)}
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
