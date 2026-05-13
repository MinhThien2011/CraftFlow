"use client"

import { useState, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SlipDetailDialog } from "@/components/shared/slip-detail-dialog"
import { slipApi } from "@/api/slip.api"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  useProductionOrder, useUpdateOrderStatus, useAssignOrder, useStaffSuggestions, useSuggestedAssignments,
  useReassignTask,
  useCreateStockInSlip
} from "@/features/production/hooks/use-production"
import { format } from "date-fns"
import { Plus, Trash2, Sparkles, RefreshCw, Send, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

const statusConfig = {
  pending: { label: "Chờ duyệt", color: "bg-[#F4C542] text-[#2C2C2C]", icon: Clock },
  "in_production": { label: "Đang sản xuất", color: "bg-[#2B8BE8] text-white", icon: Clock },
  "completed": { label: "Hoàn thành", color: "bg-[#4A9C6B] text-white", icon: CheckCircle },
  "cancelled": { label: "Đã hủy", color: "bg-[#E04E4E] text-white", icon: XCircle },
  "overdue": { label: "Trễ hạn", color: "bg-[#E04E4E] text-white", icon: AlertTriangle },
}

const slipStatusConfig: Record<string, { label: string, color: string }> = {
  pending: { label: "Đang chờ", color: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
  received: { label: "Đã nhận hàng", color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  inspected: { label: "Đã kiểm tra", color: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
  in_stock: { label: "Đã vào kho - Chưa xác minh", color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
  completed: { label: "Đã hoàn tất", color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
  verified: { label: "Đã vào kho - Đã xác minh", color: "bg-teal-100 text-teal-700 hover:bg-teal-200" },
  cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-700 hover:bg-red-200" },
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const queryClient = useQueryClient()

  const { data: orderResponse, isLoading: orderLoading } = useProductionOrder(id)
  const updateStatusMutation = useUpdateOrderStatus()
  const assignMutation = useAssignOrder()
  const reassignMutation = useReassignTask()
  const createStockInSlipMutation = useCreateStockInSlip()
  const { data: staffSuggestions } = useStaffSuggestions()
  const { data: suggestionData, refetch: refetchSuggestions } = useSuggestedAssignments(id)

  const order = orderResponse?.data as any

  const [isCompleteOpen, setIsCompleteOpen] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isReassignOpen, setIsReassignOpen] = useState(false)
  const [isSlipDialogOpen, setIsSlipDialogOpen] = useState(false)

  const [completeNote, setCompleteNote] = useState("")
  const [cancelReason, setCancelReason] = useState("")

  // Assignment state
  const [assignments, setAssignments] = useState<{ staffId: string, productId: string, assignedQuantity: number }[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)
  const [newStaffId, setNewStaffId] = useState("")
  const [reassignReason, setReassignReason] = useState("")
  const [stockInSlip, setStockInSlip] = useState<any>(null)

  const isCompletedOrder = order?.status === "completed"

  // Fetch slips to see if this order already has one
  const { data: slipData } = useQuery({
    queryKey: ['slips', 'import', 'order', id],
    queryFn: () => slipApi.getSlips({ type: 'import', search: order?.orderCode }),
    enabled: !!order?.orderCode,
  })

  // Mutation to update slip details
  const updateDetailsMutation = useMutation({
    mutationFn: ({ slipId, data }: { slipId: string, data: any }) =>
      slipApi.updateSlipDetails(slipId, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['slips', 'import', 'order', id] })
      toast.success("Đã lưu thay đổi thông tin phiếu thành công")
      setIsSlipDialogOpen(false)
      if (data?.data) {
        setStockInSlip(data.data)
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Lỗi khi lưu thay đổi thông tin phiếu")
    }
  })

  // Check if slip exists in response
  const slips = slipData?.data?.data?.slips || slipData?.data?.slips || [];
  const existingSlip = slips.find((s: any) => 
    (s.relatedProductionOrder === order?._id) || 
    (s.relatedProductionOrder?._id === order?._id) ||
    s.reason?.includes(order?.orderCode) ||
    s.slipNumber?.includes(order?.orderCode)
  )

  useEffect(() => {
    if (order?.stockInSlip && !stockInSlip) {
      setStockInSlip(order.stockInSlip)
    } else if (existingSlip && !stockInSlip) {
      setStockInSlip(existingSlip)
    }
  }, [order, existingSlip, stockInSlip])

  const handleOpenAssign = () => {
    if (order?.products) {
      // Pre-fill with existing assignments if any, otherwise empty
      if (order.assignments && order.assignments.length > 0) {
        setAssignments(order.assignments.map((a: any) => ({
          staffId: a.staff?._id || a.staff,
          productId: a.product?._id || a.product,
          assignedQuantity: a.assignedQuantity || a.quantity
        })))
      } else {
        const staffList = (staffSuggestions as any)?.data?.suggestions || []
        const topStaffId = staffList.length > 0 ? staffList[0]._id : ""

        const initialAssignments = order.products.map((p: any) => ({
          staffId: topStaffId,
          productId: p.product?._id || p.product,
          assignedQuantity: p.quantity
        }))
        setAssignments(initialAssignments)
      }
      setIsAssignOpen(true)
    }
  }

  const handleAutoSuggest = async () => {
    const { data } = await refetchSuggestions()
    if (data?.data?.suggestions) {
      setAssignments(data.data.suggestions)
    }
  }

  const handleAddStaffRow = (productId: string) => {
    const staffList = (staffSuggestions as any)?.data?.suggestions || []
    const topStaffId = staffList.length > 0 ? staffList[0]._id : ""

    setAssignments([...assignments, {
      staffId: topStaffId,
      productId,
      assignedQuantity: 0
    }])
  }

  const handleRemoveStaffRow = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index))
  }

  const handleConfirmAssign = () => {
    const validAssignments = assignments.filter(a => a.staffId && a.assignedQuantity > 0)
    if (validAssignments.length === 0) return

    assignMutation.mutate({
      orderId: id,
      assignments: validAssignments
    }, {
      onSuccess: () => {
        setIsAssignOpen(false)
      }
    })
  }

  const handleOpenReassign = (assign: any) => {
    setSelectedAssignment(assign)
    setNewStaffId(assign.staff?._id || "")
    setReassignReason("")
    setIsReassignOpen(true)
  }

  const handleConfirmReassign = () => {
    if (!selectedAssignment || !newStaffId) return

    reassignMutation.mutate({
      assignmentId: selectedAssignment._id,
      newStaffId,
      reason: reassignReason
    }, {
      onSuccess: () => {
        setIsReassignOpen(false)
        setSelectedAssignment(null)
      }
    })
  }

  const handleUpdateAssignment = (index: number, field: string, value: any) => {
    const newAssignments = [...assignments]
    newAssignments[index] = { ...newAssignments[index], [field]: value }
    setAssignments(newAssignments)
  }

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

  const handleCreateStockIn = () => {
    createStockInSlipMutation.mutate({ id }, {
      onSuccess: (res: any) => {
        toast.success("Đã tạo phiếu nhập kho thành công")
        queryClient.invalidateQueries({ queryKey: ['slips', 'import', 'order', id] })
        const newSlip = res?.data?.slip || res?.data || res
        if (newSlip && newSlip._id) {
            setStockInSlip(newSlip)
            setIsSlipDialogOpen(true)
        }
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || err?.message || "Lỗi khi tạo phiếu nhập kho")
      }
    })
  }

  const handleSaveSlip = (info: any, items: any[]) => {
    if (!stockInSlip) return
    updateDetailsMutation.mutate({
      slipId: stockInSlip._id,
      data: {
        ...info,
        items: items.map((item: any) => ({
          ...item,
          quantity: {
            ...item.quantity,
            actual: item.quantity.actual
          }
        }))
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
          {!isCompletedOrder && (
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
                                Sản phẩm: {assign.product?.name || (order.products.find((p: any) => (p.product?._id || p.product) === (assign.product?._id || assign.product))?.productName || "Sản phẩm")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
                              onClick={() => handleOpenReassign(assign)}
                            >
                              <RefreshCw className="h-3 w-3" />
                              Thay đổi
                            </Button>
                            <Badge variant="outline" className="capitalize">
                              {assign.status?.replace('_', ' ') || 'Pending'}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>Tiến độ: {assign.completedQuantity} / {assign.assignedQuantity}</span>
                            <span>{Math.round((assign.completedQuantity / assign.assignedQuantity) * 100)}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${(assign.completedQuantity / assign.assignedQuantity) * 100}%` }}
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
                    <Button variant="outline" size="sm" className="mt-4" onClick={handleOpenAssign}>
                      Phân công ngay
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Stock In Section (Full width if completed) */}
          <Card className={cn("p-6 bg-card border-border", isCompletedOrder ? "lg:col-span-2" : "lg:col-span-2")}>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-card-foreground">Thông tin nhập kho</h3>
              </div>

              {isCompletedOrder ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-emerald-800 font-bold flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Sản xuất đã hoàn thành
                      </p>
                      <p className="text-sm text-emerald-600">
                        Đơn hàng đã sẵn sàng để nhập kho thành phẩm.
                      </p>
                    </div>
                    {stockInSlip ? (
                      <Button
                        onClick={() => setIsSlipDialogOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Xem phiếu nhập kho
                      </Button>
                    ) : (
                      <Button
                        onClick={handleCreateStockIn}
                        disabled={createStockInSlipMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                      >
                        {createStockInSlipMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Tạo phiếu nhập kho
                      </Button>
                    )}
                  </div>

                  {/* Summary of finished products */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Thành phẩm cần nhập kho</p>
                    <div className="grid gap-3">
                      {order.products?.map((p: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-xl border border-border shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                              <Package className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{p.productName || (p.product as any)?.name}</p>
                              <p className="text-xs text-muted-foreground">{p.productCode || (p.product as any)?.code}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-emerald-600">{p.quantity}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">{p.product?.unit || 'cái'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
                  <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                  <p className="text-base text-muted-foreground">Chỉ có thể nhập kho khi đơn đã hoàn thành sản xuất</p>
                </div>
              )}
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

      {/* Assignment Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent size="lg">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <DialogTitle className="text-xl font-bold">Phân công nhân sự</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              className="text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 gap-2"
              onClick={handleAutoSuggest}
            >
              <Sparkles className="h-4 w-4" />
              Gợi ý phân công
            </Button>
          </DialogHeader>
          <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
            {order?.products?.map((product: any) => {
              const productId = product.product?._id || product.product;
              const productAssignments = assignments.filter(a => a.productId === productId);
              const totalAssigned = productAssignments.reduce((sum, a) => sum + a.assignedQuantity, 0);
              const isOverAssigned = totalAssigned > product.quantity;

              return (
                <div key={productId} className="space-y-3">
                  <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-dashed">
                    <div>
                      <span className="font-semibold text-sm">{product.productName || (product.product as any)?.name}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">Số lượng yêu cầu: {product.quantity}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={isOverAssigned ? "destructive" : totalAssigned === product.quantity ? "secondary" : "outline"} className="text-[10px]">
                        Đã chia: {totalAssigned} / {product.quantity}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] ml-2 gap-1"
                        onClick={() => handleAddStaffRow(productId)}
                      >
                        <Plus className="h-3 w-3" /> Thêm nhân viên
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {assignments.map((assign, index) => {
                      if (assign.productId !== productId) return null;
                      return (
                        <div key={index} className="flex items-end gap-3 p-3 rounded-lg border bg-card shadow-sm group">
                          <div className="flex-1 space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Nhân viên</Label>
                            <Select value={assign.staffId} onValueChange={(val) => handleUpdateAssignment(index, 'staffId', val)}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Chọn nhân viên..." />
                              </SelectTrigger>
                              <SelectContent>
                                {((staffSuggestions as any)?.data?.suggestions || []).map((staff: any, idx: number) => (
                                  <SelectItem key={staff._id} value={staff._id}>
                                    <div className="flex items-center justify-between w-full gap-2">
                                      <span>{staff.fullName} ({staff.currentAssignedQuantity || 0} task)</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="w-32 space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Số lượng</Label>
                            <Input
                              className="h-9"
                              type="number"
                              value={assign.assignedQuantity}
                              onChange={(e) => handleUpdateAssignment(index, 'assignedQuantity', Number(e.target.value))}
                            />
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveStaffRow(index)}
                            disabled={productAssignments.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Hủy</Button>
            <Button
              onClick={handleConfirmAssign}
              className="bg-primary text-primary-foreground"
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Xác nhận phân công
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign Staff Dialog */}
      <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Thay đổi nhân sự</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedAssignment && (
              <div className="p-3 bg-muted/30 rounded-lg border border-dashed text-sm">
                <p><span className="text-muted-foreground">Sản phẩm:</span> <span className="font-semibold">{selectedAssignment.product?.name || (order.products.find((p: any) => (p.product?._id || p.product) === (selectedAssignment.product?._id || selectedAssignment.product))?.productName)}</span></p>
                <p><span className="text-muted-foreground">Số lượng:</span> <span className="font-semibold">{selectedAssignment.assignedQuantity}</span></p>
                <p><span className="text-muted-foreground">Nhân viên hiện tại:</span> <span className="font-semibold text-primary">{selectedAssignment.staff?.fullName || selectedAssignment.staff?.username}</span></p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Chọn nhân viên mới</Label>
              <Select value={newStaffId} onValueChange={setNewStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nhân viên thay thế..." />
                </SelectTrigger>
                <SelectContent>
                  {((staffSuggestions as any)?.data?.suggestions || []).map((staff: any) => (
                    <SelectItem key={staff._id} value={staff._id} disabled={staff._id === selectedAssignment?.staff?._id}>
                      {staff.fullName} ({staff.currentAssignedQuantity || 0} task)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reassign-reason">Lý do thay đổi (tùy chọn)</Label>
              <Textarea
                id="reassign-reason"
                placeholder="Nhập lý do thay đổi nhân sự..."
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsReassignOpen(false)}>Hủy</Button>
              <Button
                onClick={handleConfirmReassign}
                className="bg-primary text-primary-foreground"
                disabled={reassignMutation.isPending || !newStaffId || newStaffId === selectedAssignment?.staff?._id}
              >
                {reassignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Xác nhận thay đổi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Slip Detail Dialog */}
      <SlipDetailDialog
        open={isSlipDialogOpen}
        onOpenChange={setIsSlipDialogOpen}
        slip={stockInSlip}
        type="import"
        statusConfig={slipStatusConfig}
        onSave={handleSaveSlip}
        isUpdating={updateDetailsMutation.isPending}
      />
    </DashboardLayout>
  )
}
