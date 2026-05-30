"use client"

import { useMemo } from "react"
import { format, isToday } from "date-fns"
import { vi } from "date-fns/locale"
import {
  ClipboardList,
  Search,
  Filter,
  ArrowRight,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useProductionOrders } from "@/features/production/hooks/use-production"
import { getAssignmentStatusConfig } from "@/features/production/utils/production-status"
import { StaffTaskReportDialog } from "./staff-task-report-dialog"
import { useState } from "react"


// ─── Component ───────────────────────────────────────────────────────────────
export function StaffTasksView() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedTask, setSelectedTask] = useState<any | null>(null)

  const { data: response, isLoading } = useProductionOrders({ limit: 50 })

  /**
   * Flatten orders → assignments (each assignment is ONE task for this staff).
   * The backend already scopes orders to the current staff, and assignments within
   * each order are also scoped to this staff. We never expose aggregate order data here.
   */
  const allTasks = useMemo(() => {
    if (!response?.data?.orders) return []
    return response.data.orders
      .flatMap((order: any) =>
        (order.assignments || []).map((a: any) => {
          // Find the product details by matching product IDs from the order products array
          const matchingProduct = order.products?.find((p: any) => {
            const orderProductId = typeof p.product === "object" ? p.product?._id || p.product?.id : p.product;
            const assignmentProductId = typeof a.product === "object" ? a.product?._id || a.product?.id : a.product;
            return orderProductId === assignmentProductId;
          });

          // Resolve name, code, and unit from either populated objects or custom flat properties
          const name = matchingProduct?.productName || 
                       (typeof matchingProduct?.product === "object" ? matchingProduct?.product?.name : null) || 
                       (typeof a.product === "object" ? a.product?.name : null) || 
                       "—";
                       
          const code = matchingProduct?.productCode || 
                       (typeof matchingProduct?.product === "object" ? matchingProduct?.product?.code : null) || 
                       (typeof a.product === "object" ? a.product?.code : null) || 
                       "—";
                       
          const unit = (typeof matchingProduct?.product === "object" ? matchingProduct?.product?.unit : null) || 
                       matchingProduct?.unit || 
                       (typeof a.product === "object" ? a.product?.unit : null) || 
                       "sản phẩm";

          return {
            ...a,
            orderCode: order.orderCode,
            orderStatus: order.status,
            orderPriority: order.priority,
            orderDeadline: order.deadline,
            productDetails: { name, code, unit }
          };
        })
      )
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [response])

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task: any) => {
      const matchesSearch =
        task.orderCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.productDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.productDetails?.code?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "all" || task.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [allTasks, searchTerm, statusFilter])

  // ─── Summary stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: allTasks.length,
    pending: allTasks.filter((t) => t.status === "assigned").length,
    active: allTasks.filter((t) => ["in_production", "partially_complete"].includes(t.status)).length,
    done: allTasks.filter((t) => t.status === "completed").length,
  }), [allTasks])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ─── Filter Bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã đơn, tên hoặc mã sản phẩm..."
            className="pl-9 bg-card h-10 border-border/50 focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-card border-border/50 h-10">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="assigned">Mới giao</SelectItem>
            <SelectItem value="in_production">Đang thực hiện</SelectItem>
            <SelectItem value="partially_complete">Xong một phần</SelectItem>
            <SelectItem value="completed">Đã hoàn thành</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ─── Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Tổng nhiệm vụ", value: stats.total, icon: ClipboardList, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Chưa bắt đầu",  value: stats.pending, icon: AlertCircle,  color: "text-slate-500", bg: "bg-slate-500/10" },
          { label: "Đang thực hiện",value: stats.active,  icon: Clock,         color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Hoàn thành",    value: stats.done,   icon: CheckCircle2,  color: "text-green-500", bg: "bg-green-500/10" },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className={`p-3 rounded-xl ${s.bg}`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Task Grid ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl bg-card/50" />)}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card/30 rounded-3xl border border-dashed">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8 text-primary/50" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Không có nhiệm vụ nào</h3>
          <p className="text-muted-foreground text-sm">Không tìm thấy công việc phù hợp với bộ lọc hiện tại.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task: any) => {
            const statusConfig = getAssignmentStatusConfig(task.status)
            const isCompleted = task.status === "completed"

            // ─── Per-assignment progress (NOT overall order progress) ──────
            const myProgress = task.assignedQuantity > 0
              ? Math.min(100, Math.round(((task.completedQuantity || 0) / task.assignedQuantity) * 100))
              : 0

            // ─── Daily report check ──────────────────────────────────────
            const reportedToday = task.lastReportedAt ? isToday(new Date(task.lastReportedAt)) : false
            const isOrderStarted = ["in_production", "partially_complete"].includes(task.orderStatus)
            const canReport = !isCompleted && !reportedToday && isOrderStarted

            return (
              <div
                key={task._id}
                className="group bg-card hover:bg-accent/5 transition-all duration-300 border border-border/50 hover:border-primary/30 rounded-2xl overflow-hidden shadow-sm hover:shadow-md flex flex-col"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-border/50 bg-muted/20">
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant="outline" className="font-mono text-xs bg-background">
                      {task.orderCode}
                    </Badge>
                    <Badge className={`font-semibold text-xs ${statusConfig.color}`} variant="outline">
                      {statusConfig.label}
                    </Badge>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-base line-clamp-1" title={task.productDetails?.name}>
                        {task.productDetails?.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Mã SP: <span className="font-medium text-foreground">{task.productDetails?.code}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-4">
                    {/* Assignment date */}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Giao lúc:
                      </span>
                      <span className="font-medium text-xs">
                        {task.createdAt ? format(new Date(task.createdAt), "dd/MM/yyyy HH:mm") : "—"}
                      </span>
                    </div>

                    {/* My personal progress — strictly per-assignment, not order-wide */}
                    <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/40">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-xs">Tiến độ của tôi</span>
                        <span className="font-bold text-primary text-xs">{myProgress}%</span>
                      </div>
                      <Progress value={myProgress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground pt-1">
                        <span>Đã làm: <strong className="text-foreground">{task.completedQuantity ?? 0}</strong> {task.productDetails?.unit}</span>
                        <span>Chỉ tiêu của tôi: <strong className="text-foreground">{task.assignedQuantity}</strong> {task.productDetails?.unit}</span>
                      </div>
                    </div>

                    {/* Daily report status indicator */}
                    {reportedToday && !isCompleted && (
                      <div className="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400">
                        <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>Đã báo cáo hôm nay lúc {format(new Date(task.lastReportedAt), "HH:mm")}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full mt-2"
                    variant={canReport ? "default" : "outline"}
                    disabled={!canReport && !isCompleted}
                    onClick={() => setSelectedTask(task)}
                  >
                    {isCompleted
                      ? "Xem chi tiết"
                      : !isOrderStarted
                      ? "Cho kho xuat vat lieu"
                      : reportedToday
                      ? "Đã báo cáo hôm nay"
                      : "Báo cáo tiến độ"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Report Dialog */}
      <StaffTaskReportDialog
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask}
      />
    </div>
  )
}
