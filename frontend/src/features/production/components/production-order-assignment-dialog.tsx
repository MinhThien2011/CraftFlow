"use client"

import { useEffect, useMemo, useState } from "react"
import { Info, Loader2, Package, Plus, Sparkles, Trash2, Users } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useAssignOrder, useStaffSuggestions } from "@/features/production/hooks/use-production"
import { PRODUCTION_ORDER_STATUS } from "@/features/production/utils/production-status"

type AssignmentRow = {
  staffId: string
  productId: string
  assignedQuantity: number
}

type ProductOption = {
  id: string
  name: string
  code: string
  quantity: number
}

type StaffOption = {
  _id: string
  fullName?: string
  username?: string
  currentAssignedQuantity?: number
}

interface ProductionOrderAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: any
}

const IDEAL_QUANTITY_PER_STAFF = 200

const getProductId = (item: any) => item.product?._id || item.product
const getStaffWorkload = (staff: StaffOption) => Number(staff.currentAssignedQuantity || 0)

const getTargetStaffCount = (quantity: number, staffCount: number) => {
  if (quantity <= 0 || staffCount === 0) return 0

  const workloadBasedCount = Math.ceil(quantity / IDEAL_QUANTITY_PER_STAFF)
  const minimumBalancedCount = quantity > 1 && staffCount > 1 ? 2 : 1
  const largeOrderCount = quantity > 1000 && staffCount > 5 ? Math.floor(staffCount * 0.5) : 1

  return Math.min(quantity, staffCount, Math.max(minimumBalancedCount, workloadBasedCount, largeOrderCount))
}

const buildBalancedSuggestions = (
  products: ProductOption[],
  staffList: StaffOption[],
  remainingByProduct: Map<string, number>,
) => {
  const projectedWorkload = new Map(staffList.map((staff) => [staff._id, getStaffWorkload(staff)]))
  const nextRows: AssignmentRow[] = []

  for (const product of products) {
    const remainingQuantity = Math.floor(remainingByProduct.get(product.id) || 0)
    const targetStaffCount = getTargetStaffCount(remainingQuantity, staffList.length)

    if (remainingQuantity <= 0 || targetStaffCount === 0) continue

    const selectedStaff = [...staffList]
      .sort((left, right) => (projectedWorkload.get(left._id) || 0) - (projectedWorkload.get(right._id) || 0))
      .slice(0, targetStaffCount)

    const baseQuantity = Math.floor(remainingQuantity / selectedStaff.length)
    let remainder = remainingQuantity % selectedStaff.length

    for (const staff of selectedStaff) {
      const assignedQuantity = baseQuantity + (remainder > 0 ? 1 : 0)
      remainder -= 1

      if (assignedQuantity > 0) {
        nextRows.push({ staffId: staff._id, productId: product.id, assignedQuantity })
        projectedWorkload.set(staff._id, (projectedWorkload.get(staff._id) || 0) + assignedQuantity)
      }
    }
  }

  return nextRows
}

