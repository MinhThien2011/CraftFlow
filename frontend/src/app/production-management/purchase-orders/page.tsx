'use client'

import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  PackagePlus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  MoreVertical,
  Calendar,
  User,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  QrCode
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { materialApi } from "@/api/material.api"
import { productionApi } from "@/api/production.api"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { purchaseOrderApi, PurchaseOrder } from '@/api/purchaseOrder.api'
import { useAuth } from "@/features/auth/hooks/use-auth"
import { toast } from 'sonner'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useSearchParams } from 'next/navigation'

const QRScanner = dynamic(
  () => import("@/features/receiving/components/qr-scanner").then((m) => m.QRScanner),
  { ssr: false }
)

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((m) => m.QRCodeSVG),
  {
    ssr: false,
    loading: () => <div className="h-[110px] w-[110px] rounded-md bg-muted animate-pulse" />,
  }
)

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

export default function PurchaseOrdersPage() {
  return (
    <Suspense fallback={
      <AppShell title="YÃªu cáº§u mua hÃ ng" subtitle="Quáº£n lÃ½ cÃ¡c yÃªu cáº§u mua nguyÃªn váº­t liá»‡u tá»« bá»™ pháº­n sáº£n xuáº¥t">
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      </AppShell>
    }>
      <PurchaseOrdersContent />
    </Suspense>
  )
}

