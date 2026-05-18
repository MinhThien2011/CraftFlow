"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Package, Eye, Check, X, Loader2, Clock, ExternalLink, Plus, ClipboardList } from "lucide-react"
import { productExportApi, ProductExportRequest } from "@/api/productExport.api"
import { slipApi, Slip } from "@/api/slip.api"
import { productApi } from "@/api/product.api"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/features/auth/hooks/use-auth"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { SlipDetailDialog } from "@/components/shared/slip-detail-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const STATUS_CONFIG: Record<string, { label: string, color: string }> = {
  pending: { label: 'Chờ duyệt', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
  approved: { label: 'Đã duyệt', color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' },
  rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
  completed: { label: 'Hoàn tất', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
  cancelled: { label: 'Đã hủy', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
}

const EXPORT_SLIP_STATUS_CONFIG: Record<string, { label: string, color: string }> = {
  pending: { label: "Chờ xử lý", color: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
  received: { label: "Đang soạn hàng", color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  inspecting: { label: "Đang kiểm kê", color: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" },
  completed: { label: "Đã xuất kho", color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
  verified: { label: "Đã xác thực", color: "bg-teal-100 text-teal-700 hover:bg-teal-200" },
  cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-700 hover:bg-red-200" },
}

export default function ProductExportRequestsPage() {
  const queryClient = useQueryClient()
  const { isAdmin, isProductionManager, isKhoManager, loading: authLoading } = useAuth()
  const canOperateWarehouseSlip = isKhoManager
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  // Detail Dialog states
  const [selectedReq, setSelectedReq] = useState<ProductExportRequest | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  // Create Request Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newRequestItems, setNewRequestItems] = useState<{ productId: string, quantity: number }[]>([{ productId: '', quantity: 1 }])
  const [newRequestReason, setNewRequestReason] = useState("")
  const [newRequestNotes, setNewRequestNotes] = useState("")

  // Related Slip states
  const [isSlipDialogOpen, setIsSlipDialogOpen] = useState(false)
  const [currentSlip, setCurrentSlip] = useState<Slip | null>(null)
  const [isSlipLoading, setIsSlipLoading] = useState(false)

  // Fetch Products for selection
  const { data: productsData } = useQuery({
    queryKey: ['products-for-selection'],
    queryFn: () => productApi.getProducts({ limit: 100 }),
    enabled: isProductionManager
  })
  const products = productsData?.data?.products || []

  // Fetch Requests
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['product-export-requests', page, limit, searchQuery, activeTab],
    queryFn: () => productExportApi.getAllRequests({
      page,
      limit,
      status: activeTab === 'all' ? undefined : activeTab,
      requestCode: searchQuery
    }),
    enabled: !authLoading,
  })

  const createRequestMutation = useMutation({
    mutationFn: (data: any) => productExportApi.createRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-export-requests'] })
      toast.success("Đã tạo yêu cầu xuất sản phẩm thành công")
      setIsCreateDialogOpen(false)
      setNewRequestItems([{ productId: '', quantity: 1 }])
      setNewRequestReason("")
      setNewRequestNotes("")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Lỗi khi tạo yêu cầu")
    }
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: 'approved' | 'rejected' }) =>
      productExportApi.updateStatus(id, status),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-export-requests'] })
      toast.success(variables.status === 'approved' ? "Đã duyệt yêu cầu và tạo phiếu xuất kho" : "Đã từ chối yêu cầu")
      setIsDialogOpen(false)
      setRejectMode(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Lỗi khi cập nhật trạng thái")
    }
  })

  const updateSlipStatusMutation = useMutation({
    mutationFn: ({ id, status, items }: { id: string, status: string, items: any[] }) =>
      slipApi.updateSlipStatus(id, { status, items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-export-requests'] })
      queryClient.invalidateQueries({ queryKey: ['slips'] })
      toast.success("Đã cập nhật trạng thái phiếu xuất")
      if (currentSlip) handleViewSlip(currentSlip._id)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Lỗi khi cập nhật trạng thái phiếu")
    }
  })

  const handleViewSlip = async (slipId: string) => {
    setIsSlipLoading(true)
    try {
      const res = await slipApi.getSlipById(slipId)
      setCurrentSlip(res.data?.data || res.data)
      setIsSlipDialogOpen(true)
    } catch (error) {
      toast.error("Không thể tải thông tin phiếu xuất")
    } finally {
      setIsSlipLoading(false)
    }
  }

  const responseData = data?.data;
  const requests = responseData?.requests || [];
  const pagination = responseData?.pagination || {};
  const totalPages = (pagination as { pages?: number })?.pages || 1;

  const handleCreateRequest = () => {
    if (!newRequestReason.trim()) {
      toast.error("Vui lòng nhập lý do xuất hàng")
      return
    }
    const items = newRequestItems.filter(i => i.productId && i.quantity > 0)
    if (items.length === 0) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm")
      return
    }
    createRequestMutation.mutate({
      items: items.map(i => ({ product: i.productId, requestedQuantity: i.quantity })),
      reason: newRequestReason,
      notes: newRequestNotes
    })
  }

  const handleApprove = () => {
    if (!selectedReq) return
    updateStatusMutation.mutate({ id: selectedReq._id, status: 'approved' })
  }

  const handleReject = () => {
    if (!selectedReq) return
    updateStatusMutation.mutate({ id: selectedReq._id, status: 'rejected' })
  }

  return (
    <AppShell title="Yêu cầu xuất thành phẩm" subtitle="Quản lý danh sách các yêu cầu xuất hàng thành phẩm">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Card className="min-w-[150px]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Chờ duyệt</p>
                  <p className="text-lg font-bold">{requests.filter(r => r.status === 'pending').length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          {isProductionManager && (
            <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Tạo yêu cầu mới
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <CardHeader className="pb-0 border-b">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <TabsList>
                    <TabsTrigger value="all">Tất cả</TabsTrigger>
                    <TabsTrigger value="pending">Chờ duyệt</TabsTrigger>
                    <TabsTrigger value="approved">Đã duyệt</TabsTrigger>
                    <TabsTrigger value="completed">Hoàn tất</TabsTrigger>
                  </TabsList>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Tìm theo mã yêu cầu..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>

              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="pl-6 py-4">Mã yêu cầu</TableHead>
                    <TableHead>Người yêu cầu</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-center">Số mặt hàng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right pr-6">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground"><Loader2 className="size-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : isError ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center text-red-500">Lỗi: {(error as any)?.message}</TableCell></TableRow>
                  ) : requests.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Không tìm thấy yêu cầu nào</TableCell></TableRow>
                  ) : requests.map((req: ProductExportRequest) => (
                    <TableRow key={req._id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setSelectedReq(req); setIsDialogOpen(true); }}>
                      <TableCell className="pl-6 font-medium text-primary">{req.requestCode}</TableCell>
                      <TableCell>{req.createdBy?.fullName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(req.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </TableCell>
                      <TableCell className="text-center">{req.items?.length || 0}</TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_CONFIG[req.status]?.color} border-0`}>
                          {STATUS_CONFIG[req.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedReq(req); setIsDialogOpen(true); }}>
                          <Eye className="size-4 mr-1" /> Chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
                  <p className="text-sm text-muted-foreground">
                    Trang <span className="font-medium">{page}</span> / {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Trước</Button>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Sau</Button>
                  </div>
                </div>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setRejectMode(false); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Chi tiết yêu cầu {selectedReq?.requestCode}</DialogTitle>
          </DialogHeader>

          {selectedReq && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Người yêu cầu</p>
                  <p className="font-medium">{selectedReq.createdBy?.fullName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Trạng thái</p>
                  <Badge className={STATUS_CONFIG[selectedReq.status]?.color}>
                    {STATUS_CONFIG[selectedReq.status]?.label}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs uppercase font-semibold">Lý do xuất</p>
                  <p className="font-medium">{selectedReq.reason}</p>
                </div>
                {selectedReq.notes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs uppercase font-semibold">Ghi chú</p>
                    <p className="font-medium">{selectedReq.notes}</p>
                  </div>
                )}
              </div>

              {selectedReq.relatedSlip && (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50/50 border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <ClipboardList className="size-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phiếu xuất kho liên quan</p>
                      <p className="text-sm font-semibold text-blue-700">
                        {typeof selectedReq.relatedSlip === 'object' ? selectedReq.relatedSlip.slipNumber : 'Xem chi tiết'}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-200 text-blue-600 hover:bg-blue-100"
                    onClick={() => handleViewSlip(typeof selectedReq.relatedSlip === 'object' ? selectedReq.relatedSlip._id : selectedReq.relatedSlip)}
                    disabled={isSlipLoading}
                  >
                    {isSlipLoading ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4 mr-1" />}
                    Xem phiếu
                  </Button>
                </div>
              )}

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead className="text-right">Yêu cầu</TableHead>
                      <TableHead className="text-right">Thực xuất</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReq.items?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <p className="font-medium">{item.product?.name}</p>
                          <p className="text-xs text-muted-foreground">{item.product?.code}</p>
                        </TableCell>
                        <TableCell className="text-right font-bold">{item.requestedQuantity}</TableCell>
                        <TableCell className="text-right">{item.actualQuantity || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Đóng</Button>
                {selectedReq.status === 'pending' && isAdmin && (
                  <>
                    <Button variant="outline" className="text-red-600 border-red-200" onClick={handleReject}>Từ chối</Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove} disabled={updateStatusMutation.isPending}>
                      {updateStatusMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Phê duyệt
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Request Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tạo yêu cầu xuất thành phẩm mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Danh sách sản phẩm</Label>
              {newRequestItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Sản phẩm</Label>
                    <Select value={item.productId} onValueChange={(val) => {
                      const updated = [...newRequestItems];
                      updated[idx].productId = val;
                      setNewRequestItems(updated);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn sản phẩm..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p: any) => (
                          <SelectItem key={p._id} value={p._id}>
                            {p.name} ({p.code}) - Tồn kho: {p.currentStock}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Số lượng</Label>
                    <Input
                      type="number"
                      min="1"
                      value={isNaN(item.quantity) || item.quantity === 0 ? "" : item.quantity}
                      onChange={(e) => {
                        const updated = [...newRequestItems];
                        const val = parseInt(e.target.value);
                        updated[idx].quantity = isNaN(val) ? 0 : val;
                        setNewRequestItems(updated);
                      }}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => {
                    if (newRequestItems.length > 1) {
                      setNewRequestItems(newRequestItems.filter((_, i) => i !== idx));
                    }
                  }}><X className="size-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setNewRequestItems([...newRequestItems, { productId: '', quantity: 1 }])}>
                <Plus className="size-4 mr-1" /> Thêm sản phẩm
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Lý do xuất hàng</Label>
              <Input placeholder="Ví dụ: Xuất hàng cho khách hàng ABC..." value={newRequestReason} onChange={(e) => setNewRequestReason(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Ghi chú (nếu có)</Label>
              <Textarea placeholder="Thêm thông tin bổ sung..." value={newRequestNotes} onChange={(e) => setNewRequestNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleCreateRequest} disabled={createRequestMutation.isPending}>
              {createRequestMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Gửi yêu cầu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Slip Detail Dialog */}
      {currentSlip && (
        <SlipDetailDialog
          open={isSlipDialogOpen}
          onOpenChange={setIsSlipDialogOpen}
          slip={currentSlip}
          type="export"
          statusConfig={EXPORT_SLIP_STATUS_CONFIG}
          onStatusUpdate={canOperateWarehouseSlip ? (status, items) => updateSlipStatusMutation.mutate({ id: currentSlip._id, status, items }) : undefined}
          isUpdating={updateSlipStatusMutation.isPending}
          readOnly={!canOperateWarehouseSlip}
        />
      )}
    </AppShell>
  )
}
