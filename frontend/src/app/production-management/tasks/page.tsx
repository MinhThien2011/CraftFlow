"use client"

import { useState } from "react"
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
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"

const filters = [
  { id: "all", label: "Tất cả" },
  { id: "pending", label: "Chờ thực hiện" },
  { id: "in-progress", label: "Đang thực hiện" },
  { id: "complete", label: "Hoàn thành" },
  { id: "delayed", label: "Chậm tiến độ" },
]

const staffMembers = [
  { id: "NV001", name: "Trần Văn B", role: "Thợ đan", avatar: "TB" },
  { id: "NV002", name: "Lê Thị C", role: "Thợ đan", avatar: "LC" },
  { id: "NV003", name: "Phạm Văn D", role: "Thợ hoàn thiện", avatar: "PD" },
  { id: "NV004", name: "Hoàng Thị E", role: "Thợ sơn", avatar: "HE" },
  { id: "NV005", name: "Vũ Văn F", role: "Kiểm tra chất lượng", avatar: "VF" },
  { id: "NV006", name: "Nguyễn Thị G", role: "Thợ đan", avatar: "NG" },
  { id: "NV007", name: "Đặng Văn H", role: "Thợ hoàn thiện", avatar: "DH" },
]

const allTasks = [
  {
    id: "T001",
    stageName: "Đan chi tiết & hoàn thiện",
    orderId: "PO-2024-001",
    product: "Giỏ tre đan tay",
    staffId: "NV003",
    staffName: "Phạm Văn D",
    status: "in-progress",
    progress: 70,
    startDate: "16/04/2026",
    endDate: "20/04/2026",
    isDelayed: false,
  },
  {
    id: "T002",
    stageName: "Sơn bảo vệ",
    orderId: "PO-2024-001",
    product: "Giỏ tre đan tay",
    staffId: "NV004",
    staffName: "Hoàng Thị E",
    status: "pending",
    progress: 0,
    startDate: "20/04/2026",
    endDate: "22/04/2026",
    isDelayed: false,
  },
  {
    id: "T003",
    stageName: "Kiểm tra chất lượng",
    orderId: "PO-2024-001",
    product: "Giỏ tre đan tay",
    staffId: "NV005",
    staffName: "Vũ Văn F",
    status: "pending",
    progress: 0,
    startDate: "22/04/2026",
    endDate: "25/04/2026",
    isDelayed: false,
  },
  {
    id: "T004",
    stageName: "Chạm khắc hoa văn",
    orderId: "PO-2024-004",
    product: "Khay gỗ chạm khắc",
    staffId: "NV003",
    staffName: "Phạm Văn D",
    status: "in-progress",
    progress: 40,
    startDate: "18/04/2026",
    endDate: "26/04/2026",
    isDelayed: true,
  },
  {
    id: "T005",
    stageName: "Tạo hình bình",
    orderId: "PO-2024-006",
    product: "Bình gốm men xanh",
    staffId: "NV002",
    staffName: "Lê Thị C",
    status: "in-progress",
    progress: 60,
    startDate: "19/04/2026",
    endDate: "24/04/2026",
    isDelayed: false,
  },
  {
    id: "T006",
    stageName: "Nung sơ bộ",
    orderId: "PO-2024-006",
    product: "Bình gốm men xanh",
    staffId: "NV001",
    staffName: "Trần Văn B",
    status: "pending",
    progress: 0,
    startDate: "24/04/2026",
    endDate: "26/04/2026",
    isDelayed: false,
  },
  {
    id: "T007",
    stageName: "Chuẩn bị khung sắt",
    orderId: "PO-2024-002",
    product: "Đèn mây thủ công",
    staffId: "NV006",
    staffName: "Nguyễn Thị G",
    status: "pending",
    progress: 0,
    startDate: "16/04/2026",
    endDate: "18/04/2026",
    isDelayed: true,
  },
  {
    id: "T008",
    stageName: "Đan khung cơ bản",
    orderId: "PO-2024-001",
    product: "Giỏ tre đan tay",
    staffId: "NV002",
    staffName: "Lê Thị C",
    status: "complete",
    progress: 100,
    startDate: "12/04/2026",
    endDate: "16/04/2026",
    isDelayed: false,
  },
]

