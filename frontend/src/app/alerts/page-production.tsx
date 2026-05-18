"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { AlertTriangle, Bell, Package, Search, Download, ChevronLeft, ChevronRight, QrCode, Boxes } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"
import { materialApi } from "@/api/material.api"
import { productApi } from "@/api/product.api"
import { productionApi } from "@/api/production.api"
import { purchaseOrderApi } from "@/api/purchaseOrder.api"
import { PermissionGuard, withPermission } from "@/components/guards/permission-guard"
import { AlertItem } from "./types"
import { RestockDialog } from "@/components/dialog/restock-dialog"
import { ThresholdDialog } from "@/components/dialog/threshold-dialog"
import { BatchRestockDialog } from "@/components/dialog/batch-restock-dialog"
import { toast } from "sonner"
import { QRScanner } from "@/features/receiving/components/qr-scanner"
import { useRouter, useSearchParams } from "next/navigation"

const exportAlertsCSV = (data: AlertItem[]) => {
  const headers = "Tên,Mã,Loại,Tồn kho,Đơn vị\n"
  const rows = data.map(m => `${m.name},${m.code},${m.alertType === 'order_requirement' ? 'Đơn hàng' : 'Tồn kho'},${m.currentStock},${m.unit}`).join("\n")
  const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.setAttribute("download", `canh-bao-he-thong-${new Date().toLocaleDateString()}.csv`)
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

function ProductionAlertsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoOpenKeyRef = useRef<string | null>(null)
  const [activeTab, setActiveTab] = useState("materials")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"All" | "Critical" | "Low Stock">("All")
  const [allAlerts, setAllAlerts] = useState<AlertItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [selectedItem, setSelectedItem] = useState<AlertItem | null>(null)
  const [isRestockOpen, setIsRestockOpen] = useState(false)
  const [isThresholdOpen, setIsThresholdOpen] = useState(false)
  const [isBatchOpen, setIsBatchOpen] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  const [selectedAlertIds, setSelectedAlertIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  const fetchAllAlerts = useCallback(async (search?: string) => {
    setIsLoading(true)
    try {
      const [matLowRes, prodLowRes, orderRes, poPendingRes, poAcceptedRes] = await Promise.all([
        materialApi.getLowStockMaterials({ search, limit: 100 }).catch(() => ({ success: false })),
        productApi.getLowStockProducts({ search, limit: 100 }).catch(() => ({ success: false })),
        productionApi.getMaterialAlerts({ status: 'pending', limit: 100 }).catch(() => ({ success: false })),
        purchaseOrderApi.getAll({ status: 'pending' }).catch(() => ({ success: false })),
        purchaseOrderApi.getAll({ status: 'accepted' }).catch(() => ({ success: false }))
      ])

      const poItems = new Set<string>();
      const processPOs = (res: any) => {
        const items = Array.isArray(res?.data) ? res.data : (res?.data?.items || []);
        items.forEach((po: any) => {
          po.purchaseOrderItems?.forEach((item: any) => {
            const matId = item.material?._id || item.material;
            if (matId) poItems.add(matId.toString());
          });
        });
      };
      processPOs(poPendingRes);
      processPOs(poAcceptedRes);

      let mappedMaterials: AlertItem[] = []
      let mappedProducts: AlertItem[] = []
      let mappedOrders: AlertItem[] = []

      if (matLowRes.success || (matLowRes as any).status === 'success') {
        const data = (matLowRes as any).data
        const items = data?.materials || data?.items || (Array.isArray(data) ? data : [])
        mappedMaterials = items
          .filter((m: any) => !poItems.has(m._id?.toString()))
          .map((m: any) => ({ ...m, alertType: 'low_stock', alertId: m._id, itemType: 'material' }))
      }

      if (prodLowRes.success || (prodLowRes as any).status === 'success') {
        const data = (prodLowRes as any).data
        const items = data?.products || data?.items || (Array.isArray(data) ? data : [])
        mappedProducts = items.map((p: any) => ({ ...p, alertType: 'product_low_stock', alertId: p._id, itemType: 'product' }))
      }

      const orderData = (orderRes as any).data
      if ((orderRes.success || (orderRes as any).status === 'success') && orderData?.alerts) {
        mappedOrders = orderData.alerts
          .filter((alert: any) => !alert.purchaseOrder)
          .map((alert: any) => {
            const materialInfo = alert.material && typeof alert.material === 'object' ? alert.material : {};
            return {
              ...materialInfo,
              _id: materialInfo._id || alert.material,
              name: materialInfo.name || alert.materialName || "Vật tư không xác định",
              code: materialInfo.code || alert.materialCode || "N/A",
              unit: materialInfo.unit || alert.unit || "đv",
              currentStock: materialInfo.currentStock ?? alert.availableQuantity ?? 0,
              threshold: materialInfo.threshold ?? alert.neededQuantity ?? 0,
              alertId: alert._id,
              alertType: 'order_requirement',
              itemType: 'material',
              productionOrder: alert.productionOrder,
              shortageQuantity: alert.shortageQuantity || 0
            }
          })
      }

      setAllAlerts([...mappedMaterials, ...mappedProducts, ...mappedOrders])
    } catch (error) {
      console.error("Fetch alerts error:", error)
      toast.error("Không thể tải dữ liệu cảnh báo")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchAllAlerts(searchQuery), 400)
    return () => clearTimeout(timer)
  }, [searchQuery, fetchAllAlerts])

  const filteredMaterials = useMemo(() => {
    return allAlerts.filter(a => a.itemType === 'material' && a.alertType === 'low_stock' && (statusFilter === 'All' || (statusFilter === 'Critical' ? a.currentStock === 0 : a.currentStock > 0)))
  }, [allAlerts, statusFilter])

  const filteredProducts = useMemo(() => {
    return allAlerts.filter(a => a.itemType === 'product' && (statusFilter === 'All' || (statusFilter === 'Critical' ? a.currentStock === 0 : a.currentStock > 0)))
  }, [allAlerts, statusFilter])

  const filteredOrders = useMemo(() => {
    return allAlerts.filter(a => a.alertType === 'order_requirement')
  }, [allAlerts])

  const currentDisplayItems = useMemo(() => {
    if (activeTab === 'materials') return filteredMaterials
    if (activeTab === 'products') return filteredProducts
    return filteredOrders
  }, [activeTab, filteredMaterials, filteredProducts, filteredOrders])

  const paginatedItems = useMemo(() => {
    return currentDisplayItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  }, [currentDisplayItems, page])

  const selectableItems = useMemo(() => {
    if (activeTab === 'products') return []
    return currentDisplayItems.filter(item => !!item.alertId)
  }, [activeTab, currentDisplayItems])

  const isAllSelected = useMemo(() => {
    if (selectableItems.length === 0) return false
    return selectableItems.every(item => selectedAlertIds.has(item.alertId!))
  }, [selectableItems, selectedAlertIds])

  const getStatusBadge = (item: AlertItem) => {
    if (item.currentStock === 0) return <Badge className="bg-[#DC3545] text-white">Nguy cấp</Badge>
    return <Badge className="bg-[#FFA500] text-white">Sắp hết</Badge>
  }

  const handleScanSuccess = (data: any) => {
    const code = data?.code || data?.id || (typeof data === 'string' ? data : '')
    if (code) {
      setSearchQuery(code)
      toast.success(`Đã quét mã: ${code}`)
    }
  }

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "materials" || tab === "products" || tab === "orders") {
      setActiveTab(tab)
    }
  }, [searchParams])

  useEffect(() => {
    const shouldCreatePO = searchParams.get("createPO") === "true"
    const orderId = searchParams.get("orderId")
    if (!shouldCreatePO || !orderId) {
      autoOpenKeyRef.current = null
      return
    }

    const matchedAlerts = allAlerts.filter((item) => {
      if (item.alertType !== "order_requirement" || !item.alertId) return false
      const po: any = item.productionOrder
      const poId = typeof po === "string" ? po : po?._id
      return poId === orderId
    })
    if (matchedAlerts.length === 0) return

    const key = `${orderId}:${matchedAlerts.length}`
    if (autoOpenKeyRef.current === key) return
    autoOpenKeyRef.current = key

    setActiveTab("orders")
    setSelectedAlertIds(new Set(matchedAlerts.map((item) => item.alertId!)))
    setIsBatchOpen(true)

    const next = new URLSearchParams(searchParams.toString())
    next.delete("createPO")
    next.delete("orderId")
    router.replace(next.toString() ? `/alerts?${next.toString()}` : "/alerts")
  }, [allAlerts, router, searchParams])

  return (
    <AppShell title="Cảnh báo tồn kho" subtitle="Theo dõi nguyên liệu và thành phẩm cần bổ sung">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Cảnh báo tồn kho</h2>
          <div className="flex gap-2">
            {selectedAlertIds.size > 0 && (
              <Button onClick={() => setIsBatchOpen(true)}>Tạo PO Đã Chọn ({selectedAlertIds.size})</Button>
            )}
            <Button variant="outline" onClick={() => exportAlertsCSV(currentDisplayItems)}><Download className="h-4 w-4 mr-2" /> Xuất Excel</Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
            <TabsTrigger value="materials">Vật liệu ({filteredMaterials.length})</TabsTrigger>
            <TabsTrigger value="products">Thành phẩm  ({filteredProducts.length})</TabsTrigger>
            <TabsTrigger value="orders">Đơn sản xuất ({filteredOrders.length})</TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-4">
            <Card>
              <CardContent className="p-4 flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Tìm kiếm..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
                <Button variant="outline" onClick={() => setIsScannerOpen(true)}><QrCode className="mr-2 h-4 w-4" /> Quét QR</Button>
                {activeTab !== 'orders' && (
                  <div className="flex gap-2">
                    {['All', 'Critical', 'Low Stock'].map(f => (
                      <Button key={f} variant={statusFilter === f ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(f as any)}>{f === 'All' ? 'Tất cả' : f === 'Critical' ? 'Nguy cấp' : 'Sắp hết'}</Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {activeTab !== 'products' && (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={(checked) => {
                              const next = new Set(selectedAlertIds)
                              if (checked) {
                                selectableItems.forEach(item => next.add(item.alertId!))
                              } else {
                                selectableItems.forEach(item => next.delete(item.alertId!))
                              }
                              setSelectedAlertIds(next)
                            }}
                          />
                        </TableHead>
                      )}
                      <TableHead>Mặt hàng</TableHead>
                      {activeTab === 'orders' && <TableHead>Đơn sản xuất</TableHead>}
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Tồn kho</TableHead>
                      <TableHead className="text-right">{activeTab === 'orders' ? 'Cần thêm' : 'Ngưỡng'}</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Đang tải dữ liệu...</TableCell></TableRow>
                    ) : paginatedItems.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Không có cảnh báo nào trong mục này</TableCell></TableRow>
                    ) : (
                      paginatedItems.map((item) => (
                        <TableRow key={item.alertId}>
                          {activeTab !== 'products' && (
                            <TableCell>
                              <Checkbox checked={selectedAlertIds.has(item.alertId!)} onCheckedChange={(checked) => {
                                const newSet = new Set(selectedAlertIds)
                                checked ? newSet.add(item.alertId!) : newSet.delete(item.alertId!)
                                setSelectedAlertIds(newSet)
                              }} />
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="font-medium text-foreground">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.code}</div>
                          </TableCell>
                          {activeTab === 'orders' && (
                            <TableCell><Badge variant="outline" className="bg-purple-50 text-purple-700">{item.productionOrder?.orderCode || 'N/A'}</Badge></TableCell>
                          )}
                          <TableCell>{getStatusBadge(item)}</TableCell>
                          <TableCell className="text-right font-bold text-foreground">{item.currentStock.toLocaleString()} {item.unit}</TableCell>
                          <TableCell className="text-right text-red-600 font-medium">
                            {activeTab === 'orders' ? `${item.shortageQuantity?.toLocaleString()} ${item.unit}` : `${item.threshold?.toLocaleString()} ${item.unit}`}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.itemType === 'material' ? (
                              <Button variant="outline" size="sm" onClick={() => { setSelectedItem(item); setIsRestockOpen(true); }}>Nhập hàng</Button>
                            ) : (
                              <Button variant="outline" size="sm" disabled className="opacity-50">Sản xuất thêm</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <CustomPagination page={page} total={currentDisplayItems.length} pageSize={ITEMS_PER_PAGE} onChange={setPage} />
              </CardContent>
            </Card>
          </div>
        </Tabs>
      </div>

      {selectedItem && (
        <>
          <RestockDialog open={isRestockOpen} onOpenChange={setIsRestockOpen} material={selectedItem} onSuccess={() => fetchAllAlerts(searchQuery)} />
          <ThresholdDialog open={isThresholdOpen} onOpenChange={setIsThresholdOpen} material={selectedItem} onSuccess={() => fetchAllAlerts(searchQuery)} />
        </>
      )}
      <BatchRestockDialog open={isBatchOpen} onOpenChange={setIsBatchOpen} selectedMaterials={allAlerts.filter(a => selectedAlertIds.has(a.alertId!))} onSuccess={() => fetchAllAlerts(searchQuery)} />
      <QRScanner open={isScannerOpen} onOpenChange={setIsScannerOpen} onScanSuccess={handleScanSuccess} />
    </AppShell>
  )
}

export default withPermission(ProductionAlertsPage, ['admin', 'production_manager'])
