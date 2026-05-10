"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  User,
  Package,
  Calendar,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useProductionOrder, useUpdateOrderStatus } from "@/features/production/hooks/use-production"
import { format } from "date-fns"

const statusConfig = {
  pending: { label: "Chờ duyệt", color: "bg-[#F4C542] text-[#2C2C2C]", icon: Clock },
  "in_production": { label: "Đang sản xuất", color: "bg-[#2B8BE8] text-white", icon: Clock },
  "completed": { label: "Hoàn thành", color: "bg-[#4A9C6B] text-white", icon: CheckCircle },
  "cancelled": { label: "Đã hủy", color: "bg-[#E04E4E] text-white", icon: XCircle },
  "overdue": { label: "Trễ hạn", color: "bg-[#E04E4E] text-white", icon: AlertTriangle },
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: orderResponse, isLoading: orderLoading } = useProductionOrder(id)
  const updateStatusMutation = useUpdateOrderStatus()

  const order = orderResponse?.data as any

  const [isCompleteOpen, setIsCompleteOpen] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)

  const [completeNote, setCompleteNote] = useState("")
  const [cancelReason, setCancelReason] = useState("")

  const isCompletedOrder = order?.status === "completed"

  const handleConfirmComplete = () => {
    updateStatusMutation.mutate({
      id,
      status: "completed",
      notes: completeNote
    }, {
      onSuccess: () => {
        setIsCompleteOpen(false)
        setCompleteNote("")
      }
    })
  }

  const handleCancelOrder = () => {
    updateStatusMutation.mutate({
      id,
      status: "cancelled",
      notes: cancelReason
    }, {
      onSuccess: () => {
        setIsCancelOpen(false)
        setCancelReason("")
      }
    })
  }

  if (orderLoading) {
    return (
      <DashboardLayout title="Chi tiết đơn sản xuất">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (!order) {
    return (
      <DashboardLayout title="Chi tiết đơn sản xuất">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Không tìm thấy đơn sản xuất</p>
          <Button variant="ghost" onClick={() => router.back()} className="mt-4">
            Quay lại
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const productName = order.products?.[0]?.productName || (order.products?.[0]?.product as any)?.name || "N/A"
  const totalQuantity = order.products?.reduce((sum: number, p: any) => sum + p.quantity, 0) || 0
  const totalCompleted = order.products?.reduce((sum: number, p: any) => sum + (p.completedQuantity || 0), 0) || 0
  const overallProgress = totalQuantity > 0 ? Math.round((totalCompleted / totalQuantity) * 100) : 0

  return (
    <DashboardLayout title="Chi tiết đơn sản xuất">
      <div className="space-y-6">
        {/* Breadcrumb & Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push("/production-management/orders")}
            className="w-fit"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại danh sách
          </Button>

          <div className="flex flex-wrap gap-3">
            {order.status === "pending" && (
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => setIsCancelOpen(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Hủy đơn
              </Button>
            )}
            {order.status === "in_production" && (
              <Button
                className="bg-[#4A9C6B] hover:bg-[#4A9C6B]/90 text-white"
                onClick={() => setIsCompleteOpen(true)}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Xác nhận hoàn thành
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Order Info */}
          <Card className="p-6 bg-card border-border lg:col-span-1">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-card-foreground">
                  Thông tin đơn hàng
                </h3>
                <Badge
                  className={`${statusConfig[order.status as keyof typeof statusConfig]?.color || "bg-gray-500 text-white"} border-0`}
                >
                  {statusConfig[order.status as keyof typeof statusConfig]?.label || order.status}
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mã đơn</p>
                    <p className="font-semibold text-card-foreground">{order.orderCode}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Sản phẩm</p>
                  <div className="space-y-2">
                    {order.products?.map((p: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                        <Link
                          href={`/production-management/products/${p.product?._id || p.product}`}
                          className="font-medium text-primary hover:underline text-sm"
                        >
                          {p.productName || (p.product as any)?.name}
                        </Link>
                        <span className="text-xs font-semibold">{p.quantity} {p.product?.unit || 'cái'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Tổng số lượng</p>
                    <p className="text-2xl font-bold text-card-foreground">{totalQuantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Đã hoàn thành</p>
                    <p className="text-2xl font-bold text-[#4A9C6B]">{totalCompleted}</p>
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
                      <p className="text-sm font-medium text-card-foreground">
                        {order.deadline ? format(new Date(order.deadline), "dd/MM/yyyy") : "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Người tạo</p>
                      <p className="text-sm font-medium text-card-foreground">
                        {order.createdBy?.fullName || order.createdBy?.username || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {order.notes && (
                  <div className="p-3 bg-secondary/10 rounded-lg border border-secondary/20">
                    <p className="text-xs text-secondary font-medium mb-1">Ghi chú</p>
                    <p className="text-sm text-card-foreground">{order.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Assignments/Staff Info */}
          <Card className="p-6 bg-card border-border lg:col-span-2">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-card-foreground">Phân công nhân sự</h3>
              </div>

              {order.assignments && order.assignments.length > 0 ? (
                <div className="space-y-4">
                  {order.assignments.map((assign: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl border border-border bg-muted/20">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-card-foreground">
                              {assign.staff?.fullName || assign.staff?.username}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Sản phẩm: {assign.product?.name}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {assign.status?.replace('_', ' ') || 'Pending'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Tiến độ: {assign.completedQuantity} / {assign.quantity}</span>
                          <span>{Math.round((assign.completedQuantity / assign.quantity) * 100)}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(assign.completedQuantity / assign.quantity) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-20" />
                  <p className="text-muted-foreground">Chưa có phân công nhân sự</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push(`/production-management/orders/${id}/assign`)}>
                    Phân công ngay
                  </Button>
                </div>
              )}

              <div className="pt-6 border-t border-border">
                <h3 className="text-lg font-semibold text-card-foreground mb-4">Thông tin nhập kho</h3>
                {isCompletedOrder ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
                      <p className="text-sm text-[#64748B] mb-1">Trạng thái</p>
                      <p className="text-base font-medium text-[#334155]">Sẵn sàng nhập kho thành phẩm</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/20 p-6 text-center">
                    <p className="text-base text-muted-foreground">Chỉ có thể nhập kho khi đơn đã hoàn thành sản xuất</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

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
                  <p className="font-semibold text-card-foreground">{order.orderCode}</p>
                  <p className="text-sm text-muted-foreground">{productName}</p>
                  <p className="text-sm text-muted-foreground">Số lượng: {totalQuantity}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="complete-note">Ghi chú (tùy chọn)</Label>
              <Textarea id="complete-note" value={completeNote} onChange={(e) => setCompleteNote(e.target.value)} placeholder="Ghi chú về đơn hàng..." rows={2} />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsCompleteOpen(false)}>Hủy</Button>
              <Button
                onClick={handleConfirmComplete}
                className="bg-[#4A9C6B] hover:bg-[#4A9C6B]/90 text-white"
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Xác nhận hoàn thành
              </Button>
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
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <div className="flex items-center gap-3">
                <XCircle className="h-10 w-10 text-destructive" />
                <div>
                  <p className="font-semibold text-card-foreground">{order.orderCode}</p>
                  <p className="text-sm text-muted-foreground">{productName}</p>
                  <p className="text-sm text-muted-foreground">Số lượng: {totalQuantity}</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Bạn có chắc chắn muốn hủy đơn sản xuất này? Hành động này không thể hoàn tác.</p>
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Lý do hủy</Label>
              <Textarea id="cancel-reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Nhập lý do hủy đơn..." rows={3} />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsCancelOpen(false)}>Quay lại</Button>
              <Button
                onClick={handleCancelOrder}
                className="bg-destructive hover:bg-destructive/90 text-white"
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="mr-2 h-4 w-4" />}
                Xác nhận hủy đơn
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