const statusConfig = {
  pending: { label: "Chờ thực hiện", color: "bg-[#F4C542] text-[#2C2C2C]" },
  "in-progress": { label: "Đang thực hiện", color: "bg-[#2B8BE8] text-white" },
  complete: { label: "Hoàn thành", color: "bg-[#4A9C6B] text-white" },
  delayed: { label: "Chậm tiến độ", color: "bg-[#E04E4E] text-white" },
}

export default function TasksPage() {
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isReminderOpen, setIsReminderOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<typeof allTasks[0] | null>(null)
  const [reminderMessage, setReminderMessage] = useState("")

  const getFilterCount = (filterId: string) => {
    if (filterId === "all") return allTasks.length
    if (filterId === "delayed") return allTasks.filter(t => t.isDelayed).length
    return allTasks.filter(t => t.status === filterId).length
  }

  const filteredTasks = allTasks.filter((task) => {
    let matchesFilter = activeFilter === "all"
    if (activeFilter === "delayed") {
      matchesFilter = task.isDelayed
    } else if (activeFilter !== "all") {
      matchesFilter = task.status === activeFilter
    }
    const matchesSearch =
      task.stageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.orderId.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const handleSendReminder = () => {
    if (selectedTask && reminderMessage) {
      alert(`Đã gửi nhắc nhở đến ${selectedTask.staffName}:\n${reminderMessage}`)
      setIsReminderOpen(false)
      setReminderMessage("")
      setSelectedTask(null)
    }
  }

  const openReminderDialog = (task: typeof allTasks[0]) => {
    setSelectedTask(task)
    setReminderMessage(`Nhắc nhở về công đoạn "${task.stageName}" (${task.orderId}):\nTiến độ hiện tại: ${task.progress}%\nVui lòng cập nhật tiến độ công việc.`)
    setIsReminderOpen(true)
  }

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
                <p className="text-2xl font-bold text-card-foreground">{allTasks.filter(t => t.status === "pending").length}</p>
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
                <p className="text-2xl font-bold text-card-foreground">{allTasks.filter(t => t.status === "in-progress").length}</p>
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
                <p className="text-2xl font-bold text-card-foreground">{allTasks.filter(t => t.status === "complete").length}</p>
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
                <p className="text-2xl font-bold text-card-foreground">{allTasks.filter(t => t.isDelayed).length}</p>
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
              <span className="ml-2 opacity-70">({getFilterCount(filter.id)})</span>
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
                    Công đoạn
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase text-muted-foreground">
                    Đơn sản xuất
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
                {filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-card-foreground">{task.stageName}</p>
                        <p className="text-sm text-muted-foreground">{task.product}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/production-management/orders/${task.orderId}`} className="text-primary hover:underline">
                        {task.orderId}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {staffMembers.find(s => s.id === task.staffId)?.avatar}
                        </div>
                        <span className="text-card-foreground">{task.staffName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                          <div
                            className={`h-full rounded-full transition-all ${task.isDelayed ? "bg-[#E04E4E]" : "bg-[#4A9C6B]"
                              }`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-10">
                          {task.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={`${task.isDelayed ? statusConfig.delayed.color : statusConfig[task.status as keyof typeof statusConfig].color} border-0`}
                      >
                        {task.isDelayed ? statusConfig.delayed.label : statusConfig[task.status as keyof typeof statusConfig].label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-card-foreground">
                      {task.endDate}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(task.status !== "complete" && task.isDelayed) && (
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
        </Card>

        {/* Reminder Dialog */}
        <Dialog open={isReminderOpen} onOpenChange={setIsReminderOpen}>
          <DialogContent className="max-w-md">
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
                      {staffMembers.find(s => s.id === selectedTask.staffId)?.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">{selectedTask.staffName}</p>
                      <p className="text-sm text-muted-foreground">{selectedTask.stageName}</p>
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


