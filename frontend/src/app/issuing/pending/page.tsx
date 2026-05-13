'use client'

import { useState } from 'react'
import { Search, Check, X, Eye, Clock, PenTool, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { requisitionApi } from '@/api/requisition.api'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useAuth } from '@/features/auth/hooks/use-auth'

// ── Main ──────────────────────────────────────────────────────
export default function IssuingPendingPage() {
  const queryClient = useQueryClient()
  const { isKhoManager } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)

  // detail dialog
  const [selectedReq, setSelectedReq] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionDone, setActionDone] = useState<'approved' | 'rejected' | null>(null)

  // approve state
  const [signatureConfirmed, setSignatureConfirmed] = useState(false)

  // reject state
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState(false)
  const [rejectMode, setRejectMode] = useState(false) // toggle reject form

  const { data, isLoading } = useQuery({
    queryKey: ['requisitions', 'pending', { page, limit, search: searchQuery }],
    queryFn: () => requisitionApi.getRequisitions({ status: 'pending', page, limit, search: searchQuery })
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string, status: string, notes?: string }) =>
      requisitionApi.updateStatus(id, { status, notes }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
      setActionDone(variables.status === 'accepted' ? 'approved' : 'rejected')
      toast.success(variables.status === 'accepted' ? "Đã tiếp nhận yêu cầu và tạo phiếu xuất" : "Đã từ chối yêu cầu")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Lỗi khi cập nhật trạng thái")
    }
  })

  const responseData = data?.data?.data || data?.data || data;
  const requisitions: any[] = responseData?.requisitions || [];
  const pagination = responseData?.pagination || {};
  const totalPages = pagination?.totalPages || pagination?.pages || 1;

  // ── helpers ───────────────────────────────────────────────
  const openDetail = (req: any) => {
    setSelectedReq(req)
    setActionDone(null)
    setSignatureConfirmed(false)
    setRejectReason('')
    setRejectError(false)
    setRejectMode(false)
    setDialogOpen(true)
  }

  const handleApprove = () => {
    if (!selectedReq) return
    updateStatusMutation.mutate({
      id: selectedReq._id,
      status: 'accepted'
    })
  }

  const handleReject = () => {
    if (!rejectReason.trim()) { setRejectError(true); return }
    if (!selectedReq) return
    updateStatusMutation.mutate({
      id: selectedReq._id,
      status: 'rejected',
      notes: rejectReason
    })
  }

  const pendingCount = requisitions.filter((r) => r.status === 'pending').length

  // ── render ────────────────────────────────────────────────
  return (
    <AppShell
      title="Phiếu xuất chờ duyệt"
      subtitle="Duyệt các yêu cầu vật liệu trước khi thực hiện xuất kho"
    >
      <div className="flex flex-col gap-6 p-6">

        {/* Header badge */}
        <div className="flex items-center justify-end">
          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200">
            <Clock className="size-3" />
            {pagination.total || pendingCount} yêu cầu chờ tiếp nhận
          </Badge>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo mã yêu cầu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="pl-6">Mã Requisition</TableHead>
                  <TableHead>Lệnh sản xuất</TableHead>
                  <TableHead className="text-right">Số dòng</TableHead>
                  <TableHead className="text-right">Tổng SL yêu cầu</TableHead>
                  <TableHead>Độ ưu tiên</TableHead>
                  <TableHead>Người yêu cầu</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right pr-6">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="h-32 text-center text-muted-foreground"><Loader2 className="size-6 animate-spin mx-auto mb-2" /> Đang tải dữ liệu...</TableCell></TableRow>
                ) : requisitions.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="h-32 text-center text-muted-foreground">Không có yêu cầu nào đang chờ</TableCell></TableRow>
                ) : requisitions.map((req) => (
                  <TableRow key={req._id}>
                    <TableCell className="pl-6 font-medium text-primary">{req.requisitionCode}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{req.productionOrder?.orderCode || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{req.items?.length || 0}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {req.items?.reduce((sum: number, item: any) => sum + (item.requestedQuantity || 0), 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={req.productionOrder?.priority === 'high' || req.productionOrder?.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
                        {req.productionOrder?.priority === 'high' ? 'Cao' : req.productionOrder?.priority === 'urgent' ? 'Khẩn cấp' : 'Bình thường'}
                      </Badge>
                    </TableCell>
                    <TableCell>{req.createdBy?.fullName || req.createdBy?.username || 'N/A'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(req.createdAt), 'HH:mm dd/MM/yyyy', { locale: vi })}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-amber-100 text-amber-700">Chờ tiếp nhận</Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost" size="icon" className="size-8"
                          title="Xem chi tiết"
                          onClick={() => openDetail(req)}
                        >
                          <Eye className="size-4" />
                        </Button>

                        {isKhoManager && (
                          <>
                            <Button
                              variant="ghost" size="icon"
                              className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Xem & tiếp nhận"
                              onClick={() => openDetail(req)}
                            >
                              <Check className="size-4" />
                            </Button>

                            <Button
                              variant="ghost" size="icon"
                              className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Xem & từ chối"
                              onClick={() => {
                                openDetail(req)
                                setTimeout(() => setRejectMode(true), 50)
                              }}
                            >
                              <X className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
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
          </CardContent>
        </Card>
      </div>

      {/* ── Detail + Approve/Reject Dialog ── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) { setRejectMode(false); setActionDone(null) }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết yêu cầu {selectedReq?.requisitionCode}</DialogTitle>
            <DialogDescription>
              Xem thông tin và thực hiện tiếp nhận hoặc từ chối yêu cầu vật liệu
            </DialogDescription>
          </DialogHeader>

          {selectedReq && (
            <>
              {/* Banner kết quả */}
              {actionDone === 'approved' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                  <CheckCircle2 className="size-4 shrink-0" />
                  Yêu cầu đã được tiếp nhận và tạo phiếu xuất kho thành công
                </div>
              )}
              {actionDone === 'rejected' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <X className="size-4 shrink-0" />
                  Yêu cầu đã bị từ chối
                </div>
              )}

              {/* Thông tin chi tiết */}
              <div className="space-y-3 py-2">
                <div className="rounded-lg bg-muted/50 p-4 space-y-2.5">
                  {[
                    { label: 'Lệnh sản xuất', value: selectedReq.productionOrder?.orderCode || 'N/A' },
                    { label: 'Người yêu cầu', value: selectedReq.createdBy?.fullName || selectedReq.createdBy?.username || 'N/A' },
                    { label: 'Ngày tạo', value: format(new Date(selectedReq.createdAt), 'HH:mm dd/MM/yyyy', { locale: vi }) },
                    { label: 'Số mặt hàng', value: `${selectedReq.items?.length || 0} mục` },
                    {
                      label: 'Tổng số lượng', value: selectedReq.items?.reduce((sum: number, item: any) => sum + (item.requestedQuantity || 0), 0).toLocaleString()
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}:</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Độ ưu tiên:</span>
                    <Badge className={selectedReq.productionOrder?.priority === 'high' || selectedReq.productionOrder?.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
                      {selectedReq.productionOrder?.priority === 'high' ? 'Cao' : selectedReq.productionOrder?.priority === 'urgent' ? 'Khẩn cấp' : 'Bình thường'}
                    </Badge>
                  </div>
                </div>

                {/* Danh sách vật liệu */}
                <div className="border rounded-md divide-y max-h-[200px] overflow-y-auto">
                  {selectedReq.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-2 text-xs">
                      <div className="flex flex-col">
                        <span className="font-medium">{item.material?.name}</span>
                        <span className="text-muted-foreground text-[10px]">{item.material?.code}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{item.requestedQuantity}</span>
                        <span className="ml-1 text-muted-foreground">{item.material?.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Approve form */}
                {selectedReq.status === 'pending' && !rejectMode && !actionDone && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <Checkbox
                      id="signature"
                      checked={signatureConfirmed}
                      onCheckedChange={(c) => setSignatureConfirmed(!!c)}
                    />
                    <label htmlFor="signature" className="text-sm cursor-pointer flex items-center gap-2">
                      <PenTool className="size-4 text-primary" />
                      Ký xác nhận tiếp nhận yêu cầu
                    </label>
                  </div>
                )}

                {/* Reject form */}
                {selectedReq.status === 'pending' && rejectMode && !actionDone && (
                  <div className="space-y-2">
                    <Label>
                      Lý do từ chối <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      placeholder="Nhập lý do từ chối..."
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => { setRejectReason(e.target.value); setRejectError(false) }}
                      className={rejectError ? 'border-destructive' : ''}
                    />
                    {rejectError && (
                      <p className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="size-3" /> Vui lòng nhập lý do từ chối
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              {selectedReq.status === 'pending' && !actionDone && (
                <DialogFooter className="gap-2 flex-wrap">
                  {!rejectMode ? (
                    <>
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setRejectMode(true)}
                      >
                        <X className="size-4 mr-2" /> Từ chối
                      </Button>
                      <Button
                        disabled={!signatureConfirmed || updateStatusMutation.isPending}
                        onClick={handleApprove}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {updateStatusMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Check className="size-4 mr-2" />}
                        Tiếp nhận & Tạo phiếu xuất
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setRejectMode(false)}>
                        Quay lại
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={updateStatusMutation.isPending}
                      >
                        {updateStatusMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <X className="size-4 mr-2" />}
                        Xác nhận từ chối
                      </Button>
                    </>
                  )}
                </DialogFooter>
              )}

              {/* Footer sau khi đã xử lý */}
              {actionDone && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Đóng</Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
