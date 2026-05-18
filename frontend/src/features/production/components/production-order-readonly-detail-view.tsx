"use client"

import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { CalendarDays, CheckCircle, ChevronLeft, Clock, Factory, FileText, Loader2, Package, User, XCircle, ClipboardList, UserPlus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ProductionOrderAssignmentDialog } from "@/features/production/components/production-order-assignment-dialog"
import { useCancelProductionOrder, useProductionOrder, useUpdateOrderStatus, useUpdateProductionOrder, useOrderBom } from "@/features/production/hooks/use-production"
import { PRODUCTION_ORDER_STATUS, getProductionOrderStatusConfig } from "@/features/production/utils/production-status"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const getStatusConfig = (status: string) => {
  switch (status?.toLowerCase()) {
    case "pending":
      return { label: "Chờ xử lý", color: "bg-gray-100 text-gray-700 border-gray-200" }
    case "ready_to_assign":
      return { label: "Sẵn sàng phân công", color: "text-green-700 border-green-300 bg-green-100/50", bgClass: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/50" }
    case "in_production":
    case "in_progress":
      return { label: "Đang sản xuất", color: "bg-blue-100 text-blue-700 border-blue-200" }
    case "completed":
      return { label: "Hoàn thành", color: "bg-emerald-100 text-emerald-700 border-emerald-200" }
    case "paused":
    case "on_hold":
      return { label: "Tạm dừng", color: "bg-amber-100 text-amber-700 border-amber-200" }
    case "waiting_material":
      return { label: "Chờ nguyên liệu", color: "bg-orange-100 text-orange-700 border-orange-200" }
    case "insufficient_materials":
      return { label: "Thiếu nguyên liệu", color: "bg-orange-100 text-orange-700 border-orange-200" }
    case "cancelled":
      return { label: "Đã hủy", color: "bg-red-100 text-red-700 border-red-200" }
    default:
      return { label: status || "Chưa xác định", color: "bg-gray-100 text-gray-700 border-gray-200" }
  }
}

const getPriorityConfig = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case "urgent":
      return { label: "Khẩn cấp", color: "text-red-700 bg-red-50 border-red-200" }
    case "high":
      return { label: "Cao", color: "text-orange-700 bg-orange-50 border-orange-200" }
    case "normal":
    case "medium":
      return { label: "Bình thường", color: "text-blue-700 bg-blue-50 border-blue-200" }
    case "low":
      return { label: "Thấp", color: "text-gray-700 bg-gray-50 border-gray-200" }
    default:
      return { label: priority || "Bình thường", color: "text-gray-700 bg-gray-50 border-gray-200" }
  }
}

const formatDate = (dateString?: string) => {
  if (!dateString) return "---"
  return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: vi })
}

interface ProductionOrderReadonlyDetailViewProps {
  id: string
  backHref: string
  canManage?: boolean
}

