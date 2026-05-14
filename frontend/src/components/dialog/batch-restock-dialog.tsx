import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

interface Props { open: boolean, onOpenChange: (open: boolean) => void, selectedMaterials: Material[], onSuccess: () => void }

export function BatchRestockDialog({ open, onOpenChange, selectedMaterials, onSuccess }: Props) {
    const [batchItems, setBatchItems] = useState<{ material: Material, quantity: string, isManual?: boolean }[]>([])
    const [note, setNote] = useState('')
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
    const [order, setOrder] = useState<string>('')
    const [availableMaterials, setAvailableMaterials] = useState<any[]>([])
    const [insufficientOrders, setInsufficientOrders] = useState<any[]>([])
    const [error, setError] = useState('')
    const [isDone, setIsDone] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (open) {
            setIsDone(false); setError(""); setNote("");
            const items = selectedMaterials.map(m => {
                const neededQty = m.alertType === 'order_requirement' ? (m.shortageQuantity || (m.threshold - m.currentStock) || 1) : (Math.max(0, m.threshold - m.currentStock) || 1)
                return { material: m, quantity: String(neededQty) }
            })
            setBatchItems(items)

            const orderIds = selectedMaterials.map(m => m.productionOrder?._id || m.productionOrder).filter(Boolean)
            const uniqueOrders = Array.from(new Set(orderIds))
            if (uniqueOrders.length === 1) { setOrder(uniqueOrders[0]); setPriority('high') } else { setOrder(''); setPriority('medium') }

            // Fetch dependencies only when modal opens
            if (availableMaterials.length === 0) {
                (materialApi as any).getMaterials?.({ limit: 1000 }).then((res: any) => setAvailableMaterials(res.data?.materials || res.data?.items || res.data || []))
            }
            if (insufficientOrders.length === 0) {
                (productionApi as any).getAll?.({ status: 'insufficient_materials', limit: 100 }).then((res: any) => setInsufficientOrders(res.data?.orders || res.data?.items || res.data || []))
            }
        }
    }, [open, selectedMaterials])

    const addEmptyBatchItem = () => setBatchItems([...batchItems, { material: { _id: '', name: 'Chọn vật tư...', code: '', unit: 'đv', currentStock: 0, threshold: 0, price: 0 }, quantity: '1', isManual: true }])

    const handleBatchRestock = async () => {
        const validItems = batchItems.filter(i => i.material._id)
        if (validItems.length === 0) { setError('Vui lòng thêm ít nhất 1 vật tư'); return }
        if (validItems.some(i => !i.quantity || Number(i.quantity) <= 0)) { setError('Vui lòng nhập số lượng hợp lệ'); return }

        setIsLoading(true)
        try {
            const payload: any = {
                orderReason: note || `Yêu cầu nhập hàng cho ${validItems.length} vật tư`,
                priority,
                purchaseOrderItems: validItems.map(item => ({ material: item.material._id, quantity: Number(item.quantity), materialCode: item.material.code, unit: item.material.unit, priceAtTimePurchase: item.material.price || 0, totalPriceAtTimePurchase: (item.material.price || 0) * Number(item.quantity) })),
                ...(order && { productionOrder: order })
            }
            const alertIds = validItems.filter(i => i.material.alertType === 'order_requirement').map(i => i.material.alertId).filter(Boolean)
            if (alertIds.length > 0) { payload.materialAlert = alertIds[0]; if (alertIds.length > 1) payload.materialAlerts = alertIds }

            const res: any = await purchaseOrderApi.create(payload)
            if (res.success || res.status === 'success') {
                toast.success(`Đã tạo yêu cầu mua hàng thành công`)
                setIsDone(true); onSuccess()
            } else throw new Error(res.message)
        } catch (err: any) { toast.error(err.response?.data?.message || err.message) } finally { setIsLoading(false) }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setIsDone(false) }}>
            <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Tạo Yêu Cầu Nhập Hàng</DialogTitle></DialogHeader>
                {isDone ? (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700"><CheckCircle2 className="size-4" /> Đã tạo thành công</div>
                ) : (
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2"><Label>Ưu tiên</Label><Select value={priority} onValueChange={(v: any) => setPriority(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Thấp</SelectItem><SelectItem value="medium">TB</SelectItem><SelectItem value="high">Cao</SelectItem></SelectContent></Select></div>
                            <div className="space-y-2"><Label>Ghi chú</Label><Input value={note} onChange={e => setNote(e.target.value)} /></div>
                            <div className="space-y-2"><Label>Đơn Sản Xuất</Label><Select value={order || "none"} onValueChange={(val) => { const newVal = val === "none" ? "" : val; setOrder(newVal); if (newVal) setBatchItems(prev => prev.filter(i => i.isManual || !i.material.productionOrder || i.material.productionOrder === newVal)) }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">-- Trống --</SelectItem>{insufficientOrders.map(o => <SelectItem key={o._id} value={o._id}>{o.orderCode || o._id}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center"><Label>Danh sách vật tư</Label><Button variant="outline" size="sm" onClick={addEmptyBatchItem}><Plus className="size-3 mr-1" /> Thêm</Button></div>
                            <ScrollArea className="h-64 border rounded-md p-2">
                                <div className="space-y-3">
                                    {batchItems.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between gap-4 p-2 bg-muted/30 rounded">
                                            {item.isManual ? (
                                                <Select value={item.material._id} onValueChange={(val) => { const m = availableMaterials.find(x => x._id === val); if (m) { const newItems = [...batchItems]; newItems[index].material = m; setBatchItems(newItems) } }}>
                                                    <SelectTrigger className="flex-1 bg-background"><SelectValue placeholder="Chọn vật tư" /></SelectTrigger>
                                                    <SelectContent>{availableMaterials.map(m => <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            ) : <div className="flex-1 truncate"><p className="text-sm font-medium">{item.material.name}</p></div>}
                                            <div className="flex items-center gap-2"><Input type="number" value={item.quantity} onChange={(e) => { const n = [...batchItems]; n[index].quantity = e.target.value; setBatchItems(n) }} className="w-20" min={1} /><span className="text-sm text-muted-foreground">{item.material.unit}</span><Button variant="ghost" size="sm" onClick={() => { const n = [...batchItems]; n.splice(index, 1); setBatchItems(n) }}><X className="size-4" /></Button></div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            <FieldError msg={error} />
                        </div>
                    </div>
                )}
                <DialogFooter>{isDone ? <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button> : <><Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button onClick={handleBatchRestock} disabled={isLoading}>{isLoading && <Loader2 className="mr-2 size-4 animate-spin" />} Tạo yêu cầu</Button></>}</DialogFooter>
            </DialogContent>
        </Dialog>
    )
}