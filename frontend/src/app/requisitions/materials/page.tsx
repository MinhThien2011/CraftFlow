"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ClipboardList, Eye, Check, X, Loader2, Clock, ExternalLink } from "lucide-react"
import { requisitionApi } from "@/api/requisition.api"
import { slipApi, Slip } from "@/api/slip.api"
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

const REQUISITION_STATUS_CONFIG: Record<string, { label: string, color: string }> = {
  pending: { label: 'Chờ tiếp nhận', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
  accepted: { label: 'Đã tiếp nhận', color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' },
  preparing: { label: 'Đang soạn hàng', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  prepared: { label: 'Sẵn sàng giao', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
  completed: { label: 'Hoàn tất', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
  rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
  cancelled: { label: 'Đã hủy', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
}

const EXPORT_STATUS_CONFIG: Record<string, { label: string, color: string }> = {
  pending: { label: "Chờ xử lý", color: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
  received: { label: "Đang soạn hàng", color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  inspecting: { label: "Đang kiểm kê", color: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" },
  completed: { label: "Đã xuất kho", color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
  verified: { label: "Đã xác thực", color: "bg-teal-100 text-teal-700 hover:bg-teal-200" },
  cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-700 hover:bg-red-200" },
}

export default function MaterialRequisitionsPage() {
  const queryClient = useQueryClient()
  const { isAdmin, isKhoManager, loading: authLoading } = useAuth()
  const canOperateWarehouseSlip = isKhoManager
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  // Detail Dialog states
  const [selectedReq, setSelectedReq] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [signatureConfirmed, setSignatureConfirmed] = useState(false)

  // Related Slip states
  const [isSlipDialogOpen, setIsSlipDialogOpen] = useState(false)
  const [currentSlip, setCurrentSlip] = useState<Slip | null>(null)
  const [isSlipLoading, setIsSlipLoading] = useState(false)

  // Fetch data
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['requisitions', 'materials', page, limit, searchQuery, activeTab],
    queryFn: async () => {
      try {
        const response = await requisitionApi.getRequisitions({
          page,
          limit,
          search: searchQuery,
          status: activeTab === 'all' ? undefined : activeTab,
          type: 'issue,supplementary'
        });
        // Bóc tách dữ liệu từ axios response nếu interceptor chưa làm
        return (response as any).data || response;
      } catch (err) {
        throw err;
      }
    },
    staleTime: 5000,
    refetchOnMount: true,
    enabled: !authLoading,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string, status: string, notes?: string }) =>
      requisitionApi.updateStatus(id, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
      toast.success("Cập nhật trạng thái thành công")
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
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
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

  // Normalize data structure
  const responseData = useMemo(() => {
    if (!data) return null;
    // Nếu data là object chứa requisitions trực tiếp
    if (data.requisitions) return data;
    // Nếu data là object chứa data chứa requisitions
    if (data.data?.requisitions) return data.data;
    return data;
  }, [data]);

  const requisitions: any[] = responseData?.requisitions || [];
  const pagination = responseData?.pagination || {};
  const totalPages = pagination?.totalPages || pagination?.pages || 1;

  const handleAction = (status: string) => {
    if (status === 'rejected' && !rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối")
      return
    }
    updateStatusMutation.mutate({
      id: selectedReq._id,
      status,
      notes: status === 'rejected' ? rejectReason : undefined
    })
  }

  return (
    <AppShell title="Yêu cầu vật liệu" subtitle="Quản lý danh sách các yêu cầu vật tư từ sản xuất">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chờ tiếp nhận</p>
                <p className="text-xl font-bold">{requisitions.filter(r => r.status === 'pending').length}</p>
              </div>
            </CardContent>
          </Card>
          {/* Add more cards for summary if needed */}
        </div>

        <Card>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <CardHeader className="pb-0 border-b">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <TabsList>
                    <TabsTrigger value="all">Tất cả</TabsTrigger>
                    <TabsTrigger value="pending">Chờ tiếp nhận</TabsTrigger>
                    <TabsTrigger value="accepted">Đã tiếp nhận</TabsTrigger>
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
                    <TableHead>Lệnh sản xuất</TableHead>
                    <TableHead>Người yêu cầu</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-center">Số mặt hàng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right pr-6">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground"><Loader2 className="size-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : isError ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-red-500">
                        <div className="flex flex-col items-center gap-2">
                          <p>Lỗi tải dữ liệu: {(error as any)?.message || 'Vui lòng thử lại'}</p>
                          <Button variant="outline" size="sm" onClick={() => refetch()}>Thử lại</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : requisitions.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Không tìm thấy yêu cầu nào</TableCell></TableRow>
                  ) : requisitions.map((req) => (
                    <TableRow key={req._id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setSelectedReq(req); setIsDialogOpen(true); }}>
                      <TableCell className="pl-6 font-medium text-primary">{req.requisitionCode}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{req.productionOrder?.orderCode || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>{req.createdBy?.fullName || req.createdBy?.username}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(req.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </TableCell>
                      <TableCell className="text-center">{req.items?.length || 0}</TableCell>
                      <TableCell>
                        <Badge className={`${REQUISITION_STATUS_CONFIG[req.status]?.color} border-0`}>
                          {REQUISITION_STATUS_CONFIG[req.status]?.label}
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

              {pagination && totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
                  <p className="text-sm text-muted-foreground">
                    Trang <span className="font-medium">{pagination.page}</span> / {totalPages} • Tổng <span className="font-medium">{pagination.total}</span> mục
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
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setRejectMode(false); setSignatureConfirmed(false); } }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Chi tiết yêu cầu {selectedReq?.requisitionCode}</DialogTitle>
            <DialogDescription>Thông tin chi tiết và xử lý yêu cầu vật tư</DialogDescription>
          </DialogHeader>

          {selectedReq && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                <div>
                  <p className="text-muted-foreground">Lệnh sản xuất:</p>
                  <p className="font-medium">{selectedReq.productionOrder?.orderCode || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trạng thái:</p>
                  <Badge className={REQUISITION_STATUS_CONFIG[selectedReq.status]?.color}>
                    {REQUISITION_STATUS_CONFIG[selectedReq.status]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Người tạo:</p>
                  <p className="font-medium">{selectedReq.createdBy?.fullName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ngày tạo:</p>
                  <p className="font-medium">{format(new Date(selectedReq.createdAt), 'HH:mm dd/MM/yyyy')}</p>
                </div>
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
                        {typeof selectedReq.relatedSlip === 'object' ? selectedReq.relatedSlip.slipNumber : 'Xem chi tiết phiếu'}
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

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vật liệu</TableHead>
                      <TableHead className="text-right">Yêu cầu</TableHead>
                      <TableHead>Đơn vị</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReq.items?.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <p className="font-medium">{item.material?.name}</p>
                          <p className="text-xs text-muted-foreground">{item.material?.code}</p>
                        </TableCell>
                        <TableCell className="text-right font-bold">{item.requestedQuantity}</TableCell>
                        <TableCell>{item.material?.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedReq.status === 'pending' && isKhoManager && (
                <div className="space-y-4 pt-4">
                  {!rejectMode ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
                      <Checkbox id="confirm" checked={signatureConfirmed} onCheckedChange={(c) => setSignatureConfirmed(!!c)} />
                      <Label htmlFor="confirm" className="text-sm cursor-pointer">Đồng ý tiếp nhận yêu cầu và tạo phiếu xuất kho</Label>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Lý do từ chối</Label>
                      <Textarea placeholder="Nhập lý do..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Đóng</Button>
                {selectedReq.status === 'pending' && isKhoManager && (
                  <>
                    {!rejectMode ? (
                      <>
                        <Button variant="outline" className="text-red-600 border-red-200" onClick={() => setRejectMode(true)}>Từ chối</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={!signatureConfirmed || updateStatusMutation.isPending} onClick={() => handleAction('accepted')}>
                          Tiếp nhận & Tạo phiếu
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" onClick={() => setRejectMode(false)}>Quay lại</Button>
                        <Button variant="destructive" disabled={updateStatusMutation.isPending} onClick={() => handleAction('rejected')}>Xác nhận từ chối</Button>
                      </>
                    )}
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {currentSlip && (
        <SlipDetailDialog
          open={isSlipDialogOpen}
          onOpenChange={setIsSlipDialogOpen}
          slip={currentSlip}
          type="export"
          statusConfig={EXPORT_STATUS_CONFIG}
          onStatusUpdate={canOperateWarehouseSlip ? (status, items) => updateSlipStatusMutation.mutate({ id: currentSlip._id, status, items }) : undefined}
          isUpdating={updateSlipStatusMutation.isPending}
          readOnly={!canOperateWarehouseSlip}
        />
      )}
    </AppShell>
  )
}
