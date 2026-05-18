"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { AlertTriangle, Bell, Package, Search, Download, ChevronLeft, ChevronRight, QrCode, Boxes, ChevronDown } from "lucide-react"
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
import { withPermission } from "@/components/guards/permission-guard"
import { AlertItem } from "./types"
import { RestockDialog } from "@/components/dialog/restock-dialog"
import { ThresholdDialog } from "@/components/dialog/threshold-dialog"
import { BatchRestockDialog } from "@/components/dialog/batch-restock-dialog"
import { toast } from "sonner"
import { QRScanner } from "@/features/receiving/components/qr-scanner"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/features/auth/hooks/use-auth"

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

const getOrderId = (item: AlertItem) => {
  const order = item.productionOrder
  return typeof order === "string" ? order : order?._id || "unknown"
}

const getOrderCode = (item: AlertItem) => {
  const order = item.productionOrder
  return typeof order === "string" ? order : order?.orderCode || "N/A"
}

const getOrderProductName = (item: AlertItem) => {
  const order = item.productionOrder
  if (!order || typeof order === "string") return "Đơn sản xuất"
  const firstProduct = order.products?.[0]?.product
  return firstProduct?.name || order.product?.name || order.name || "Đơn sản xuất"
}

function ProductionAlertsPage() {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchParamsString = searchParams.toString()
  const tabParam = searchParams.get("tab")
  const shouldCreatePO = searchParams.get("createPO") === "true"
  const orderIdParam = searchParams.get("orderId")
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
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set())
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
          .filter((alert: any) => {
            const normalizedStatus = String(alert?.status || "").toLowerCase()
            return normalizedStatus === "pending" && !alert?.purchaseOrder
          })
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

  const orderAlertGroups = useMemo(() => {
    const groups = new Map<string, { orderId: string; orderCode: string; productName: string; alerts: AlertItem[] }>()

    filteredOrders.forEach((item) => {
      const orderId = getOrderId(item)
      const existing = groups.get(orderId)
      if (existing) {
        existing.alerts.push(item)
        return
      }

      groups.set(orderId, {
        orderId,
        orderCode: getOrderCode(item),
        productName: getOrderProductName(item),
        alerts: [item],
      })
    })

    return Array.from(groups.values())
  }, [filteredOrders])

  const paginatedOrderGroups = useMemo(() => {
    return orderAlertGroups.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  }, [orderAlertGroups, page])

  const selectableItems = useMemo(() => {
    if (activeTab === 'products') return []
    return currentDisplayItems.filter(item => !!item.alertId)
  }, [activeTab, currentDisplayItems])

  const selectableOrderItems = useMemo(() => {
    return filteredOrders.filter((item) => !!item.alertId)
  }, [filteredOrders])

  const isAllSelected = useMemo(() => {
    if (selectableItems.length === 0) return false
    return selectableItems.every(item => selectedAlertIds.has(item.alertId!))
  }, [selectableItems, selectedAlertIds])

  const isAllOrdersSelected = useMemo(() => {
    if (selectableOrderItems.length === 0) return false
    return selectableOrderItems.every((item) => selectedAlertIds.has(item.alertId!))
  }, [selectableOrderItems, selectedAlertIds])

  const getStatusBadge = (item: AlertItem) => {
    if (item.currentStock === 0) return <Badge className="bg-[#DC3545] text-white">Nguy cấp</Badge>
    return <Badge className="bg-[#FFA500] text-white">Sắp hết</Badge>
  }

  const toggleOrderGroup = (orderId: string) => {
    setExpandedOrderIds((current) => {
      const next = new Set(current)
      next.has(orderId) ? next.delete(orderId) : next.add(orderId)
      return next
    })
  }

  const toggleOrderGroupSelection = (alerts: AlertItem[], checked: boolean) => {
    setSelectedAlertIds((current) => {
      const next = new Set(current)
      alerts.forEach((item) => {
        if (!item.alertId) return
        checked ? next.add(item.alertId) : next.delete(item.alertId)
      })
      return next
    })
  }

  const toggleAllOrderAlerts = (checked: boolean) => {
    setSelectedAlertIds((current) => {
      const next = new Set(current)
      selectableOrderItems.forEach((item) => {
        if (!item.alertId) return
        checked ? next.add(item.alertId) : next.delete(item.alertId)
      })
      return next
    })
  }

  const handleScanSuccess = (data: any) => {
    const code = data?.code || data?.id || (typeof data === 'string' ? data : '')
    if (code) {
      setSearchQuery(code)
      toast.success(`Đã quét mã: ${code}`)
    }
  }

  useEffect(() => {
    if (tabParam === "materials" || tabParam === "products" || tabParam === "orders") {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  useEffect(() => {
    if (isAdmin) return
    if (!shouldCreatePO || !orderIdParam) {
      autoOpenKeyRef.current = null
      return
    }

    const matchedAlerts = allAlerts.filter((item) => {
      if (item.alertType !== "order_requirement" || !item.alertId) return false
      const po: any = item.productionOrder
      const poId = typeof po === "string" ? po : po?._id
      return poId === orderIdParam
    })
    if (matchedAlerts.length === 0) return

    const key = `${orderIdParam}:${matchedAlerts.length}`
    if (autoOpenKeyRef.current === key) return
    autoOpenKeyRef.current = key

    setActiveTab("orders")
    setSelectedAlertIds(new Set(matchedAlerts.map((item) => item.alertId!)))
    setIsBatchOpen(true)

    const next = new URLSearchParams(searchParamsString)
    next.delete("createPO")
    next.delete("orderId")
    router.replace(next.toString() ? `/alerts?${next.toString()}` : "/alerts")
  }, [allAlerts, isAdmin, orderIdParam, router, searchParamsString, shouldCreatePO])

  return (
    <AppShell title="Cảnh báo tồn kho" subtitle="Theo dõi nguyên liệu và thành phẩm cần bổ sung">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Cảnh báo tồn kho</h2>
          <div className="flex gap-2">
            {!isAdmin && selectedAlertIds.size > 0 && (
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
                {activeTab === 'orders' && !isAdmin && (
                  <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                    <Checkbox
                      checked={isAllOrdersSelected}
                      onCheckedChange={(checked) => toggleAllOrderAlerts(!!checked)}
                    />
                    <span className="text-sm text-muted-foreground">Chọn tất cả cảnh báo</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {activeTab === 'orders' ? (
              <div className="space-y-3">
                {isLoading ? (
                  <Card><CardContent className="h-24 p-6 text-center text-muted-foreground">Đang tải dữ liệu...</CardContent></Card>
                ) : paginatedOrderGroups.length === 0 ? (
                  <Card><CardContent className="h-24 p-6 text-center text-muted-foreground">Không có cảnh báo nào trong mục này</CardContent></Card>
                ) : (
                  paginatedOrderGroups.map((group) => {
                    const isExpanded = expandedOrderIds.has(group.orderId)
                    const groupSelected = group.alerts.every((item) => item.alertId && selectedAlertIds.has(item.alertId))
                    const totalShortage = group.alerts.reduce((sum, item) => sum + (item.shortageQuantity || 0), 0)
                    const criticalCount = group.alerts.filter((item) => item.currentStock === 0).length

                    return (
                      <div key={group.orderId} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                        <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center">
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-muted/30"
                            onClick={() => toggleOrderGroup(group.orderId)}
                          >
                            <div className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                              isExpanded ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/50 text-muted-foreground"
                            )}>
                              <ChevronDown className={cn("h-4 w-4 transition-transform", !isExpanded && "-rotate-90")} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-sm font-bold text-primary">{group.orderCode}</span>
                                <Badge variant="outline" className="bg-red-50 text-red-700">
                                  {group.alerts.length} vật tư thiếu
                                </Badge>
                                {criticalCount > 0 && (
                                  <Badge className="bg-[#DC3545] text-white">{criticalCount} nguy cấp</Badge>
                                )}
                              </div>
                              <p className="mt-1 truncate text-sm text-muted-foreground">{group.productName}</p>
                            </div>
                          </button>

                          <div className="grid grid-cols-2 gap-4 md:flex md:items-center md:gap-6">
                            <div>
                              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Tổng cần thêm</p>
                              <p className="text-sm font-bold text-red-600">{totalShortage.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Đã chọn</p>
                              {!isAdmin && (
                                <Checkbox
                                  checked={groupSelected}
                                  onCheckedChange={(checked) => toggleOrderGroupSelection(group.alerts, !!checked)}
                                />
                              )}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="space-y-2 border-t bg-muted/20 p-4">
                            {group.alerts.map((item) => (
                              <div key={item.alertId} className={cn(
                                "grid gap-3 rounded-xl border bg-background p-3 md:items-center",
                                isAdmin
                                  ? "md:grid-cols-[minmax(0,1fr)_110px_140px_140px]"
                                  : "md:grid-cols-[auto_minmax(0,1fr)_110px_140px_140px_auto]"
                              )}>
                                {!isAdmin && (
                                  <Checkbox checked={selectedAlertIds.has(item.alertId!)} onCheckedChange={(checked) => {
                                    const newSet = new Set(selectedAlertIds)
                                    checked ? newSet.add(item.alertId!) : newSet.delete(item.alertId!)
                                    setSelectedAlertIds(newSet)
                                  }} />
                                )}
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-foreground">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">{item.code}</p>
                                </div>
                                <div className="md:justify-self-start">{getStatusBadge(item)}</div>
                                <div className="text-sm font-semibold text-foreground whitespace-nowrap md:text-right">
                                  {item.currentStock.toLocaleString()} {item.unit}
                                </div>
                                <div className="text-sm font-semibold text-red-600 whitespace-nowrap md:text-right">
                                    {item.shortageQuantity?.toLocaleString()} {item.unit}
                                </div>

                                {!isAdmin && (
                                  <div className="flex justify-end">
                                    <Button variant="outline" size="sm" onClick={() => { setSelectedItem(item); setIsRestockOpen(true); }}>Nhập hàng</Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
                <CustomPagination page={page} total={orderAlertGroups.length} pageSize={ITEMS_PER_PAGE} onChange={setPage} />
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {activeTab !== 'products' && !isAdmin && (
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
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Tồn kho</TableHead>
                        <TableHead className="text-right">Ngưỡng</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Đang tải dữ liệu...</TableCell></TableRow>
                      ) : paginatedItems.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Không có cảnh báo nào trong mục này</TableCell></TableRow>
                      ) : (
                        paginatedItems.map((item) => (
                          <TableRow key={item.alertId}>
                            {activeTab !== 'products' && !isAdmin && (
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
                            <TableCell>{getStatusBadge(item)}</TableCell>
                            <TableCell className="text-right font-bold text-foreground">{item.currentStock.toLocaleString()} {item.unit}</TableCell>
                            <TableCell className="text-right text-red-600 font-medium">
                              {item.threshold?.toLocaleString()} {item.unit}
                            </TableCell>
                            <TableCell className="text-right">
                              {!isAdmin && item.itemType === 'material' ? (
                                <Button variant="outline" size="sm" onClick={() => { setSelectedItem(item); setIsRestockOpen(true); }}>Nhập hàng</Button>
                              ) : !isAdmin ? (
                                <Button variant="outline" size="sm" disabled className="opacity-50">Sản xuất thêm</Button>
                              ) : <span className="text-xs text-muted-foreground">Chỉ xem</span>}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <CustomPagination page={page} total={currentDisplayItems.length} pageSize={ITEMS_PER_PAGE} onChange={setPage} />
                </CardContent>
              </Card>
            )}
          </div>
        </Tabs>
      </div>

      {selectedItem && (
        <>
          <RestockDialog open={isRestockOpen} onOpenChange={setIsRestockOpen} material={selectedItem} onSuccess={() => fetchAllAlerts(searchQuery)} />
          <ThresholdDialog open={isThresholdOpen} onOpenChange={setIsThresholdOpen} material={selectedItem} onSuccess={() => fetchAllAlerts(searchQuery)} />
        </>
      )}
      {!isAdmin && (
        <BatchRestockDialog open={isBatchOpen} onOpenChange={setIsBatchOpen} selectedMaterials={allAlerts.filter(a => selectedAlertIds.has(a.alertId!))} onSuccess={() => fetchAllAlerts(searchQuery)} />
      )}
      <QRScanner open={isScannerOpen} onOpenChange={setIsScannerOpen} onScanSuccess={handleScanSuccess} />
    </AppShell>
  )
}

export default withPermission(ProductionAlertsPage, ['admin', 'production_manager'])