function PurchaseOrdersContent() {
  const { role, isAdmin } = useAuth()
  const searchParams = useSearchParams()
  const autoCreateKeyRef = useRef<string | null>(null)
  const statusSubmitLockRef = useRef(false)
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [adminNote, setAdminNote] = useState("")
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createPriority, setCreatePriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [createReason, setCreateReason] = useState('')
  const [createOrder, setCreateOrder] = useState('')
  const [createItems, setCreateItems] = useState<any[]>([])

  const [insufficientOrders, setInsufficientOrders] = useState<any[]>([])
  const [materialAlerts, setMaterialAlerts] = useState<any[]>([])
  const [availableMaterials, setAvailableMaterials] = useState<any[]>([])

  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter])

  const fetchOrders = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await purchaseOrderApi.getAll({
        status: statusFilter === 'all' ? undefined : statusFilter
      })

      const res: any = response;
      if (res.success || res.status === 'success') {
        setOrders(Array.isArray(res.data) ? res.data : (res.data?.items || []))
      }
    } catch (error: any) {
      toast.error("Không thể tải danh sách yêu cầu mua hàng")
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Handle auto-open create modal from query params
  useEffect(() => {
    const shouldCreate = searchParams.get('create') === 'true'
    const orderId = searchParams.get('orderId')
    const autoCreateKey = `${shouldCreate}:${orderId || ''}`

    if (!shouldCreate) {
      autoCreateKeyRef.current = null
      return
    }

    if (autoCreateKeyRef.current === autoCreateKey) return
    autoCreateKeyRef.current = autoCreateKey

    handleOpenCreate()
    if (orderId) {
      const checkAndSet = setInterval(() => {
        if (insufficientOrders.length > 0 || materialAlerts.length > 0) {
          handleCreateOrderChange(orderId)
          clearInterval(checkAndSet)
        }
      }, 500)

      setTimeout(() => clearInterval(checkAndSet), 10000)
    }
  }, [searchParams, insufficientOrders.length, materialAlerts.length])

  const handleOpenCreate = () => {
    setIsCreateOpen(true)
    setCreatePriority('medium')
    setCreateReason('')
    setCreateOrder('none')
    setCreateItems([])

    if (insufficientOrders.length === 0) {
      Promise.all([
        (productionApi as any).getAll ? (productionApi as any).getAll({ status: 'insufficient_materials', limit: 100 }) : (productionApi as any).getOrders({ status: 'insufficient_materials', limit: 100 }),
        (materialApi as any).getMaterials({ limit: 100 }),
        (productionApi as any).getMaterialAlerts({ limit: 100, status: 'pending' })
      ]).then(([ordersRes, materialsRes, alertsRes]: any) => {
        setInsufficientOrders(ordersRes?.data?.orders || ordersRes?.data?.items || ordersRes?.data || [])
        setAvailableMaterials(materialsRes?.data?.materials || materialsRes?.data?.items || materialsRes?.data || [])
        setMaterialAlerts(alertsRes?.data?.alerts || alertsRes?.data?.items || alertsRes?.data || [])
      }).catch(console.error)
    }
  }

  const handleCreateOrderChange = (val: string) => {
    const newVal = val === "none" ? "" : val;
    setCreateOrder(newVal);
    if (newVal) {
      const alertsForOrder = materialAlerts.filter(a => {
        const orderId = a.productionOrder?._id || a.productionOrder;
        return orderId === newVal && !a.purchaseOrder;
      });

      const newItems = alertsForOrder.map(a => ({
        isManual: false,
        material: a.material,
        quantity: String(a.shortageQuantity || a.neededQuantity || 1),
        alertId: a._id,
        productionOrder: a.productionOrder
      }));

      setCreateItems(prev => [
        ...newItems,
        ...prev.filter(i => i.isManual)
      ]);
      setCreatePriority('high');

      const orderData = insufficientOrders.find(o => o._id === newVal);
      if (orderData && !createReason) {
        setCreateReason(`Nhập vật tư cho lệnh sản xuất ${orderData.orderCode || orderData._id}`);
      }
    } else {
      setCreateItems(prev => prev.filter(i => i.isManual));
    }
  }

  const addEmptyCreateItem = () => {
    setCreateItems([...createItems, {
      isManual: true,
      material: { _id: '', name: 'Chọn vật tư...', code: '', unit: 'đv', price: 0 },
      quantity: '1'
    }])
  }

  const handleCreateSubmit = async () => {
    const validItems = createItems.filter(i => i.material && i.material._id)
    if (validItems.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 vật tư')
      return
    }
    if (validItems.some(i => !i.quantity || Number(i.quantity) <= 0)) {
      toast.error('Vui lòng nhập số lượng hợp lệ cho tất cả vật tư')
      return
    }

    setIsSubmitting(true)
    try {
      const purchaseOrderItems = validItems.map(item => ({
        material: item.material._id,
        quantity: Number(item.quantity),
        materialCode: item.material.code || item.materialCode || '',
        unit: item.material.unit || 'đv',
        priceAtTimePurchase: item.material.price || 0,
        totalPriceAtTimePurchase: (item.material.price || 0) * Number(item.quantity)
      }))

      const payload: any = {
        orderReason: createReason || `Yêu cầu nhập hàng cho ${purchaseOrderItems.length} vật tư`,
        priority: createPriority,
        purchaseOrderItems,
        ...(createOrder && { productionOrder: createOrder })
      }

      const alertIds = validItems.map(i => i.alertId).filter(Boolean)
      const sourceProductionOrderIds = Array.from(new Set(
        validItems
          .map((item) => item.productionOrder?._id || item.productionOrder)
          .filter(Boolean)
      ))
      if (alertIds.length > 0) {
        payload.materialAlert = alertIds[0]
        payload.materialAlerts = alertIds
      }
      if (sourceProductionOrderIds.length > 0) {
        payload.sourceProductionOrders = sourceProductionOrderIds
      }

      const response = await purchaseOrderApi.create(payload)
      const res: any = response;

      if (res?.success === false || res?.status === 'error') {
        throw new Error(res?.message || res?.error || "Không thể tạo yêu cầu mua hàng")
      }

      toast.success(`Đã tạo yêu cầu mua hàng thành công`)
      setIsCreateOpen(false)
      fetchOrders()
    } catch (error: any) {
      console.error("Create PO error:", error?.response?.data || error)
      toast.error(error?.response?.data?.message || error?.response?.data?.error || error?.message || "Không thể tạo yêu cầu mua hàng")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (statusSubmitLockRef.current) return
    statusSubmitLockRef.current = true
    setIsSubmitting(true)
    try {
      await purchaseOrderApi.updateStatus(id, newStatus, adminNote)
      toast.success(`Đã ${newStatus === 'accepted' ? 'duyệt' : 'từ chối'} yêu cầu thành công`)
      setIsDetailsOpen(false)
      setAdminNote("")
      fetchOrders()
    } catch (error: any) {
      console.error("Update PO status error:", error?.response?.data || error)
      toast.error(error?.response?.data?.message || error?.response?.data?.error || error?.message || "Không thể cập nhật trạng thái")
    } finally {
      statusSubmitLockRef.current = false
      setIsSubmitting(false)
    }
  }

  const handleScanSuccess = (data: any) => {
    const scannedId = data?.id || data?.orderCode || (typeof data === 'string' ? data : null)
    if (scannedId) {
      const order = orders.find(o => o._id === scannedId || (o as any).orderCode === scannedId)
      if (order) {
        setSelectedOrder(order)
        setIsDetailsOpen(true)
        toast.success("Đã mở chi tiết phiếu yêu cầu")
      } else {
        toast.error("Không tìm thấy phiếu yêu cầu này trong hệ thống")
      }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Chờ duyệt</Badge>
      case 'accepted':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Đã duyệt</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Từ chối</Badge>
      case 'completed':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Hoàn thành</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-500">Cao</Badge>
      case 'medium':
        return <Badge className="bg-amber-500">Trung bình</Badge>
      case 'low':
        return <Badge className="bg-blue-500">Thấp</Badge>
      default:
        return <Badge>{priority}</Badge>
    }
  }

  const filteredOrders = (orders || []).filter(order =>
    order.orderReason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (order as any).orderCode?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const paginatedOrders = filteredOrders.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  return (
    <AppShell
      title="Yêu cầu mua hàng"
      subtitle="Quản lý các yêu cầu mua nguyên vật liệu từ bộ phận sản xuất"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm yêu cầu..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setIsScannerOpen(true)}>
              <QrCode className="mr-2 h-4 w-4" />
              Quét QR
            </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
                <SelectItem value="accepted">Đã duyệt</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
              </SelectContent>
            </Select>
            {!isAdmin && (
              <Button onClick={handleOpenCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Tạo PO
              </Button>
            )}
          </div>
        </div>

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Mã yêu cầu</TableHead>
                  <TableHead>Lý do / Nội dung</TableHead>
                  <TableHead>Độ ưu tiên</TableHead>
                  <TableHead>Tổng tiền</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right pr-6">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="h-12 text-center"><Spinner /></TableCell>
                    </TableRow>
                  ))
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      Không tìm thấy yêu cầu mua hàng nào
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOrders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell className="pl-6 font-medium">
                        {(order as any).orderCode || order._id.slice(-6).toUpperCase()}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {order.orderReason}
                      </TableCell>
                      <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        <CurrencyDisplay value={order.totalBaseCost} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(order.createdAt), 'dd/MM/yyyy', { locale: vi })}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedOrder(order)
                              setIsDetailsOpen(true)
                            }}>
                              <Eye className="mr-2 h-4 w-4" /> Chi tiết
                            </DropdownMenuItem>
                            {order.status === 'pending' && (
                              <DropdownMenuItem className="text-destructive">
                                <XCircle className="mr-2 h-4 w-4" /> Hủy yêu cầu
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <CustomPagination page={page} total={filteredOrders.length} pageSize={ITEMS_PER_PAGE} onChange={setPage} />
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent size="3xl">
          <DialogHeader>
            <DialogTitle>Chi tiết yêu cầu mua hàng</DialogTitle>
            <DialogDescription>
              Mã: {(selectedOrder as any)?.orderCode || selectedOrder?._id.slice(-6).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">Người tạo</p>
                    <p className="font-medium flex items-center gap-2">
                      <User className="h-3 w-3" />
                      {(selectedOrder.creator as any)?.username || (selectedOrder.creator as any)?.fullName || "Production Manager"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">Ngày tạo</p>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(selectedOrder.createdAt), 'HH:mm dd/MM/yyyy', { locale: vi })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">Độ ưu tiên</p>
                    {getPriorityBadge(selectedOrder.priority)}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">Trạng thái</p>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border-2 border-dashed border-muted shrink-0">
                  <QRCodeSVG
                    value={JSON.stringify({ type: 'PURCHASE_ORDER', id: selectedOrder._id, orderCode: (selectedOrder as any).orderCode })}
                    size={110}
                    level="H"
                    includeMargin={true}
                  />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">Mã QR Tra Cứu</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Lý do mua hàng</p>
                <p className="text-sm bg-background p-3 rounded border border-border italic">
                  "{selectedOrder.orderReason}"
                </p>
              </div>

              {selectedOrder.adminNotes && (
                <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> Ghi chú từ Admin
                  </p>
                  <p className="text-sm text-amber-700">{selectedOrder.adminNotes}</p>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm font-semibold">Danh sách vật tư</p>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="h-9 text-xs">Mã</TableHead>
                        <TableHead className="h-9 text-xs">Tên vật tư</TableHead>
                        <TableHead className="h-9 text-xs text-right">Số lượng</TableHead>
                        <TableHead className="h-9 text-xs text-right">Đơn giá</TableHead>
                        <TableHead className="h-9 text-xs text-right">Thành tiền</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.purchaseOrderItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs">{item.materialCode}</TableCell>
                          <TableCell className="text-xs font-medium">{(item.material as any)?.name || "Vật tư"}</TableCell>
                          <TableCell className="text-xs text-right font-medium">
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            <CurrencyDisplay value={item.priceAtTimePurchase} />
                          </TableCell>
                          <TableCell className="text-xs text-right font-bold text-primary">
                            <CurrencyDisplay value={item.totalPriceAtTimePurchase} />
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-bold">
                        <TableCell colSpan={4} className="text-right py-3 uppercase text-xs tracking-wider">Tổng cộng</TableCell>
                        <TableCell className="text-right py-3 text-primary text-base">
                          <CurrencyDisplay value={selectedOrder.totalBaseCost} />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {isAdmin && selectedOrder.status === 'pending' && (
                <div className="space-y-2 pt-4 border-t border-border">
                  <Label htmlFor="admin-note">Ghi chú phê duyệt/từ chối</Label>
                  <Textarea
                    id="admin-note"
                    placeholder="Nhập ghi chú phản hồi..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-2">
            <Button variant="outline" onClick={() => {
              setIsDetailsOpen(false)
              setAdminNote("")
            }}>
              Đóng
            </Button>

            {isAdmin && selectedOrder?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleUpdateStatus(selectedOrder._id, 'rejected')}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Spinner className="mr-2" /> : <XCircle className="mr-2 h-4 w-4" />}
                  Từ chối
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleUpdateStatus(selectedOrder._id, 'accepted')}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Spinner className="mr-2" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Phê duyệt
                </Button>
              </>
            )}

            {!isAdmin && selectedOrder?.status === 'pending' && (
              <Button className="bg-primary text-white">Chỉnh sửa</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent size="full" className="max-h-[90vh] overflow-y-auto p-8 sm:p-12 rounded-[2rem] shadow-2xl border-muted/20">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-extrabold tracking-tight text-primary">Tạo Yêu Cầu Mua Hàng</DialogTitle>
            <DialogDescription className="text-lg text-muted-foreground mt-2">
              Tạo yêu cầu nhập vật tư mới hoặc nhập cho lệnh sản xuất bị thiếu vật liệu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-10 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Mức độ ưu tiên</Label>
                <Select value={createPriority} onValueChange={(v: any) => setCreatePriority(v)}>
                  <SelectTrigger className="h-12 text-base rounded-xl border-2">
                    <SelectValue placeholder="Chọn mức độ" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="low" className="rounded-lg">Thấp</SelectItem>
                    <SelectItem value="medium" className="rounded-lg">Trung bình</SelectItem>
                    <SelectItem value="high" className="rounded-lg">Cao</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Lý do / Ghi chú</Label>
                <Input
                  className="h-12 text-lg rounded-xl border-2 px-4"
                  placeholder="VD: Nhập vật tư cho đơn hàng..."
                  value={createReason}
                  onChange={e => setCreateReason(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Đơn Sản Xuất (Thiếu vật tư)</Label>
                <Select value={createOrder || "none"} onValueChange={handleCreateOrderChange}>
                  <SelectTrigger className="h-12 text-base rounded-xl border-2 bg-background">
                    <SelectValue placeholder="Chọn lệnh sản xuất..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="none" className="rounded-lg">-- Không chọn --</SelectItem>
                    {(Array.isArray(insufficientOrders) ? insufficientOrders : []).map(o => (
                      <SelectItem key={o._id} value={o._id} className="rounded-lg">{o.orderCode || o._id}</SelectItem>
                    ))}
                    {createOrder && !(Array.isArray(insufficientOrders) ? insufficientOrders : []).some(o => o._id === createOrder) && (
                      <SelectItem value={createOrder} className="rounded-lg">{createOrder}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <Label className="text-xl font-bold text-foreground/90">Danh sách vật tư</Label>
                <Button variant="outline" size="default" onClick={addEmptyCreateItem} className="h-12 px-8 rounded-xl border-2 hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                  <Plus className="h-5 w-5 mr-2" /> Thêm vật tư
                </Button>
              </div>
              <div className="border-2 rounded-[1.5rem] p-6 bg-muted/10 min-h-[200px] max-h-[400px] overflow-y-auto shadow-inner">
                <div className="grid grid-cols-1 gap-6">
                  {createItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-4">
                      <PackagePlus className="h-16 w-16 opacity-10" />
                      <p className="text-lg font-medium">Chưa có vật tư nào được thêm</p>
                    </div>
                  ) : createItems.map((item, index) => (
                    <div key={index} className="flex flex-col lg:flex-row items-start lg:items-end gap-6 p-6 bg-card hover:bg-accent/5 transition-colors rounded-[1.25rem] border border-border shadow-sm relative group">
                      {item.isManual ? (
                        <div className="w-full lg:flex-1 space-y-3">
                          <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Chọn vật tư cần nhập</Label>
                          <Select
                            value={item.material._id}
                            onValueChange={(val) => {
                              const selectedMat = availableMaterials.find(m => m._id === val)
                              if (selectedMat) {
                                const newItems = [...createItems]
                                newItems[index].material = selectedMat
                                setCreateItems(newItems)
                              }
                            }}
                          >
                            <SelectTrigger className="h-12 text-base rounded-xl border-2 bg-background">
                              <SelectValue placeholder="Chọn vật tư..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {(Array.isArray(availableMaterials) ? availableMaterials : []).map(m => (
                                <SelectItem key={m._id} value={m._id} className="rounded-lg">{m.name} ({m.code})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="w-full lg:flex-1 space-y-2">
                          <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Vật tư yêu cầu</Label>
                          <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                            <p className="text-lg font-bold text-primary truncate">{item.material.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] font-mono">{item.material.code}</Badge>
                              <span className="text-xs text-muted-foreground">Tồn hiện tại: <span className="font-bold text-foreground">{item.material.currentStock || 0}</span></span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="w-full lg:w-48 space-y-3">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Số lượng</Label>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...createItems]
                              newItems[index].quantity = e.target.value
                              setCreateItems(newItems)
                            }}
                            className="h-12 text-xl font-bold rounded-xl border-2 bg-background"
                            min={1}
                          />
                          <Badge className="h-12 px-4 rounded-xl text-sm font-bold bg-muted text-muted-foreground border-0 uppercase">{item.material?.unit || 'đv'}</Badge>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newItems = [...createItems]
                          newItems.splice(index, 1)
                          setCreateItems(newItems)
                        }}
                        className="absolute top-4 right-4 lg:static h-12 w-12 rounded-xl text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <XCircle className="h-6 w-6" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-4 mt-8">
            <Button variant="outline" size="lg" onClick={() => setIsCreateOpen(false)} className="h-14 px-10 rounded-2xl text-lg font-semibold border-2">Hủy bỏ</Button>
            <Button
              size="lg"
              onClick={handleCreateSubmit}
              disabled={isSubmitting}
              className="h-14 px-12 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? <Spinner className="mr-2" /> : <CheckCircle2 className="mr-2 h-6 w-6" />}
              Xác nhận tạo yêu cầu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QRScanner
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScanSuccess={handleScanSuccess}
      />
    </AppShell>
  )
}

// Re-using components from ui
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from '@radix-ui/react-label'
