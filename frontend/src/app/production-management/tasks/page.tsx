"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Search,
  Clock,
  CheckCircle,
  Package,
  AlertTriangle,
  Bell,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"
import { toast } from "sonner"
import { productionApi } from "@/api/production.api"

const CustomPagination = ({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) => {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t p-4 bg-background">
      <p className="text-sm text-muted-foreground">
        Hiển thị {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} / {total}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => onChange(p)}>{p}</Button>
        ))}
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

const filters = [
  { id: "all", label: "Tất cả" },
  { id: "pending", label: "Chờ thực hiện" },
  { id: "in_production", label: "Đang thực hiện" },
  { id: "completed", label: "Hoàn thành" },
  { id: "overdue", label: "Chậm tiến độ / Quá hạn" },
]

const statusConfig = {
  pending: { label: "Chờ thực hiện", color: "bg-[#F4C542] text-[#2C2C2C]" },
  in_production: { label: "Đang thực hiện", color: "bg-[#2B8BE8] text-white" },
  completed: { label: "Hoàn thành", color: "bg-[#4A9C6B] text-white" },
  overdue: { label: "Chậm tiến độ", color: "bg-[#E04E4E] text-white" },
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isReminderOpen, setIsReminderOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [reminderMessage, setReminderMessage] = useState("")
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  // ─── Lấy dữ liệu (Thực tế từ API BE) ───
  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    try {
      // Gọi API lấy danh sách Đơn sản xuất (orders)
      const res: any = await productionApi.getOrders({ limit: 1000 })

      if (res && (res.success || res.status === 'success')) {
        const rawData = res.data?.orders || res.data?.items || res.data
        const data = Array.isArray(rawData) ? rawData : []
        let parsedTasks: any[] = []

        data.forEach((order: any) => {
          if (order.assignments && Array.isArray(order.assignments)) {
            order.assignments.forEach((task: any) => {
              parsedTasks.push({
                id: task._id || task.id,
                orderId: order.orderCode || order._id,
                product: task.product?.name || order.products?.[0]?.productName || (order.products?.[0]?.product as any)?.name || "Sản phẩm không xác định",
                staffId: task.staff?._id || task.assignee?._id || task.assignedTo?._id,
                staffName: task.staff?.fullName || task.staff?.username || task.assignee?.fullName || task.assignee?.username || "Chưa phân công",
                status: task.status || "pending",
                progress: task.assignedQuantity > 0 ? Math.round(((task.completedQuantity || 0) / task.assignedQuantity) * 100) : 0,
                startDate: task.startDate || order.startDate,
                endDate: task.endDate || order.deadline || order.expectedEndDate,
              })
            })
          }
        })

        setTasks(parsedTasks)
      } else {
        setTasks([])
      }
    } catch (error) {
      console.error("Fetch tasks error:", error)
      toast.error("Không thể tải danh sách công việc")
      setTasks([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Đặt lại trang khi đổi filter
  useEffect(() => { setPage(1) }, [activeFilter, searchQuery])

  // ─── Tính toán Filters bằng Memoization ───
  const filterCounts = useMemo(() => {
    return {
      all: tasks.length,
      pending: tasks.filter(t => t.status === "pending").length,
      in_production: tasks.filter(t => t.status === "in_production").length,
      completed: tasks.filter(t => t.status === "completed").length,
      overdue: tasks.filter(t => t.status === "overdue").length,
    }
  }, [tasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesFilter = activeFilter === "all" || task.status === activeFilter
      const matchesSearch =
        task.staffName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.product?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesFilter && matchesSearch
    })
  }, [tasks, activeFilter, searchQuery])

  const paginatedTasks = useMemo(() => {
    return filteredTasks.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  }, [filteredTasks, page])

  const handleSendReminder = useCallback(() => {
    if (selectedTask && reminderMessage) {
      alert(`Đã gửi nhắc nhở đến ${selectedTask.staffName}:\n${reminderMessage}`)
      setIsReminderOpen(false)
      setReminderMessage("")
      setSelectedTask(null)
    }
  }, [selectedTask, reminderMessage])

  const openReminderDialog = useCallback((task: any) => {
    setSelectedTask(task)
    setReminderMessage(`Nhắc nhở về công việc đơn hàng (${task.orderId}):\nTiến độ hiện tại: ${task.progress || 0}%\nVui lòng cập nhật tiến độ công việc.`)
    setIsReminderOpen(true)
  }, [])

  return (
    <DashboardLayout title="Quản lý công việc">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EBE3D9]">
                <Clock className="h-5 w-5 text-[#7A5C43]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">{filterCounts.pending}</p>
                <p className="text-sm text-muted-foreground">Chờ thực hiện</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EBE3D9]">
                <Package className="h-5 w-5 text-[#7A5C43]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">{filterCounts.in_production}</p>
                <p className="text-sm text-muted-foreground">Đang thực hiện</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EBE3D9]">
                <CheckCircle className="h-5 w-5 text-[#7A5C43]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">{filterCounts.completed}</p>
                <p className="text-sm text-muted-foreground">Hoàn thành</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EBE3D9]">
                <AlertTriangle className="h-5 w-5 text-[#7A5C43]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">{filterCounts.overdue}</p>
                <p className="text-sm text-muted-foreground">Chậm tiến độ</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm task..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeFilter === filter.id
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted"
                }`}
            >
              {filter.label}
              <span className="ml-2 opacity-70">({filterCounts[filter.id as keyof typeof filterCounts]})</span>
            </button>
          ))}
        </div>

        {/* Tasks Table */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase text-muted-foreground">
                    Đơn sản xuất / Sản phẩm
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase text-muted-foreground">
                    Nhân viên
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase text-muted-foreground">
                    Tiến độ
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase text-muted-foreground">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase text-muted-foreground">
                    Thời hạn
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium uppercase text-muted-foreground">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : paginatedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      Không tìm thấy công việc nào.
                    </td>
                  </tr>
                ) : paginatedTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <Link href={`/production-management/orders/${task.orderId}`} className="font-medium text-primary hover:underline">
                          {task.orderId}
                        </Link>
                        <p className="text-sm text-muted-foreground">{task.product || "Sản phẩm không xác định"}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {task.staffName && task.staffName !== "Chưa phân công"
                            ? task.staffName.substring(0, 2).toUpperCase()
                            : "NV"}
                        </div>
                        <span className="text-card-foreground">{task.staffName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                          <div
                            className={`h-full rounded-full transition-all ${task.status === "overdue" ? "bg-[#E04E4E]" : "bg-[#4A9C6B]"
                              }`}
                            style={{ width: `${task.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-10">
                          {task.progress || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={`${statusConfig[task.status as keyof typeof statusConfig]?.color || "bg-muted text-muted-foreground"} border-0`}
                      >
                        {statusConfig[task.status as keyof typeof statusConfig]?.label || task.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-card-foreground">
                      {task.endDate
                        ? new Date(task.endDate).toLocaleDateString("vi-VN")
                        : "Chưa xác định"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(task.status === "overdue") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-secondary text-secondary hover:bg-secondary/10"
                          onClick={() => openReminderDialog(task)}
                        >
                          <Bell className="h-4 w-4 mr-1" />
                          Nhắc nhở
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CustomPagination page={page} total={filteredTasks.length} pageSize={ITEMS_PER_PAGE} onChange={setPage} />
        </Card>

        {/* Reminder Dialog */}
        <Dialog open={isReminderOpen} onOpenChange={setIsReminderOpen}>
          <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-primary">
                Nhắc nhở nhân viên
              </DialogTitle>
            </DialogHeader>
            {selectedTask && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {selectedTask.staffName && selectedTask.staffName !== "Chưa phân công"
                        ? selectedTask.staffName.substring(0, 2).toUpperCase()
                        : "NV"}
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">{selectedTask.staffName}</p>
                      <p className="text-sm text-muted-foreground">{selectedTask.product}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reminder-message">Nội dung nhắc nhở</Label>
                  <Textarea
                    id="reminder-message"
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsReminderOpen(false)}>
                    Hủy
                  </Button>
                  <Button
                    onClick={handleSendReminder}
                    className="bg-secondary hover:bg-secondary/90 text-white"
                    disabled={!reminderMessage}
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    Gửi nhắc nhở
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
