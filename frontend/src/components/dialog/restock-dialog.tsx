import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Loader2 } from "lucide-react"
import { purchaseOrderApi } from "@/api/purchaseOrder.api"
import { toast } from "sonner"
import { CurrencyDisplay } from "@/components/ui/currency-display"
import { Material } from "@/app/alerts/types"

export const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-xs text-destructive mt-1">{msg}</p> : null

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: Material
  onSuccess: () => void
}

export function RestockDialog({ open, onOpenChange, material, onSuccess }: Props) {
  const [quantity, setQuantity] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [isDone, setIsDone] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setQuantity("")
      setNote("")
      setError("")
      setIsDone(false)
    }
  }, [open])

  const handleRestock = async () => {
    const qty = Number(quantity)
    if (!quantity || qty <= 0) { setError('Vui lòng nhập số lượng > 0'); return }

    setIsLoading(true)
    try {
      const payload = {
        orderReason: note || `Yêu cầu nhập hàng cho ${material.name} (${material.alertType === 'order_requirement' ? 'Thiếu vật tư cho đơn hàng' : 'Tồn kho thấp'})`,
        priority: (material.alertType === 'order_requirement' ? 'high' : 'medium') as 'high' | 'medium' | 'low',
        productionOrder: material.productionOrder?._id || (typeof material.productionOrder === 'string' ? material.productionOrder : null),
        ...(material.alertType === 'order_requirement' && { materialAlert: material.alertId }),
        purchaseOrderItems: [{
          material: material._id,
          quantity: qty,
          materialCode: material.code,
          unit: material.unit,
          priceAtTimePurchase: material.price || 0,
          totalPriceAtTimePurchase: (material.price || 0) * qty
        }]
      }

      const res: any = await purchaseOrderApi.create(payload)
      if (res.success || res.status === 'success') {
        toast.success(`Đã tạo yêu cầu mua ${qty} ${material.unit} ${material.name} thành công`)
        onSuccess()
        onOpenChange(false)
      } else {
        throw new Error(res.message || "Không thể tạo yêu cầu mua hàng")
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Không thể tạo yêu cầu mua hàng")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setIsDone(false) }}>
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nhập hàng – {material?.name}</DialogTitle>
          <DialogDescription>
            Tồn hiện tại: <strong>{material?.currentStock} {material?.unit}</strong> · Mức tối thiểu: <strong>{material?.threshold} {material?.unit}</strong>
          </DialogDescription>
        </DialogHeader>
        {isDone ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
            <CheckCircle2 className="size-4 shrink-0" /> Đã tạo yêu cầu nhập hàng thành công
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Số lượng cần nhập <span className="text-destructive">*</span></Label>
              <Input type="number" value={quantity} onChange={(e) => { setQuantity(e.target.value); setError('') }} min={1} />
              <FieldError msg={error} />
            </div>
            <div className="space-y-2"><Label>Ghi chú</Label><Textarea value={note} onChange={e => setNote(e.target.value)} /></div>
          </div>
        )}
        <DialogFooter>
          {isDone ? <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button> : <><Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button onClick={handleRestock} disabled={isLoading}>{isLoading && <Loader2 className="mr-2 size-4 animate-spin" />} Tạo yêu cầu</Button></>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}