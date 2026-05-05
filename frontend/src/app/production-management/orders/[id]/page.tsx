"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/production-management/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Plus,
  Bell,
  CheckCircle,
  Clock,
  User,
  Package,
  Calendar,
  AlertTriangle,
  X,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { productionOrderDetails } from "@/lib/production-management/orders-data"

const employees = [
  { id: "NV001", name: "Trần Văn B", role: "Thợ đan" },
  { id: "NV002", name: "Lê Thị C", role: "Thợ đan" },
  { id: "NV003", name: "Phạm Văn D", role: "Thợ hoàn thiện" },
  { id: "NV004", name: "Hoàng Thị E", role: "Thợ sơn" },
  { id: "NV005", name: "Vũ Văn F", role: "Kiểm tra chất lượng" },
  { id: "NV006", name: "Nguyễn Thị G", role: "Thợ đan" },
  { id: "NV007", name: "Đặng Văn H", role: "Thợ hoàn thiện" },
]

const statusConfig = {
  pending: { label: "Chờ duyệt", color: "bg-[#F4C542] text-[#2C2C2C]", icon: Clock },
  "in-progress": { label: "Đang thực hiện", color: "bg-[#2B8BE8] text-white", icon: Clock },
  complete: { label: "Hoàn thành", color: "bg-[#4A9C6B] text-white", icon: CheckCircle },
  cancelled: { label: "Đã hủy", color: "bg-[#E04E4E] text-white", icon: XCircle },
  warning: { label: "Trễ hạn", color: "bg-[#E04E4E] text-white", icon: AlertTriangle },
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string
  const order = productionOrderDetails[orderId]

  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isReminderOpen, setIsReminderOpen] = useState(false)
  const [isCompleteOpen, setIsCompleteOpen] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [newStageName, setNewStageName] = useState("")
  const [newStageAssignee, setNewStageAssignee] = useState("")
  const [reminderMessage, setReminderMessage] = useState("")
  const [selectedEmployees, setSelectedEmployees] = useState<Array<string>>([])
  const [completeNote, setCompleteNote] = useState("")
  const [cancelReason, setCancelReason] = useState("")
  const [isCreateReceiptOpen, setIsCreateReceiptOpen] = useState(false)
  const [isSendApprovalOpen, setIsSendApprovalOpen] = useState(false)
  const [receiptCode, setReceiptCode] = useState(() => `NKTP-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`)
  const [receiptQuantity, setReceiptQuantity] = useState(order?.completed?.toString() || "0")
  const [receiptQualityStatus, setReceiptQualityStatus] = useState("good")
  const [receiptNote, setReceiptNote] = useState("")
  const [savedReceipt, setSavedReceipt] = useState<any>(null)

  const isCompletedOrder = order?.status === "complete"

  const stages = order?.stages || []
  const overallProgress = order?.progress ?? 0

  const handleSaveDraft = () => {
    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")} ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`
    setSavedReceipt({
      code: receiptCode,
      quantity: receiptQuantity,
      qualityStatus: receiptQualityStatus,
      note: receiptNote,
      savedTime: timeStr,
      status: 'draft',
      creator: order?.createdBy || ""
    })
    setIsCreateReceiptOpen(false)
  }

  const handleCreateReceipt = () => {
    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")} ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`
    const created = {
      code: receiptCode,
      quantity: receiptQuantity,
      qualityStatus: receiptQualityStatus,
      note: receiptNote,
      savedTime: timeStr,
      status: 'pending',
      creator: order?.createdBy || ""
    }
    setSavedReceipt(created)
    setIsCreateReceiptOpen(false)
  }

  const handleSendApproval = () => {
    if (!savedReceipt) return

    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")} ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`

    setSavedReceipt((prev: any) =>
      prev
        ? {
            ...prev,
            status: "pending",
            sentTime: timeStr,
          }
        : prev,
    )
    setIsSendApprovalOpen(false)
  }

  const openCreateReceipt = () => {
    if (savedReceipt) {
      setReceiptCode(savedReceipt.code)
      setReceiptQuantity(savedReceipt.quantity)
      setReceiptQualityStatus(savedReceipt.qualityStatus)
      setReceiptNote(savedReceipt.note || "")
    } else {
      setReceiptCode(`NKTP-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`)
      setReceiptQuantity(order?.completed?.toString() || "0")
      setReceiptQualityStatus("good")
      setReceiptNote("")
    }
    setIsCreateReceiptOpen(true)
  }

  const handleAssignStage = () => {
    if (newStageName && newStageAssignee) {
      alert(`Đã phân công công đoạn "${newStageName}" cho nhân viên ${employees.find(e => e.id === newStageAssignee)?.name}`)
      setIsAssignOpen(false)
      setNewStageName("")
      setNewStageAssignee("")
    }
  }

  const handleSendReminder = () => {
    if (selectedEmployees.length > 0 && reminderMessage) {
      const employeeNames = selectedEmployees.map(id => {
        const stage = stages.find(s => s.id.toString() === id)
        return stage?.assignee
      }).join(", ")
      alert(`Đã gửi nhắc nhở đến: ${employeeNames}\nNội dung: ${reminderMessage}`)
      setIsReminderOpen(false)
      setReminderMessage("")
      setSelectedEmployees([])
    }
  }

  const handleConfirmComplete = () => {
    alert(`Đơn hàng ${order.id} đã được xác nhận hoàn thành!\n${completeNote ? `Ghi chú: ${completeNote}` : ""}`)
    setIsCompleteOpen(false)
    setCompleteNote("")
  }

  const handleCancelOrder = () => {
    alert(`Đơn hàng ${order.id} đã được hủy!\n${cancelReason ? `Lý do: ${cancelReason}` : ""}`)
    setIsCancelOpen(false)
    setCancelReason("")
    router.push("/production-management/orders")
  }

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  return (
    <DashboardLayout title="Chi tiết đơn sản xuất">
      <div className="space-y-6">
        {/* Breadcrumb & Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3 ml-auto">
            {order?.status === "pending" && (
              <Button 
                variant="outline" 
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => setIsCancelOpen(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Hủy đơn
              </Button>
            )}
            {order?.status !== "cancelled" && order?.status !== "complete" && (
              <Button className="bg-[#4A9C6B] hover:bg-[#4A9C6B]/90 text-white" onClick={() => setIsCompleteOpen(true)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Xác nhận hoàn thành
              </Button>
            )}
          </div>
        </div>

        <div className="w-full">
          {/* Order Info */}
          <Card className="p-6 bg-card border-border">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-card-foreground">
                  Thông tin đơn hàng
                </h3>
                <Badge
                  className={`${statusConfig[order?.status as keyof typeof statusConfig]?.color || statusConfig.pending.color} border-0`}
                >
                  {statusConfig[order?.status as keyof typeof statusConfig]?.label || "Không xác định"}
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mã đơn</p>
                    <p className="font-semibold text-card-foreground">{order?.id}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Sản phẩm</p>
                  <Link
                    href={`/production-management/products/${order?.productId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {order?.product}
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Số lượng đặt</p>
                    <p className="text-2xl font-bold text-card-foreground">{order?.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Đã hoàn thành</p>
                    <p className="text-2xl font-bold text-[#4A9C6B]">{order?.completed}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Tiến độ tổng thể</p>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4A9C6B] rounded-full transition-all"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                  <p className="text-right text-sm font-medium text-card-foreground mt-1">{overallProgress}%</p>
                </div>

                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Hạn hoàn thành</p>
                      <p className="text-sm font-medium text-card-foreground">{order?.deadline}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Người tạo</p>
                      <p className="text-sm font-medium text-card-foreground">{order?.createdBy}</p>
                    </div>
                  </div>
                </div>

                {order?.note && (
                  <div className="p-3 bg-secondary/10 rounded-lg border border-secondary/20">
                    <p className="text-xs text-secondary font-medium mb-1">Ghi chú</p>
                    <p className="text-sm text-card-foreground">{order?.note}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Warehouse Info */}
          <Card className="mt-6 p-6 bg-card border-border">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-card-foreground">Thông tin kho</h3>
                {isCompletedOrder && !savedReceipt && (
                  <Button onClick={openCreateReceipt} className="bg-[#4A9C6B] hover:bg-[#15803D] text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Tạo phiếu nhập kho
                  </Button>
                )}
              </div>

              {isCompletedOrder ? (
                <div className="space-y-4">
                  {savedReceipt ? (
                    savedReceipt.status === 'pending' ? (
                      <>
                        <div className="relative rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] p-4">
                          <div className="absolute top-4 right-4">
                            <Badge className="bg-[#E0F2FE] text-[#1E3A8A] border-0">{savedReceipt.code}</Badge>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#2563EB] mt-1.5 flex-shrink-0"></div>
                            <div className="flex-1">
                              <p className="font-medium text-[#1E3A8A]">Chờ quản lý kho xác nhận</p>
                              <p className="text-sm text-[#1E40AF] mt-1">Tạo lúc: {savedReceipt.savedTime}</p>
                              <div className="grid grid-cols-2 gap-4 mt-3">
                                <div>
                                  <p className="text-sm text-[#1E3A8A]">Số lượng nhập: <span className="font-semibold">{savedReceipt.quantity}</span></p>
                                </div>
                                <div>
                                  <p className="text-sm text-[#1E3A8A]">Chất lượng: <span className="font-semibold">{savedReceipt.qualityStatus === 'good' ? 'Đạt chất lượng' : savedReceipt.qualityStatus === 'minor' ? 'Có lỗi nhẹ' : 'Có lỗi nghiêm trọng'}</span></p>
                                </div>
                              </div>
                              <div className="mt-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2"><User className="h-4 w-4" /><span>Người tạo: {savedReceipt.creator || order?.createdBy}</span></div>
                                {savedReceipt.note && <p className="mt-2 text-sm text-card-foreground">Ghi chú: {savedReceipt.note}</p>}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-4 text-[#92400E]">
                          <p className="text-sm">Phiếu đang chờ Kho Manager xác nhận. Bạn sẽ nhận được thông báo khi phiếu được duyệt hoặc từ chối.</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="rounded-lg border-2 border-[#F59E0B] bg-[#FFFBEB] p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#F59E0B] mt-1.5 flex-shrink-0"></div>
                            <div className="flex-1">
                              <p className="font-medium text-[#92400E]">Phiếu nhập - Chờ xác nhận</p>
                              <p className="text-sm text-[#92400E] mt-1">Lưu lúc: {savedReceipt.savedTime}</p>
                              <div className="grid grid-cols-2 gap-4 mt-3">
                                <div>
                                  <p className="text-sm text-[#92400E]">Số lượng nhập: <span className="font-semibold">{savedReceipt.quantity}</span></p>
                                </div>
                                <div>
                                  <p className="text-sm text-[#92400E]">Chất lượng: <span className="font-semibold">{savedReceipt.qualityStatus === 'good' ? 'Đạt chất lượng' : savedReceipt.qualityStatus === 'minor' ? 'Có lỗi nhẹ' : 'Có lỗi nghiêm trọng'}</span></p>
                                </div>
                              </div>
                              {savedReceipt.note && <p className="mt-3 text-sm text-card-foreground">Ghi chú: {savedReceipt.note}</p>}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Button onClick={openCreateReceipt} className="bg-[#2B8BE8] hover:bg-[#2B8BE8]/90 text-white">Chỉnh sửa phiếu nhập</Button>
                          <Button onClick={() => setIsSendApprovalOpen(true)} className="bg-[#4A9C6B] hover:bg-[#15803D] text-white"><CheckCircle className="mr-2 h-4 w-4" />Gửi xác nhận nhập kho</Button>
                        </div>
                      </>
                    )
                  ) : (
                    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
                      <p className="text-sm text-[#64748B] mb-1">Trạng thái</p>
                      <p className="text-base font-medium text-[#334155]">Chưa nhập kho</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-muted/20 p-6 text-center">
                  <p className="text-base text-muted-foreground">Chỉ có thể tạo phiếu nhập kho khi đơn đã hoàn thành</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Dialogs and other UI (assign/reminder/complete/cancel) */}

      {/* Assign Stage Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">Phân công công đoạn mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stage-name">Tên công đoạn</Label>
              <Input id="stage-name" value={newStageName} onChange={(e) => setNewStageName(e.target.value)} placeholder="Nhập tên công đoạn..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage-assignee">Nhân viên phụ trách</Label>
              <Select value={newStageAssignee} onValueChange={setNewStageAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nhân viên" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}><div className="flex items-center gap-2"><span>{emp.name}</span><span className="text-xs text-muted-foreground">({emp.role})</span></div></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Hủy</Button>
              <Button onClick={handleAssignStage} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!newStageName || !newStageAssignee}>Phân công</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reminder Dialog */}
      <Dialog open={isReminderOpen} onOpenChange={setIsReminderOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">Nhắc nhở nhân viên</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Chọn nhân viên</Label>
              <div className="grid grid-cols-2 gap-2">
                {stages.filter(s => s.status !== 'complete' && s.status !== 'cancelled').map(stage => (
                  <button key={stage.id} type="button" onClick={() => toggleEmployeeSelection(stage.id.toString())} className={`p-3 rounded-lg border text-left transition-colors ${selectedEmployees.includes(stage.id.toString()) ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'}`}>
                    <p className="font-medium text-card-foreground">{stage.assignee}</p>
                    <p className="text-xs text-muted-foreground">{stage.name}</p>
                  </button>
                ))}
              </div>
              {selectedEmployees.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedEmployees.map(id => {
                    const stage = stages.find(s => s.id.toString() === id)
                    return stage ? (
                      <Badge key={id} variant="secondary" className="flex items-center gap-1">{stage.assignee}<X className="h-3 w-3 cursor-pointer" onClick={() => toggleEmployeeSelection(id)} /></Badge>
                    ) : null
                  })}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-message">Nội dung nhắc nhở</Label>
              <Textarea id="reminder-message" value={reminderMessage} onChange={(e) => setReminderMessage(e.target.value)} placeholder="Nhập nội dung nhắc nhở..." rows={3} />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsReminderOpen(false)}>Hủy</Button>
              <Button onClick={handleSendReminder} className="bg-secondary hover:bg-secondary/90 text-white" disabled={selectedEmployees.length === 0 || !reminderMessage}><Bell className="mr-2 h-4 w-4" />Gửi nhắc nhở</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Approval Dialog */}
      <Dialog open={isSendApprovalOpen} onOpenChange={setIsSendApprovalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#4A9C6B]">Gửi phiếu nhập kho để phê duyệt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
              <p className="text-sm text-[#1E3A8A] font-medium">Phiếu sẽ được chuyển sang trạng thái chờ quản lý kho xác nhận.</p>
              <div className="mt-3 space-y-1 text-sm text-[#1E40AF]">
                <p>Mã phiếu: <span className="font-semibold">{savedReceipt?.code}</span></p>
                <p>Số lượng: <span className="font-semibold">{savedReceipt?.quantity}</span></p>
                <p>Chất lượng: <span className="font-semibold">{savedReceipt?.qualityStatus === 'good' ? 'Đạt chất lượng' : savedReceipt?.qualityStatus === 'minor' ? 'Có lỗi nhẹ' : 'Có lỗi nghiêm trọng'}</span></p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsSendApprovalOpen(false)}>Hủy</Button>
              <Button onClick={handleSendApproval} className="bg-[#16A34A] hover:bg-[#15803D] text-white"><CheckCircle className="mr-2 h-4 w-4" />Xác nhận gửi phê duyệt</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Complete Dialog */}
      <Dialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#4A9C6B]">Xác nhận hoàn thành đơn hàng</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-[#E8F5EE] rounded-lg border border-[#4A9C6B]/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-10 w-10 text-[#4A9C6B]" />
                <div>
                  <p className="font-semibold text-card-foreground">{order?.id}</p>
                  <p className="text-sm text-muted-foreground">{order?.product}</p>
                  <p className="text-sm text-muted-foreground">Số lượng: {order?.quantity}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tổng kết tiến độ</Label>
              <div className="space-y-2">
                {stages.map(stage => (
                  <div key={stage.id} className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{stage.name}</span><Badge className={statusConfig[stage.status as keyof typeof statusConfig]?.color || statusConfig.pending.color}>{stage.progress}%</Badge></div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="complete-note">Ghi chú (tùy chọn)</Label>
              <Textarea id="complete-note" value={completeNote} onChange={(e) => setCompleteNote(e.target.value)} placeholder="Ghi chú về đơn hàng..." rows={2} />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsCompleteOpen(false)}>Hủy</Button>
              <Button onClick={handleConfirmComplete} className="bg-[#4A9C6B] hover:bg-[#4A9C6B]/90 text-white"><CheckCircle className="mr-2 h-4 w-4" />Xác nhận hoàn thành</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-destructive">Hủy đơn sản xuất</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20"><div className="flex items-center gap-3"><XCircle className="h-10 w-10 text-destructive" /><div><p className="font-semibold text-card-foreground">{order?.id}</p><p className="text-sm text-muted-foreground">{order?.product}</p><p className="text-sm text-muted-foreground">Số lượng: {order?.quantity}</p></div></div></div>
            <p className="text-sm text-muted-foreground">Bạn có chắc chắn muốn hủy đơn sản xuất này? Hành động này không thể hoàn tác.</p>
            <div className="space-y-2"><Label htmlFor="cancel-reason">Lý do hủy</Label><Textarea id="cancel-reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Nhập lý do hủy đơn..." rows={3} /></div>
            <div className="flex justify-end gap-3 pt-4"><Button variant="outline" onClick={() => setIsCancelOpen(false)}>Quay lại</Button><Button onClick={handleCancelOrder} className="bg-destructive hover:bg-destructive/90 text-white"><XCircle className="mr-2 h-4 w-4" />Xác nhận hủy đơn</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Warehouse Receipt Dialog */}
      <Dialog open={isCreateReceiptOpen} onOpenChange={setIsCreateReceiptOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">Tạo phiếu nhập kho thành phẩm</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">{order?.id} - {order?.product}</p>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="receipt-code">Mã phiếu nhập kho</Label>
                <Input id="receipt-code" value={receiptCode} readOnly className="bg-[#FFF9F4] border border-[#D8C7BB] rounded-md px-3 py-2" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receipt-quantity">Số lượng thực nhập kho <span className="text-destructive">*</span></Label>
                <div className="flex items-center gap-2"><Input id="receipt-quantity" type="number" value={receiptQuantity} onChange={(e) => setReceiptQuantity(e.target.value)} className="flex-1 bg-[#FFF9F4] border border-[#D8C7BB] rounded-md px-3 py-2" /><span className="text-muted-foreground/60 whitespace-nowrap">/ {order?.completed}</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="receipt-product">Sản phẩm</Label><Input id="receipt-product" value={order?.product} readOnly className="bg-[#FFF9F4] border border-[#D8C7BB] rounded-md px-3 py-2" /></div>
              <div className="space-y-2"><Label htmlFor="receipt-unit">Đơn vị</Label><Input id="receipt-unit" value="Cái" readOnly className="bg-[#FFF9F4] border border-[#D8C7BB] rounded-md px-3 py-2" /></div>
            </div>

            <div className="space-y-2">
              <Label>Tính trạng chất lượng</Label>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2"><input type="radio" id="quality-good" name="quality" value="good" checked={receiptQualityStatus === "good"} onChange={(e) => setReceiptQualityStatus(e.target.value)} className="accent-[#2563EB] w-4 h-4" /><Label htmlFor="quality-good" className="font-normal cursor-pointer">Đạt chất lượng</Label></div>
                <div className="flex items-center gap-2"><input type="radio" id="quality-minor" name="quality" value="minor" checked={receiptQualityStatus === "minor"} onChange={(e) => setReceiptQualityStatus(e.target.value)} className="accent-[#2563EB] w-4 h-4" /><Label htmlFor="quality-minor" className="font-normal cursor-pointer">Có lỗi nhẹ</Label></div>
                <div className="flex items-center gap-2"><input type="radio" id="quality-major" name="quality" value="major" checked={receiptQualityStatus === "major"} onChange={(e) => setReceiptQualityStatus(e.target.value)} className="accent-[#2563EB] w-4 h-4" /><Label htmlFor="quality-major" className="font-normal cursor-pointer">Có lỗi nghiêm trọng</Label></div>
              </div>
            </div>

            <div className="space-y-2"><Label htmlFor="receipt-note">Ghi chú</Label><Textarea id="receipt-note" value={receiptNote} onChange={(e) => setReceiptNote(e.target.value)} placeholder="Ví dụ: Ưu tiên giao 100 sản phẩm cho đơn hàng xuất khẩu" rows={3} className="bg-[#FFF9F4] border border-[#D8C7BB] rounded-md p-3" /></div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="quantity-order">Số lượng theo đơn sản xuất</Label><Input id="quantity-order" value={order?.completed} readOnly className="bg-[#FFF9F4] border border-[#D8C7BB] rounded-md px-3 py-2" /></div>
              <div className="space-y-2"><Label htmlFor="completion-date">Ngày hoàn thành sản xuất</Label><Input id="completion-date" type="date" value="2026-04-20" readOnly className="bg-[#FFF9F4] border border-[#D8C7BB] rounded-md px-3 py-2" /></div>
            </div>

            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="created-date">Ngày tạo phiếu</Label><Input id="created-date" type="date" value="2026-05-02" readOnly className="bg-[#FFF9F4] border border-[#D8C7BB] rounded-md px-3 py-2" /></div></div>

            <div className="space-y-2 pt-4 border-t border-border"><Label>Người tạo phiếu</Label><p className="text-base font-medium text-card-foreground">Nguyễn Văn A</p></div>

            <div className="flex justify-end gap-3 pt-4"><Button variant="outline" onClick={() => setIsCreateReceiptOpen(false)} className="bg-white text-card-foreground border-border">Hủy</Button><Button onClick={handleSaveDraft} className="bg-[#FFF9F4] border border-[#D8C7BB] text-card-foreground">Lưu nháp</Button><Button onClick={handleCreateReceipt} className="bg-[#4A9C6B] hover:bg-[#3f8b5a] text-white">Tạo phiếu nhập kho</Button></div>
          </div>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  )
}
