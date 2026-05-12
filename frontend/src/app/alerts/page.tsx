"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { AlertTriangle, Bell, Package, Search, Download, AlertCircle, CheckCircle2, Plus, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { materialApi } from "@/api/material.api"
import { productionApi } from "@/api/production.api"
import { purchaseOrderApi } from "@/api/purchaseOrder.api"
import { toast } from "sonner"
import { CurrencyDisplay } from "@/components/ui/currency-display"
import { PermissionGuard, withPermission } from "@/components/guards/permission-guard"

// ── Types ─────────────────────────────────────────────────────
interface Material {
  _id: string
  name: string
  code: string
  unit: string
  currentStock: number
  threshold: number
  price: number
  supplier?: { name: string }
  alertId?: string
  alertType?: 'low_stock' | 'order_requirement'
  productionOrder?: any
  shortageQuantity?: number
}

interface RestockDraft {
  material: Material
  quantity: string
  note: string
}

interface ThresholdDraft {
  material: Material
  threshold: string
}

// ── Components ────────────────────────────────────────────────
const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-xs text-destructive mt-1">{msg}</p> : null

const exportAlertsCSV = (data: Material[]) => {
  const headers = "Tên,Mã,Loại,Tồn kho,Đơn vị\n"
  const rows = data.map(m => `${m.name},${m.code},${m.alertType === 'order_requirement' ? 'Đơn hàng' : 'Tồn kho'},${m.currentStock},${m.unit}`).join("\n")
  const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.setAttribute("download", `canh-bao-vat-tu-${new Date().toLocaleDateString()}.csv`)
  link.click()
}

