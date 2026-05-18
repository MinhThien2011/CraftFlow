import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, Loader2, Plus, X } from "lucide-react"
import { purchaseOrderApi } from "@/api/purchaseOrder.api"
import { materialApi } from "@/api/material.api"
import { productionApi } from "@/api/production.api"
import { toast } from "sonner"
import { Material } from "@/app/alerts/types"
import { FieldError } from "./restock-dialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedMaterials: Material[]
  onSuccess: () => void
}

type BatchItem = { material: Material; quantity: string; isManual?: boolean }

const getProductionOrderId = (value: any): string => {
  if (!value) return ""
  if (typeof value === "string") return value
  return value?._id || ""
}

export function BatchRestockDialog({ open, onOpenChange, selectedMaterials, onSuccess }: Props) {
  const [batchItems, setBatchItems] = useState<BatchItem[]>([])
  const [note, setNote] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [order, setOrder] = useState("")
  const [availableMaterials, setAvailableMaterials] = useState<any[]>([])
  const [insufficientOrders, setInsufficientOrders] = useState<any[]>([])
  const [error, setError] = useState("")
  const [isDone, setIsDone] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const defaultManualMaterial = useMemo(
    () => ({ _id: "", name: "Chon vat tu...", code: "", unit: "dv", currentStock: 0, threshold: 0, price: 0 }),
    [],
  )

  useEffect(() => {
    if (!open) return

    setIsDone(false)
    setError("")
    setNote("")

    const items = selectedMaterials.map((material) => {
      const needed = material.alertType === "order_requirement"
        ? material.shortageQuantity || material.threshold - material.currentStock || 1
        : Math.max(0, material.threshold - material.currentStock) || 1
      return { material, quantity: String(needed) }
    })
    setBatchItems(items)

    const orderIds = selectedMaterials.map((material) => getProductionOrderId(material.productionOrder)).filter(Boolean)
    const uniqueOrders = Array.from(new Set(orderIds))
    if (uniqueOrders.length === 1) {
      setOrder(uniqueOrders[0])
      setPriority("high")
    } else {
      setOrder("")
      setPriority("medium")
    }

    if (availableMaterials.length === 0) {
      ; (materialApi as any).getMaterials?.({ limit: 1000 }).then((res: any) => {
        setAvailableMaterials(res.data?.materials || res.data?.items || res.data || [])
      })
    }

    if (insufficientOrders.length === 0) {
      const request = (productionApi as any).getAll
        ? (productionApi as any).getAll({ status: "insufficient_materials", limit: 100 })
        : (productionApi as any).getOrders({ status: "insufficient_materials", limit: 100 })
      request.then((res: any) => setInsufficientOrders(res.data?.orders || res.data?.items || res.data || []))
    }
  }, [open, selectedMaterials, availableMaterials.length, insufficientOrders.length])

  const addEmptyBatchItem = () => {
    setBatchItems((prev) => [...prev, { material: defaultManualMaterial as Material, quantity: "1", isManual: true }])
  }

  const handleBatchRestock = async () => {
    const validItems = batchItems.filter((item) => item.material._id)
    if (validItems.length === 0) {
      setError("Vui long them it nhat 1 vat tu")
      return
    }
    if (validItems.some((item) => !item.quantity || Number(item.quantity) <= 0)) {
      setError("Vui long nhap so luong hop le")
      return
    }

    setIsLoading(true)
    try {
      const payload: any = {
        orderReason: note || `Yeu cau nhap hang cho ${validItems.length} vat tu`,
        priority,
        purchaseOrderItems: validItems.map((item) => ({
          material: item.material._id,
          quantity: Number(item.quantity),
          materialCode: item.material.code,
          unit: item.material.unit,
          priceAtTimePurchase: item.material.price || 0,
          totalPriceAtTimePurchase: (item.material.price || 0) * Number(item.quantity),
        })),
      }
      if (order) payload.productionOrder = getProductionOrderId(order)

      const alertIds = validItems
        .filter((item) => item.material.alertType === "order_requirement")
        .map((item) => item.material.alertId)
        .filter(Boolean)
      const sourceProductionOrderIds = Array.from(new Set(
        validItems
          .filter((item) => item.material.alertType === "order_requirement")
          .map((item) => getProductionOrderId(item.material.productionOrder))
          .filter(Boolean)
      ))
      if (alertIds.length > 0) {
        payload.materialAlert = alertIds[0]
        payload.materialAlerts = alertIds
      }
      if (sourceProductionOrderIds.length > 0) {
        payload.sourceProductionOrders = sourceProductionOrderIds
      }

      const res: any = await purchaseOrderApi.create(payload)
      if (res.success || res.status === "success") {
        toast.success("Da tao yeu cau mua hang thanh cong")
        onSuccess()
        onOpenChange(false)
      } else {
        throw new Error(res.message)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Khong the tao yeu cau mua hang")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { onOpenChange(nextOpen); if (!nextOpen) setIsDone(false) }}>
      <DialogContent className="max-w-[1400px] w-[98vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo yêu cầu nhập hàng</DialogTitle>
        </DialogHeader>

        {isDone ? (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="size-4" />
            Đã tạo thành công
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Ưu tiên</Label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Thấp</SelectItem>
                    <SelectItem value="medium">Trung bình</SelectItem>
                    <SelectItem value="high">Cao</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Input value={note} onChange={(event) => setNote(event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Đơn sản xuất</Label>
                <Select
                  value={order || "none"}
                  onValueChange={(value) => {
                    const nextOrder = value === "none" ? "" : value
                    setOrder(nextOrder)
                    if (!nextOrder) return
                    setBatchItems((prev) =>
                      prev.filter((item) => {
                        if (item.isManual || !item.material.productionOrder) return true
                        return getProductionOrderId(item.material.productionOrder) === nextOrder
                      }),
                    )
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Trong --</SelectItem>
                    {insufficientOrders.map((insufficientOrder) => (
                      <SelectItem key={insufficientOrder._id} value={insufficientOrder._id}>
                        {insufficientOrder.orderCode || insufficientOrder._id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Danh sách vật tư </Label>
                <Button variant="outline" size="sm" onClick={addEmptyBatchItem}>
                  <Plus className="size-3 mr-1" /> Thêm
                </Button>
              </div>

              <ScrollArea className="h-64 border rounded-md p-2">
                <div className="space-y-3">
                  {batchItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 p-2 bg-muted/30 rounded">
                      {item.isManual ? (
                        <Select
                          value={item.material._id}
                          onValueChange={(value) => {
                            const selected = availableMaterials.find((material) => material._id === value)
                            if (!selected) return
                            const next = [...batchItems]
                            next[index].material = selected
                            setBatchItems(next)
                          }}
                        >
                          <SelectTrigger className="flex-1 bg-background">
                            <SelectValue placeholder="Chon vat tu" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableMaterials.map((material) => (
                              <SelectItem key={material._id} value={material._id}>{material.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex-1 truncate">
                          <p className="text-sm font-medium">{item.material.name}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="w-20"
                          min={1}
                          value={item.quantity}
                          onChange={(event) => {
                            const next = [...batchItems]
                            next[index].quantity = event.target.value
                            setBatchItems(next)
                          }}
                        />
                        <span className="text-sm text-muted-foreground">{item.material.unit}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const next = [...batchItems]
                            next.splice(index, 1)
                            setBatchItems(next)
                          }}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <FieldError msg={error} />
            </div>
          </div>
        )}

        <DialogFooter>
          {isDone ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button onClick={handleBatchRestock} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Tạo yêu cầu
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