export function ProductionOrderReadonlyDetailView({ id, backHref, canManage = false }: ProductionOrderReadonlyDetailViewProps) {
  const router = useRouter()
  const { data: orderResponse, isLoading } = useProductionOrder(id)
  const { data: bomResponse, isLoading: isBomLoading } = useOrderBom(id)
  const updateOrderStatusMutation = useUpdateOrderStatus()
  const updateOrderMutation = useUpdateProductionOrder()
  const cancelOrderMutation = useCancelProductionOrder()

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isBomOpen, setIsBomOpen] = useState(false)
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isCompleteOpen, setIsCompleteOpen] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [completeNote, setCompleteNote] = useState("")
  const [cancelReason, setCancelReason] = useState("")
  const [editProducts, setEditProducts] = useState<any[]>([])
  const [editPriority, setEditPriority] = useState("")
  const [editDeadline, setEditDeadline] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [editReason, setEditReason] = useState("")

  const order = (orderResponse?.data as any)?.order || orderResponse?.data

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Đang lấy thông tin đơn sản xuất...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-muted p-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Không tìm thấy đơn sản xuất</h2>
          <p className="text-sm text-muted-foreground">Đơn có thể đã bị xóa, hoặc bạn không còn quyền truy cập.</p>
        </div>
        <Button variant="outline" onClick={() => router.push(backHref)}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Quay lại danh sách
        </Button>
      </div>
    )
  }

  const isCompletedOrder = order.status === PRODUCTION_ORDER_STATUS.COMPLETED
  const canAssignOrder = canManage && [PRODUCTION_ORDER_STATUS.READY_TO_ASSIGN, PRODUCTION_ORDER_STATUS.ASSIGNED].includes(order.status)
  const statusConfig = getProductionOrderStatusConfig(order.status)
  const priorityConfig = getPriorityConfig(order.priority)
  const creatorName = order.createdBy?.fullName || order.createdBy?.username || "Hệ thống"
  const totalQuantity = order.products?.reduce((sum: number, p: any) => sum + p.quantity, 0) || 0
  const totalCompleted = order.assignments?.reduce((sum: number, a: any) => sum + (a.completedQuantity || 0), 0) || 0
  const overallProgress = totalQuantity > 0 ? Math.min(100, Math.round((totalCompleted / totalQuantity) * 100)) : 0

  const handleOpenEdit = () => {
    if (!order) return
    setEditProducts(
      order.products.map((product: any) => ({
        productId: product.product?._id || product.product,
        productName: product.productName || product.product?.name,
        quantity: product.quantity,
      })),
    )
    setEditPriority(order.priority || "medium")
    setEditDeadline(order.deadline ? new Date(order.deadline).toISOString().split("T")[0] : "")
    setEditNotes(order.notes || "")
    setEditReason("")
    setIsEditOpen(true)
  }

  const handleUpdateEditProduct = (index: number, quantity: number) => {
    setEditProducts((products: any[]) => products.map((product, itemIndex) => (itemIndex === index ? { ...product, quantity } : product)))
  }

  const handleConfirmEdit = () => {
    if (!editReason.trim()) {
      toast.error("Vui lòng nhập lý do chỉnh sửa")
      return
    }

    updateOrderMutation.mutate(
      {
        id,
        data: {
          products: editProducts.map((product) => ({ productId: product.productId, quantity: product.quantity })),
          priority: editPriority,
          deadline: editDeadline,
          notes: editNotes,
          reason: editReason.trim(),
        },
      },
      {
        onSuccess: () => {
          setIsEditOpen(false)
        },
      },
    )
  }

  const handleConfirmComplete = () => {
    updateOrderStatusMutation.mutate(
      {
        id,
        status: "completed",
        notes: completeNote.trim(),
      },
      {
        onSuccess: () => {
          setIsCompleteOpen(false)
          setCompleteNote("")
        },
      },
    )
  }

  const handleCancelOrder = () => {
    if (!cancelReason.trim()) {
      toast.error("Vui lòng nhập lý do hủy đơn")
      return
    }

    cancelOrderMutation.mutate(
      {
        id,
        reason: cancelReason.trim(),
      },
      {
        onSuccess: () => {
          setIsCancelOpen(false)
          setCancelReason("")
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={() => router.push(backHref)} className="w-fit pl-0 hover:bg-transparent hover:text-primary">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Quay lại danh sách
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("border px-3 py-1 text-sm font-medium", statusConfig.color)}>
            Trạng thái: {statusConfig.label}
          </Badge>
          <Button variant="outline" onClick={() => setIsBomOpen(true)} className="border-primary text-primary hover:bg-primary/10">
            <ClipboardList className="mr-2 h-4 w-4" />
            Xem BOM
          </Button>
          {canAssignOrder && (
            <Button onClick={() => setIsAssignOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <UserPlus className="mr-2 h-4 w-4" />
              Phân công
            </Button>
          )}
          {canManage && !isCompletedOrder && order.status !== "cancelled" && (
            <Button variant="outline" onClick={handleOpenEdit}>
              Chỉnh sửa đơn
            </Button>
          )}
          {canManage && !isCompletedOrder && order.status !== "cancelled" && (
            <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => setIsCancelOpen(true)}>
              <XCircle className="mr-2 h-4 w-4" />
              Hủy đơn
            </Button>
          )}
          {canManage && order.status === PRODUCTION_ORDER_STATUS.IN_PRODUCTION && (
            <Button className="bg-[#4A9C6B] text-white hover:bg-[#4A9C6B]/90" onClick={() => setIsCompleteOpen(true)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Xác nhận hoàn thành
            </Button>
          )}
          {canManage && order.status === PRODUCTION_ORDER_STATUS.INSUFFICIENT_MATERIALS && (
            <Link href={`/alerts?tab=orders&createPO=true&orderId=${id}`}>
              <Button className="bg-amber-600 text-white hover:bg-amber-700">
                Nhập nguyên liệu
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit border-none bg-card shadow-sm lg:col-span-1">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Factory className="h-5 w-5 text-primary" /> Thông tin chung
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-4">
              <div>
                <p className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><FileText className="h-4 w-4" /> Mã đơn sản xuất</p>
                <p className="font-mono text-base font-medium">{order.orderCode}</p>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" /> Mức độ ưu tiên</p>
                <Badge variant="outline" className={cn("border font-medium", priorityConfig.color)}>{priorityConfig.label}</Badge>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" /> Ngày tạo</p>
                <p className="font-medium">{formatDate(order.createdAt)}</p>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" /> Hạn hoàn thành</p>
                <p className="font-medium text-destructive">{formatDate(order.deadline)}</p>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><User className="h-4 w-4" /> Người tạo đơn</p>
                <p className="font-medium">{creatorName}</p>
              </div>
            </div>

            {order.notes && (
              <div className="border-t border-border/50 pt-4">
                <p className="mb-2 text-sm text-muted-foreground">Ghi chú:</p>
                <div className="rounded-lg border border-border/30 bg-muted/40 p-3 text-sm italic text-foreground">{order.notes}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card className="border-none bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-primary" /> Sản phẩm yêu cầu
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="pl-6">Sản phẩm</TableHead>
                    <TableHead className="w-32 text-center">Số lượng cần</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.products?.map((item: any, idx: number) => {
                    const product = item.product || {}
                    return (
                      <TableRow key={item._id || `${product._id || "prod"}-${idx}`}>
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                              {product.productImage ? <img src={product.productImage} alt={product.name} className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-muted-foreground/50" />}
                            </div>
                            <div>
                              <p className="font-medium">{product.name || item.productName || "Sản phẩm không xác định"}</p>
                              <p className="font-mono text-xs text-muted-foreground">{product.code || item.productCode || "---"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-base font-bold">{item.quantity}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-none bg-card shadow-sm">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" /> Tiến độ & Phân công
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div>
                <div className="mb-2 flex items-end justify-between">
                  <p className="text-sm font-semibold text-muted-foreground">Tiến độ tổng thể</p>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary">{totalCompleted}</span>
                    <span className="text-sm text-muted-foreground"> / {totalQuantity}</span>
                    <span className="ml-2 font-bold text-[#4A9C6B]">{overallProgress}%</span>
                  </div>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-[#4A9C6B] transition-all duration-500" style={{ width: `${overallProgress}%` }} />
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-semibold text-muted-foreground">Chi tiết nhân sự</p>
                {order.assignments && order.assignments.length > 0 ? (
                  <div className="space-y-3">
                    {order.assignments.map((assign: any, idx: number) => {
                      const assignProgress = assign.assignedQuantity > 0 ? Math.round((assign.completedQuantity / assign.assignedQuantity) * 100) : 0
                      return (
                        <div key={idx} className="rounded-xl border border-border bg-muted/20 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-semibold text-card-foreground">{assign.staff?.fullName || assign.staff?.username || "Không xác định"}</p>
                                <p className="text-xs text-muted-foreground">Sản phẩm: {assign.product?.name || order.products?.find((p: any) => (p.product?._id || p.product) === (assign.product?._id || assign.product))?.productName || "Sản phẩm"}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="capitalize bg-card">{assign.status?.replace("_", " ") || "pending"}</Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Tiến độ: <span className="font-medium text-foreground">{assign.completedQuantity} / {assign.assignedQuantity}</span></span>
                              <span className="font-medium">{assignProgress}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${assignProgress}%` }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/10 py-8">
                    <User className="mb-2 h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Chưa có phân công nhân sự nào cho đơn hàng này.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={canManage && isCompleteOpen} onOpenChange={setIsCompleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#4A9C6B]">Xác nhận hoàn thành đơn hàng</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Sau khi hoàn thành, hệ thống sẽ cho phép tạo phiếu nhập thành phẩm tương ứng.</p>
            <div className="space-y-2">
              <Label htmlFor="complete-note">Ghi chú hoàn thành (tùy chọn)</Label>
              <Textarea id="complete-note" value={completeNote} onChange={(event) => setCompleteNote(event.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsCompleteOpen(false)}>Hủy</Button>
              <Button onClick={handleConfirmComplete} className="bg-[#4A9C6B] text-white hover:bg-[#4A9C6B]/90" disabled={updateOrderStatusMutation.isPending}>
                {updateOrderStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xác nhận"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {canAssignOrder && (
        <ProductionOrderAssignmentDialog
          open={isAssignOpen}
          onOpenChange={setIsAssignOpen}
          order={order}
        />
      )}

      <Dialog open={canManage && isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-destructive">Hủy đơn sản xuất</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Lý do hủy</Label>
              <Textarea id="cancel-reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsCancelOpen(false)}>Quay lại</Button>
              <Button onClick={handleCancelOrder} className="bg-destructive text-white hover:bg-destructive/90" disabled={cancelOrderMutation.isPending}>
                {cancelOrderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xác nhận hủy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={canManage && isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary">Chỉnh sửa đơn sản xuất</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Danh sách sản phẩm</Label>
              {editProducts.map((product, idx) => (
                <div key={`${product.productId}-${idx}`} className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
                  <div className="flex-1">
                    <p className="font-medium">{product.productName}</p>
                    <p className="text-xs text-muted-foreground">ID: {product.productId}</p>
                  </div>
                  <div className="w-32">
                    <Label className="text-xs">Số lượng</Label>
                    <input
                      type="number"
                      min={1}
                      value={product.quantity}
                      onChange={(event) => handleUpdateEditProduct(idx, Number(event.target.value))}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mức độ ưu tiên</Label>
                <select value={editPriority} onChange={(event) => setEditPriority(event.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="low">Thấp</option>
                  <option value="medium">Trung bình</option>
                  <option value="high">Cao</option>
                  <option value="urgent">Khẩn cấp</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Hạn hoàn thành</Label>
                <input type="date" value={editDeadline} onChange={(event) => setEditDeadline(event.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea value={editNotes} onChange={(event) => setEditNotes(event.target.value)} rows={2} />
            </div>

            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <Label className="font-bold text-amber-800">Lý do chỉnh sửa *</Label>
              <Textarea value={editReason} onChange={(event) => setEditReason(event.target.value)} rows={2} className="border-amber-300 focus-visible:ring-amber-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Hủy</Button>
            <Button onClick={handleConfirmEdit} disabled={updateOrderMutation.isPending || !editReason.trim()} className="bg-primary text-primary-foreground">
              {updateOrderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu thay đổi"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isBomOpen} onOpenChange={setIsBomOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-primary">
              <ClipboardList className="h-6 w-6" /> Định mức nguyên vật liệu (BOM)
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {isBomLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : bomResponse?.data?.items && bomResponse.data.items.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Mã</TableHead>
                      <TableHead>Tên vật tư</TableHead>
                      <TableHead className="text-right">Số lượng</TableHead>
                      <TableHead className="text-center">ĐVT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bomResponse.data.items.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{item.material?.code || "---"}</TableCell>
                        <TableCell className="font-medium">{item.material?.name || "Vật tư không xác định"}</TableCell>
                        <TableCell className="text-right font-bold">{item.qtyPerUnit}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{item.unit || item.material?.unit || "---"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
                <ClipboardList className="mb-2 h-10 w-10 opacity-20" />
                <p>Không tìm thấy thông tin BOM cho đơn sản xuất này.</p>
              </div>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setIsBomOpen(false)}>Đóng</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