const CustomPagination = ({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) => {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t p-4 bg-background rounded-b-xl">
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

// ── Main ──────────────────────────────────────────────────────
function AlertsPage() {
  const [activeTab, setActiveTab] = useState("inventory")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"All" | "Critical" | "Low Stock">("All")
  const [allMaterials, setAllMaterials] = useState<Material[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // restock modal
  const [restockItem, setRestockItem] = useState<RestockDraft | null>(null)
  const [restockOpen, setRestockOpen] = useState(false)
  const [restockError, setRestockError] = useState('')
  const [restockDone, setRestockDone] = useState(false)

  // threshold modal
  const [thresholdItem, setThresholdItem] = useState<ThresholdDraft | null>(null)
  const [thresholdOpen, setThresholdOpen] = useState(false)
  const [thresholdError, setThresholdError] = useState('')
  const [thresholdDone, setThresholdDone] = useState(false)

  // multi-select
  const [selectedAlertIds, setSelectedAlertIds] = useState<Set<string>>(new Set())

  // pagination
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  // batch restock modal
  const [batchRestockOpen, setBatchRestockOpen] = useState(false)
  const [batchItems, setBatchItems] = useState<{ material: Material, quantity: string, isManual?: boolean }[]>([])
  const [batchNote, setBatchNote] = useState('')
  const [batchPriority, setBatchPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [batchOrder, setBatchOrder] = useState<string>('')

  const [availableMaterials, setAvailableMaterials] = useState<any[]>([])
  const [insufficientOrders, setInsufficientOrders] = useState<any[]>([])

  // ── Fetch ──────────────────────────────────────────────────
  const fetchLowStock = useCallback(async (search?: string) => {
    setIsLoading(true)
    try {
      // Nếu filter là All, ta gửi status là 'all' để BE không lọc theo status mặc định là 'pending'
      const response = await productionApi.getMaterialAlerts({
        status: statusFilter === 'All' ? 'all' : (statusFilter === 'Critical' ? 'critical' : 'low_stock'),
        limit: 100,
        page: 1
      })

      const res: any = response;
      if ((res.success || res.status === 'success') && res.data?.alerts) {
        const mappedAlerts = res.data.alerts.map((alert: any) => {
          const materialInfo = alert.material && typeof alert.material === 'object' ? alert.material : {};

          return {
            ...materialInfo,
            _id: materialInfo._id || (typeof alert.material === 'string' ? alert.material : alert._id),
            name: materialInfo.name || alert.materialName || "Vật tư không xác định",
            code: materialInfo.code || alert.materialCode || "N/A",
            unit: materialInfo.unit || alert.unit || "đv",
            currentStock: materialInfo.currentStock ?? alert.availableQuantity ?? 0,
            threshold: materialInfo.threshold ?? alert.neededQuantity ?? 0,
            price: materialInfo.price || alert.price || 0,

            // Bổ sung thông tin alert để phân loại và hiển thị
            alertId: alert._id,
            // QUAN TRỌNG: Phân loại dựa trên việc có gắn với productionOrder hay không
            alertType: alert.productionOrder ? 'order_requirement' : 'low_stock',
            productionOrder: alert.productionOrder,
            alertStatus: alert.status,
            shortageQuantity: alert.shortageQuantity || 0,
            neededQuantity: alert.neededQuantity || 0
          }
        })

        // Lọc theo search query nếu có
        const finalData = search
          ? mappedAlerts.filter((m: any) => m.name.toLowerCase().includes(search.toLowerCase()) || m.code.toLowerCase().includes(search.toLowerCase()))
          : mappedAlerts;

        setAllMaterials(finalData)
      } else {
        setAllMaterials([])
      }
    } catch (error) {
      console.error("Fetch material alerts error:", error)
      setAllMaterials([])
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    const timer = setTimeout(() => fetchLowStock(searchQuery), 400)
    return () => clearTimeout(timer)
  }, [searchQuery, fetchLowStock])

  useEffect(() => {
    setPage(1)
  }, [activeTab, searchQuery, statusFilter])

  // ── Filter ─────────────────────────────────────────────────
  const filteredInventory = useMemo(() => {
    return allMaterials.filter((m) => {
      const isInventory = (m as any).alertType === 'low_stock'
      if (!isInventory) return false

      if (statusFilter === "Critical") return m.currentStock === 0
      if (statusFilter === "Low Stock") return m.currentStock > 0 && m.currentStock <= m.threshold
      return true
    })
  }, [allMaterials, statusFilter])

  const filteredOrders = useMemo(() => {
    return allMaterials.filter((m) => {
      const isOrder = (m as any).alertType === 'order_requirement'
      if (!isOrder) return false

      if (statusFilter === "Critical") return m.currentStock === 0
      if (statusFilter === "Low Stock") return m.currentStock > 0 && m.currentStock <= m.threshold
      return true
    })
  }, [allMaterials, statusFilter])

  const paginatedInventory = useMemo(() => {
    return filteredInventory.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  }, [filteredInventory, page])

  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  }, [filteredOrders, page])

  const criticalCount = allMaterials.filter((m) => m.currentStock === 0).length
  const lowStockCount = allMaterials.filter((m) => m.currentStock > 0 && m.currentStock <= m.threshold).length

  // ── Multi-Select ───────────────────────────────────────────
  const currentList = activeTab === 'inventory' ? filteredInventory : filteredOrders
  const allSelected = currentList.length > 0 && currentList.every(m => selectedAlertIds.has(m.alertId!))

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedAlertIds(new Set())
    } else {
      const newSet = new Set(selectedAlertIds)
      currentList.forEach(m => newSet.add(m.alertId!))
      setSelectedAlertIds(newSet)
    }
  }

  const toggleSelect = (alertId: string) => {
    const newSet = new Set(selectedAlertIds)
    if (newSet.has(alertId)) {
      newSet.delete(alertId)
    } else {
      newSet.add(alertId)
    }
    setSelectedAlertIds(newSet)
  }

  // ── Helpers ────────────────────────────────────────────────
  // % tồn kho so với mức tối thiểu (>100% = đủ, 0% = hết)
  const stockPct = (m: Material) => {
    if (!m.threshold) return 100
    return Math.min(100, Math.round((m.currentStock / m.threshold) * 100))
  }

  const getStatusBadge = (m: Material) => {
    if (m.currentStock === 0) return <Badge className="bg-[#DC3545] text-white hover:bg-[#DC3545]/90">Nguy cấp</Badge>
    return <Badge className="bg-[#FFA500] text-white hover:bg-[#FFA500]/90">Sắp hết</Badge>
  }

  // ── Restock ────────────────────────────────────────────────
  const openRestock = (m: Material) => {
    setRestockItem({ material: m, quantity: '', note: '' })
    setRestockError('')
    setRestockDone(false)
    setRestockOpen(true)
  }

  const handleRestock = async () => {
    if (!restockItem) return
    const qty = Number(restockItem.quantity)
    if (!restockItem.quantity || qty <= 0) { setRestockError('Vui lòng nhập số lượng > 0'); return }

    setIsLoading(true)
    try {
      const material = restockItem.material as any

      // Chuẩn bị dữ liệu theo cấu trúc Backend (backend/validations/purchaseOrderValidation.js)
      const payload = {
        orderReason: restockItem.note || `Yêu cầu nhập hàng cho ${material.name} (${material.alertType === 'order_requirement' ? 'Thiếu vật tư cho đơn hàng' : 'Tồn kho thấp'})`,
        priority: (material.alertType === 'order_requirement' ? 'high' : 'medium') as 'high' | 'medium' | 'low',
        productionOrder: material.productionOrder?._id || (typeof material.productionOrder === 'string' ? material.productionOrder : null),
        materialAlert: material.alertId,
        purchaseOrderItems: [
          {
            material: material._id,
            quantity: qty,
            materialCode: material.code,
            unit: material.unit,
            priceAtTimePurchase: material.price || 0,
            totalPriceAtTimePurchase: (material.price || 0) * qty
          }
        ]
      }

      const response = await purchaseOrderApi.create(payload)
      const res: any = response;

      if (res.success || res.status === 'success') {
        toast.success(`Đã tạo yêu cầu mua ${qty} ${material.unit} ${material.name} thành công`)
        setRestockDone(true)
        // Refresh danh sách để cập nhật trạng thái
        setTimeout(() => fetchLowStock(searchQuery), 1000)
      } else {
        throw new Error(res.message || "Không thể tạo yêu cầu mua hàng")
      }
    } catch (error: any) {
      console.error("Create Purchase Order error:", error)
      toast.error(error.response?.data?.message || error.message || "Không thể tạo yêu cầu mua hàng")
    } finally {
      setIsLoading(false)
    }
  }

  // ── Batch Restock ──────────────────────────────────────────
  const fetchAvailableMaterials = async () => {
    if (availableMaterials.length > 0) return
    try {
      let res: any
      if (typeof materialApi.getMaterials === 'function') res = await materialApi.getMaterials({ limit: 1000 })
      else if (typeof (materialApi as any).getMaterials === 'function') res = await (materialApi as any).getMaterials({ limit: 1000 })

      if (res && (res.success || res.status === 'success')) {
        setAvailableMaterials(res.data?.materials || res.data || [])
      }
    } catch (e) { console.error("Fetch materials error:", e) }
  }

  const fetchInsufficientOrders = async () => {
    if (insufficientOrders.length > 0) return
    try {
      let res: any
      if (typeof (productionApi as any).getAll === 'function') res = await (productionApi as any).getAll({ status: 'insufficient_materials', limit: 100 })
      else if (typeof (productionApi as any).getOrders === 'function') res = await (productionApi as any).getOrders({ status: 'insufficient_materials', limit: 100 })
      
      if (res && (res.success || res.status === 'success')) {
        setInsufficientOrders(res.data?.items || res.data || [])
      }
    } catch (e) { console.error("Fetch orders error:", e) }
  }

  const openBatchRestock = () => {
    const selected = allMaterials.filter(m => selectedAlertIds.has(m.alertId!))
    const items = selected.map(m => {
      const neededQty = m.alertType === 'order_requirement'
        ? (m.shortageQuantity || (m.threshold - m.currentStock) || 1)
        : (Math.max(0, m.threshold - m.currentStock) || 1)
      return { material: m, quantity: String(neededQty) }
    })
    setBatchItems(items)

    // Nếu tất cả alert đều thuộc cùng 1 Production Order thì gán Production Order mặc định
    const orderIds = selected.map(m => m.productionOrder?._id || m.productionOrder).filter(Boolean)
    const uniqueOrders = Array.from(new Set(orderIds))
    if (uniqueOrders.length === 1) {
      setBatchOrder(uniqueOrders[0])
      setBatchPriority('high')
    } else {
      setBatchOrder('')
      setBatchPriority('medium')
    }

    setBatchNote('')
    setRestockError('')
    setRestockDone(false)
    fetchAvailableMaterials()
    fetchInsufficientOrders()
    setBatchRestockOpen(true)
  }

  const addEmptyBatchItem = () => {
    setBatchItems([...batchItems, {
      material: { _id: '', name: 'Chọn vật tư...', code: '', unit: 'đv', currentStock: 0, threshold: 0, price: 0 },
      quantity: '1',
      isManual: true
    }])
  }

  const handleBatchRestock = async () => {
    const validItems = batchItems.filter(i => i.material._id)
    if (validItems.length === 0) { setRestockError('Vui lòng thêm ít nhất 1 vật tư'); return }
    if (validItems.some(i => !i.quantity || Number(i.quantity) <= 0)) {
      setRestockError('Vui lòng nhập số lượng hợp lệ cho tất cả vật tư')
      return
    }

    setIsLoading(true)
    try {
      const purchaseOrderItems = validItems.map(item => ({
        material: item.material._id,
        quantity: Number(item.quantity),
        materialCode: item.material.code,
        unit: item.material.unit,
        priceAtTimePurchase: item.material.price || 0,
        totalPriceAtTimePurchase: (item.material.price || 0) * Number(item.quantity)
      }))

      const payload: any = {
        orderReason: batchNote || `Yêu cầu nhập hàng cho ${purchaseOrderItems.length} vật tư`,
        priority: batchPriority,
        purchaseOrderItems,
        ...(batchOrder && { productionOrder: batchOrder })
      }

      const alertIds = validItems.map(i => i.material.alertId).filter(Boolean)
      if (alertIds.length > 0) {
        payload.materialAlert = alertIds[0] // Để tương thích API cũ
        if (alertIds.length > 1) payload.materialAlerts = alertIds // Gửi thêm list
      }

      const response = await purchaseOrderApi.create(payload)
      const res: any = response;

      if (res.success || res.status === 'success') {
        toast.success(`Đã tạo yêu cầu mua hàng thành công`)
        setRestockDone(true)
        setSelectedAlertIds(new Set())
        setTimeout(() => fetchLowStock(searchQuery), 1000)
      } else {
        throw new Error(res.message || "Không thể tạo yêu cầu mua hàng")
      }
    } catch (error: any) {
      console.error("Create Purchase Order error:", error)
      toast.error(error.response?.data?.message || error.message || "Không thể tạo yêu cầu mua hàng")
    } finally {
      setIsLoading(false)
    }
  }

  // ── Threshold ──────────────────────────────────────────────
  const openThreshold = (m: Material) => {
    setThresholdItem({ material: m, threshold: String(m.threshold ?? '') })
    setThresholdError('')
    setThresholdDone(false)
    setThresholdOpen(true)
  }

  const handleThreshold = () => {
    if (!thresholdItem) return
    const val = Number(thresholdItem.threshold)
    if (!thresholdItem.threshold || val < 0) { setThresholdError('Vui lòng nhập ngưỡng hợp lệ'); return }
    // cập nhật local
    setAllMaterials((prev) =>
      prev.map((m) => m._id === thresholdItem.material._id ? { ...m, threshold: val } : m)
    )
    // TODO: gọi API cập nhật threshold
    setThresholdDone(true)
  }

  return (
    <AppShell title="Cảnh báo vật tư" subtitle="Theo dõi nguyên vật liệu sắp hết và thiếu hụt cho đơn sản xuất">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Cảnh báo vật tư</h2>
            <p className="text-sm text-muted-foreground">Quản lý nhu cầu nguyên vật liệu toàn hệ thống</p>
          </div>
          <div className="flex gap-2">
            {selectedAlertIds.size > 0 && (
              <PermissionGuard allowedRoles={['admin', 'production_manager']}>
                <Button variant="default" onClick={openBatchRestock}>
                  Tạo PO Đã Chọn ({selectedAlertIds.size})
                </Button>
              </PermissionGuard>
            )}
            <Button variant="outline" className="gap-2" onClick={() => exportAlertsCSV(activeTab === 'inventory' ? filteredInventory : filteredOrders)}>
              <Download className="h-4 w-4" /> Xuất Excel
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="inventory" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="inventory" className="gap-2">
              <Package className="h-4 w-4" />
              Tồn kho thấp
              {filteredInventory.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-blue-100 text-blue-700">
                  {filteredInventory.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Thiếu cho đơn hàng
              {filteredOrders.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-purple-100 text-purple-700">
                  {filteredOrders.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-6">
            {/* Stats (Dùng chung) */}
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: 'Cảnh báo Khẩn cấp', value: criticalCount, color: 'text-[#DC3545]', bg: 'bg-[#FFEBEE]', iconColor: 'text-[#DC3545]' },
                { label: 'Cảnh báo Sắp hết', value: lowStockCount, color: 'text-[#FFA500]', bg: 'bg-[#FFF3E0]', iconColor: 'text-[#FFA500]' },
                { label: 'Tổng cảnh báo', value: allMaterials.length, color: 'text-foreground', bg: 'bg-[#F5F0EB]', iconColor: 'text-[#8B7355]' },
              ].map(({ label, value, color, bg, iconColor }) => (
                <Card key={label}>
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", bg)}>
                      <AlertTriangle className={cn("h-6 w-6", iconColor)} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className={cn("text-2xl font-bold", color)}>{value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm nguyên liệu..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex gap-2">
                    {(['All', 'Critical', 'Low Stock'] as const).map((f) => (
                      <Button
                        key={f}
                        variant={statusFilter === f ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter(f)}
                        className={cn(
                          statusFilter === f && f === 'Critical' && 'bg-[#DC3545] hover:bg-[#DC3545]/90',
                          statusFilter === f && f === 'Low Stock' && 'bg-[#FFA500] hover:bg-[#FFA500]/90',
                        )}
                      >
                        {f === 'All' ? 'Tất cả' : f === 'Critical' ? 'Nguy cấp' : 'Sắp hết'}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <TabsContent value="inventory" className="m-0">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                        </TableHead>
                        <TableHead>Nguyên liệu</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="w-40">Mức tồn kho</TableHead>
                        <TableHead className="text-right">Tồn hiện tại</TableHead>
                        <TableHead className="text-right">Mức tối thiểu</TableHead>
                        <TableHead className="text-right">Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array(4).fill(0).map((_, i) => (
                          <TableRow key={i}>
                            {Array(7).fill(0).map((__, j) => (
                              <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : filteredInventory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            Không có cảnh báo tồn kho nào
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedInventory.map((m) => {
                          const pct = stockPct(m)
                          const isCritical = m.currentStock === 0
                          return (
                            <TableRow key={m._id}>
                              <TableCell>
                                <Checkbox checked={selectedAlertIds.has(m.alertId!)} onCheckedChange={() => toggleSelect(m.alertId!)} />
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{m.name}</div>
                                <div className="text-xs text-muted-foreground">{m.code} · {m.supplier?.name}</div>
                              </TableCell>
                              <TableCell>{getStatusBadge(m)}</TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className={cn(
                                        'h-full rounded-full transition-all',
                                        isCritical ? 'bg-[#DC3545]' : 'bg-[#FFA500]'
                                      )}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-muted-foreground text-right">{pct}%</p>
                                </div>
                              </TableCell>
                              <TableCell className={cn(
                                "text-right font-medium",
                                isCritical ? "text-[#DC3545]" : "text-[#FFA500]"
                              )}>
                                {m.currentStock} {m.unit}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {m.threshold} {m.unit}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost" size="sm"
                                    className="text-xs text-muted-foreground"
                                    onClick={() => openThreshold(m)}
                                  >
                                    <Bell className="size-3 mr-1" /> Ngưỡng
                                  </Button>
                                  <PermissionGuard allowedRoles={['admin', 'production_manager']}>
                                    <Button variant="outline" size="sm" onClick={() => openRestock(m)}>
                                      Nhập hàng
                                    </Button>
                                  </PermissionGuard>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                  <CustomPagination page={page} total={filteredInventory.length} pageSize={ITEMS_PER_PAGE} onChange={setPage} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders" className="m-0">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                        </TableHead>
                        <TableHead>Nguyên liệu</TableHead>
                        <TableHead>Đơn sản xuất</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Tồn hiện tại</TableHead>
                        <TableHead className="text-right">Cần thêm ít nhất</TableHead>
                        <TableHead className="text-right">Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array(4).fill(0).map((_, i) => (
                          <TableRow key={i}>
                            {Array(7).fill(0).map((__, j) => (
                              <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : filteredOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            Không có cảnh báo thiếu hụt từ đơn hàng
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedOrders.map((m) => {
                          const isCritical = m.currentStock === 0
                          const neededQty = (m as any).shortageQuantity || (m.threshold - m.currentStock)
                          return (
                            <TableRow key={m._id}>
                              <TableCell>
                                <Checkbox checked={selectedAlertIds.has(m.alertId!)} onCheckedChange={() => toggleSelect(m.alertId!)} />
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{m.name}</div>
                                <div className="text-xs text-muted-foreground">{m.code}</div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                    {(m as any).productionOrder?.orderCode || (m as any).productionOrder || 'N/A'}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(m)}</TableCell>
                              <TableCell className={cn(
                                "text-right font-medium",
                                isCritical ? "text-[#DC3545]" : "text-[#FFA500]"
                              )}>
                                {m.currentStock} {m.unit}
                              </TableCell>
                              <TableCell className="text-right font-bold text-destructive">
                                {neededQty > 0 ? `${neededQty} ${m.unit}` : 'Đã đủ'}
                              </TableCell>
                              <TableCell className="text-right">
                                <PermissionGuard allowedRoles={['admin', 'production_manager']}>
                                  <Button variant="default" size="sm" onClick={() => openRestock(m)} className="bg-primary text-primary-foreground">
                                    Nhập hàng gấp
                                  </Button>
                                </PermissionGuard>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                  <CustomPagination page={page} total={filteredOrders.length} pageSize={ITEMS_PER_PAGE} onChange={setPage} />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* ── Restock Modal ── */}
      <Dialog open={restockOpen} onOpenChange={(o) => { setRestockOpen(o); if (!o) setRestockDone(false) }}>
        <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nhập hàng – {restockItem?.material.name}</DialogTitle>
            <DialogDescription>
              Tồn hiện tại: <strong>{restockItem?.material.currentStock} {restockItem?.material.unit}</strong> · Mức tối thiểu: <strong>{restockItem?.material.threshold} {restockItem?.material.unit}</strong>
            </DialogDescription>
          </DialogHeader>

          {restockDone ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle2 className="size-4 shrink-0" />
              Đã tạo yêu cầu nhập hàng thành công
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Gợi ý số lượng cần nhập */}
              {restockItem && restockItem.material.threshold > restockItem.material.currentStock && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                  Gợi ý: cần nhập thêm ít nhất{' '}
                  <strong>{restockItem.material.threshold - restockItem.material.currentStock} {restockItem.material.unit}</strong>{' '}
                  để đạt mức tối thiểu
                </div>
              )}

              <div className="space-y-2">
                <Label>Số lượng cần nhập <span className="text-destructive">*</span></Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    placeholder="Nhập số lượng..."
                    value={restockItem?.quantity ?? ''}
                    onChange={(e) => {
                      setRestockItem((prev) => prev ? { ...prev, quantity: e.target.value } : prev)
                      setRestockError('')
                    }}
                    className={restockError ? 'border-destructive' : ''}
                    min={1}
                  />
                  <span className="text-sm text-muted-foreground shrink-0">{restockItem?.material.unit}</span>
                </div>
                <FieldError msg={restockError} />
              </div>

              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea
                  placeholder="Ghi chú thêm cho yêu cầu nhập hàng..."
                  rows={2}
                  value={restockItem?.note ?? ''}
                  onChange={(e) => setRestockItem((prev) => prev ? { ...prev, note: e.target.value } : prev)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm p-3 bg-muted/50 rounded-lg">
                <div><span className="text-muted-foreground">Nhà cung cấp:</span> <strong>{restockItem?.material.supplier?.name}</strong></div>
                <div><span className="text-muted-foreground">Đơn giá:</span> <strong><CurrencyDisplay value={restockItem?.material.price ?? 0} /></strong></div>
              </div>
            </div>
          )}

          <DialogFooter>
            {restockDone ? (
              <Button variant="outline" onClick={() => setRestockOpen(false)}>Đóng</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setRestockOpen(false)}>Hủy</Button>
                <Button onClick={handleRestock}>Tạo yêu cầu nhập</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Threshold Modal ── */}
      <Dialog open={thresholdOpen} onOpenChange={(o) => { setThresholdOpen(o); if (!o) setThresholdDone(false) }}>
        <DialogContent className="sm:max-w-sm w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thiết lập ngưỡng cảnh báo</DialogTitle>
            <DialogDescription>
              {thresholdItem?.material.name} · Ngưỡng hiện tại: <strong>{thresholdItem?.material.threshold} {thresholdItem?.material.unit}</strong>
            </DialogDescription>
          </DialogHeader>

          {thresholdDone ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle2 className="size-4 shrink-0" />
              Đã cập nhật ngưỡng cảnh báo thành công
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Ngưỡng cảnh báo mới <span className="text-destructive">*</span></Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    placeholder="Nhập ngưỡng..."
                    value={thresholdItem?.threshold ?? ''}
                    onChange={(e) => {
                      setThresholdItem((prev) => prev ? { ...prev, threshold: e.target.value } : prev)
                      setThresholdError('')
                    }}
                    className={thresholdError ? 'border-destructive' : ''}
                    min={0}
                  />
                  <span className="text-sm text-muted-foreground shrink-0">{thresholdItem?.material.unit}</span>
                </div>
                <FieldError msg={thresholdError} />
                <p className="text-xs text-muted-foreground">
                  Hệ thống sẽ cảnh báo khi tồn kho xuống dưới mức này
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            {thresholdDone ? (
              <Button variant="outline" onClick={() => setThresholdOpen(false)}>Đóng</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setThresholdOpen(false)}>Hủy</Button>
                <Button onClick={handleThreshold}>Lưu ngưỡng</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Batch Restock Modal ── */}
      <Dialog open={batchRestockOpen} onOpenChange={(o) => { setBatchRestockOpen(o); if (!o) setRestockDone(false) }}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo Yêu Cầu Nhập Hàng Đã Chọn</DialogTitle>
            <DialogDescription>
              Đang tạo Purchase Order cho {batchItems.length} cảnh báo vật tư.
            </DialogDescription>
          </DialogHeader>

          {restockDone ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle2 className="size-4 shrink-0" />
              Đã tạo yêu cầu mua hàng thành công
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Mức độ ưu tiên</Label>
                  <Select value={batchPriority} onValueChange={(v: any) => setBatchPriority(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn mức độ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Thấp</SelectItem>
                      <SelectItem value="medium">Trung bình</SelectItem>
                      <SelectItem value="high">Cao</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lý do / Ghi chú</Label>
                  <Input
                    placeholder="VD: Nhập vật tư cho đơn hàng..."
                    value={batchNote}
                    onChange={e => setBatchNote(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mã Đơn Sản Xuất (Tùy chọn)</Label>
                  <Select value={batchOrder || "none"} onValueChange={(val) => {
                    const newVal = val === "none" ? "" : val;
                    setBatchOrder(newVal);
                    if (newVal) {
                      // Loại bỏ các cảnh báo đã pick thuộc về ĐƠN SẢN XUẤT KHÁC ra khỏi danh sách
                      // để đảm bảo dữ liệu trong PO luôn sạch sẽ, không bị lẫn lộn vật tư của 2 đơn khác nhau.
                      setBatchItems(prev => prev.filter(item => {
                        if (item.isManual) return true;
                        const itemOrder = item.material.productionOrder?._id || item.material.productionOrder;
                        return !itemOrder || itemOrder === newVal;
                      }));
                    }
                  }}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Chọn đơn sản xuất..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Không chọn --</SelectItem>
                      {insufficientOrders.map(o => (
                        <SelectItem key={o._id} value={o._id}>{o.orderCode || o._id}</SelectItem>
                      ))}
                      {/* Hiển thị mã hiện tại nếu nó không nằm trong danh sách (để không bị mất label) */}
                      {batchOrder && !insufficientOrders.some(o => o._id === batchOrder) && (
                        <SelectItem value={batchOrder}>{batchOrder}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Danh sách vật tư</Label>
                  <Button variant="outline" size="sm" onClick={addEmptyBatchItem} className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Thêm vật tư
                  </Button>
                </div>
                <ScrollArea className="h-64 border rounded-md p-2">
                  <div className="space-y-3">
                    {batchItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between gap-4 p-2 bg-muted/30 rounded">
                        {item.isManual ? (
                          <Select
                            value={item.material._id}
                            onValueChange={(val) => {
                              const selectedMat = availableMaterials.find(m => m._id === val)
                              if (selectedMat) {
                                const newItems = [...batchItems]
                                newItems[index].material = { ...selectedMat, alertId: undefined }
                                setBatchItems(newItems)
                              }
                            }}
                          >
                            <SelectTrigger className="flex-1 min-w-[200px] h-9 bg-background">
                              <SelectValue placeholder="Chọn vật tư" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableMaterials.map(m => (
                                <SelectItem key={m._id} value={m._id}>{m.name} ({m.code})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex-1 truncate">
                            <p className="text-sm font-medium truncate">{item.material.name}</p>
                            <p className="text-xs text-muted-foreground">{item.material.code} · Tồn: {item.material.currentStock}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 shrink-0">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...batchItems]
                              newItems[index].quantity = e.target.value
                              setBatchItems(newItems)
                              setRestockError('')
                            }}
                            className="h-9 w-20 bg-background"
                            min={1}
                          />
                          <span className="text-sm text-muted-foreground w-8 truncate">{item.material.unit}</span>
                          <Button variant="ghost" size="sm" onClick={() => {
                            const newItems = [...batchItems]
                            newItems.splice(index, 1)
                            setBatchItems(newItems)
                          }} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <FieldError msg={restockError} />
              </div>
            </div>
          )}

          <DialogFooter>
            {restockDone ? (
              <Button variant="outline" onClick={() => setBatchRestockOpen(false)}>Đóng</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setBatchRestockOpen(false)}>Hủy</Button>
                <Button onClick={handleBatchRestock} disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Tạo yêu cầu
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}

export default withPermission(AlertsPage, ['admin', 'kho_manager', 'production_manager'])