export function ProductionOrderAssignmentDialog({ open, onOpenChange, order }: ProductionOrderAssignmentDialogProps) {
  const assignOrderMutation = useAssignOrder()
  const { data: staffResponse, isLoading: isStaffLoading } = useStaffSuggestions(open)
  const [rows, setRows] = useState<AssignmentRow[]>([])

  const products = useMemo<ProductOption[]>(() => {
    return (order?.products || [])
      .map((item: any) => ({
        id: getProductId(item),
        name: item.product?.name || item.productName || "Sản phẩm không xác định",
        code: item.product?.code || item.productCode || "---",
        quantity: Number(item.quantity || 0),
      }))
      .filter((product: ProductOption) => Boolean(product.id))
  }, [order?.products])

  const staffList = useMemo<StaffOption[]>(() => {
    return staffResponse?.data?.suggestions || []
  }, [staffResponse])

  const existingAssignedByProduct = useMemo(() => {
    const assigned = new Map<string, number>()

    for (const assignment of order?.assignments || []) {
      const productId = assignment.product?._id || assignment.product
      assigned.set(productId, (assigned.get(productId) || 0) + Number(assignment.assignedQuantity || 0))
    }

    return assigned
  }, [order?.assignments])

  const rowAssignedByProduct = useMemo(() => {
    const assigned = new Map<string, number>()

    for (const row of rows) {
      assigned.set(row.productId, (assigned.get(row.productId) || 0) + Number(row.assignedQuantity || 0))
    }

    return assigned
  }, [rows])

  const remainingByProduct = useMemo(() => {
    const remaining = new Map<string, number>()

    for (const product of products) {
      remaining.set(product.id, Math.max(0, product.quantity - (existingAssignedByProduct.get(product.id) || 0)))
    }

    return remaining
  }, [existingAssignedByProduct, products])

  useEffect(() => {
    if (!open) return

    const firstAssignableProduct = products.find((product) => (remainingByProduct.get(product.id) || 0) > 0)
    setRows(
      firstAssignableProduct
        ? [{ staffId: "", productId: firstAssignableProduct.id, assignedQuantity: remainingByProduct.get(firstAssignableProduct.id) || 1 }]
        : [],
    )
  }, [open, products, remainingByProduct])

  const updateRow = (index: number, patch: Partial<AssignmentRow>) => {
    setRows((currentRows) => currentRows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)))
  }

  const addRow = () => {
    const product = products.find((item) => (remainingByProduct.get(item.id) || 0) > (rowAssignedByProduct.get(item.id) || 0))

    if (!product) {
      toast.error("Tất cả sản phẩm đã được phân công đủ số lượng")
      return
    }

    const remainingQuantity = (remainingByProduct.get(product.id) || 0) - (rowAssignedByProduct.get(product.id) || 0)
    setRows((currentRows) => [...currentRows, { staffId: "", productId: product.id, assignedQuantity: Math.max(1, remainingQuantity) }])
  }

  const removeRow = (index: number) => {
    setRows((currentRows) => currentRows.filter((_, rowIndex) => rowIndex !== index))
  }

  const applySuggestions = () => {
    if (isStaffLoading) {
      toast.error("Danh sách nhân sự đang được tải, vui lòng thử lại sau")
      return
    }

    if (staffList.length === 0) {
      toast.error("Chưa có nhân sự khả dụng để phân công")
      return
    }

    const nextRows = buildBalancedSuggestions(products, staffList, remainingByProduct)

    if (nextRows.length === 0) {
      toast.error("Chưa có gợi ý phân công phù hợp cho đơn này")
      return
    }

    setRows(nextRows)
    toast.success("Đã tạo gợi ý phân công cân bằng theo khối lượng hiện tại")
  }

  const validateRows = () => {
    if (rows.length === 0) return "Vui lòng thêm ít nhất một dòng phân công"

    for (const row of rows) {
      if (!row.staffId) return "Vui lòng chọn nhân sự cho tất cả dòng phân công"
      if (!row.productId) return "Vui lòng chọn sản phẩm cho tất cả dòng phân công"
      if (!Number.isInteger(Number(row.assignedQuantity)) || Number(row.assignedQuantity) < 1) {
        return "Số lượng phân công phải là số nguyên lớn hơn 0"
      }
    }

    for (const [productId, assignedQuantity] of rowAssignedByProduct.entries()) {
      const remaining = remainingByProduct.get(productId) || 0

      if (assignedQuantity > remaining) {
        const productName = products.find((product) => product.id === productId)?.name || "sản phẩm"
        return `Số lượng phân công của ${productName} vượt quá số lượng còn lại`
      }
    }

    return null
  }

  const handleSubmit = () => {
    const errorMessage = validateRows()

    if (errorMessage) {
      toast.error(errorMessage)
      return
    }

    assignOrderMutation.mutate(
      {
        orderId: order._id,
        assignments: rows.map((row) => ({
          staffId: row.staffId,
          productId: row.productId,
          assignedQuantity: Number(row.assignedQuantity),
        })),
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  }

  const validationMessage = validateRows()
  const hasAssignableQuantity = products.some((product) => (remainingByProduct.get(product.id) || 0) > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] flex-col gap-0 overflow-hidden rounded-2xl border-none p-0 shadow-2xl sm:max-w-[90vw] lg:max-w-[1000px]">
        <div className="shrink-0 border-b bg-primary/5 px-6 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-primary">
              <Users className="h-5 w-5" />
              Phân công nhân sự
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto bg-gray-50/30 p-6 dark:bg-background/80">
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/20">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-blue-900 dark:text-blue-100">
                Lệnh sản xuất: <span className="font-mono">{order?.orderCode}</span>
              </p>
              <p className="text-sm leading-relaxed text-blue-800/80 dark:text-blue-200/70">
                Chỉ có thể phân công khi đơn đang ở trạng thái sẵn sàng phân công hoặc đã phân công. Đơn thiếu vật liệu cần nhập đủ vật liệu trước.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-base font-bold text-foreground">
              <Package className="h-5 w-5 text-primary" />
              Tiến độ cần phân công
            </Label>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => {
                const remaining = remainingByProduct.get(product.id) || 0
                const progress = product.quantity > 0 ? Math.max(0, Math.min(100, ((product.quantity - remaining) / product.quantity) * 100)) : 0

                return (
                  <div key={product.id} className="rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="line-clamp-1 font-semibold text-foreground" title={product.name}>
                        {product.name}
                      </div>
                      <span className="shrink-0 rounded-md border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {product.code}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Cần làm: <span className="font-medium text-foreground">{product.quantity}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Còn lại: <span className="font-bold text-primary">{remaining}</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary transition-all duration-500 ease-in-out" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <Label className="flex items-center gap-2 text-base font-bold text-foreground">
                <Users className="h-5 w-5 text-primary" />
                Danh sách nhân sự thực hiện
              </Label>
              <div className="flex flex-wrap gap-2">
                {order?.status === PRODUCTION_ORDER_STATUS.READY_TO_ASSIGN && (
                  <Button type="button" variant="outline" onClick={applySuggestions} disabled={isStaffLoading} className="shadow-sm">
                    {isStaffLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-amber-500" />}
                    Gợi ý tự động
                  </Button>
                )}
                <Button type="button" onClick={addRow} disabled={!hasAssignableQuantity} className="shadow-sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm nhân sự
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-12 text-center shadow-sm">
                  <Users className="mb-3 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-foreground">Chưa có phân công nào</p>
                  <p className="mt-1 text-xs text-muted-foreground">Bấm "Thêm nhân sự" hoặc "Gợi ý tự động" để bắt đầu</p>
                </div>
              ) : (
                rows.map((row, index) => (
                  <div
                    key={`${row.productId}-${index}`}
                    className="group relative grid gap-4 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/50 sm:grid-cols-[1fr_1fr_120px] md:grid-cols-[2fr_2fr_150px_40px] md:items-end"
                  >
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nhân sự</Label>
                      <select
                        value={row.staffId}
                        onChange={(event) => updateRow(index, { staffId: event.target.value })}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50"
                        disabled={isStaffLoading}
                      >
                        <option value="">{isStaffLoading ? "Đang tải..." : "Chọn nhân sự"}</option>
                        {staffList.map((staff) => (
                          <option key={staff._id} value={staff._id}>
                            {staff.fullName || staff.username} (Đang làm: {staff.currentAssignedQuantity || 0})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sản phẩm</Label>
                      <select
                        value={row.productId}
                        onChange={(event) => updateRow(index, { productId: event.target.value })}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      >
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Số lượng</Label>
                      <input
                        type="number"
                        min={1}
                        value={row.assignedQuantity}
                        onChange={(event) => updateRow(index, { assignedQuantity: Number(event.target.value) })}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-right text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(index)}
                      className="h-10 w-10 p-0 text-destructive shadow-sm transition-all hover:bg-destructive/10 hover:text-destructive sm:absolute sm:-right-2 sm:-top-2 sm:h-8 sm:w-8 sm:rounded-full sm:bg-background sm:opacity-0 sm:group-hover:opacity-100 md:relative md:right-auto md:top-auto md:h-10 md:w-10 md:rounded-md md:bg-transparent md:opacity-100 md:shadow-none"
                      title="Xóa phân công"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {validationMessage && rows.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                <Info className="h-4 w-4" />
                {validationMessage}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-3 rounded-b-2xl border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="px-6">
            Hủy bỏ
          </Button>
          <Button onClick={handleSubmit} disabled={assignOrderMutation.isPending || !!validationMessage} className="px-8 shadow-md">
            {assignOrderMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Xác nhận phân công"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
