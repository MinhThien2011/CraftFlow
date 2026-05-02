'use client'

import { useState } from 'react'
import { Search, Check, X, Eye, Clock, PenTool, CheckCircle2, AlertCircle } from 'lucide-react'
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

// ── Types ─────────────────────────────────────────────────────
type IssueStatus = 'pending' | 'approved' | 'rejected'

interface PendingIssue {
  id: string
  requisitionNo: string
  department: string
  totalItems: number
  totalQuantity: number
  requestedBy: string
  requestedAt: string
  priority: 'high' | 'normal'
  productionOrder: string
  status: IssueStatus
  rejectReason?: string
}

// ── Mock data ─────────────────────────────────────────────────
const INITIAL_ISSUES: PendingIssue[] = [
  {
    id: 'PX-2024-00089',
    requisitionNo: 'REQ-2024-0045',
    department: 'Xưởng sản xuất A',
    totalItems: 5,
    totalQuantity: 120,
    requestedBy: 'Nguyễn Văn A',
    requestedAt: '2024-01-15 10:30',
    priority: 'high',
    productionOrder: 'LSX-2024-001',
    status: 'pending'
  },
  {
    id: 'PX-2024-00088',
    requisitionNo: 'REQ-2024-0044',
    department: 'Xưởng sản xuất B',
    totalItems: 3,
    totalQuantity: 80,
    requestedBy: 'Trần Văn B',
    requestedAt: '2024-01-15 09:15',
    priority: 'normal',
    productionOrder: 'LSX-2024-002',
    status: 'pending'
  },
  {
    id: 'PX-2024-00087',
    requisitionNo: 'REQ-2024-0043',
    department: 'Xưởng đóng gói',
    totalItems: 8,
    totalQuantity: 500,
    requestedBy: 'Lê Thị C',
    requestedAt: '2024-01-14 16:45',
    priority: 'normal',
    productionOrder: 'LSX-2024-003',
    status: 'pending'
  }
]

// ── Main ──────────────────────────────────────────────────────
export default function IssuingPendingPage() {
  const [issues, setIssues]         = useState<PendingIssue[]>(INITIAL_ISSUES)
  const [searchQuery, setSearchQuery] = useState('')

  // detail dialog
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionDone, setActionDone] = useState<'approved' | 'rejected' | null>(null)

  // approve state
  const [signatureConfirmed, setSignatureConfirmed] = useState(false)

  // reject state
  const [rejectReason, setRejectReason]   = useState('')
  const [rejectError, setRejectError]     = useState(false)
  const [rejectMode, setRejectMode]       = useState(false) // toggle reject form

  // luôn lấy bản mới nhất
  const currentIssue = issues.find((i) => i.id === selectedId) ?? null

  // ── helpers ───────────────────────────────────────────────
  const openDetail = (id: string) => {
    setSelectedId(id)
    setActionDone(null)
    setSignatureConfirmed(false)
    setRejectReason('')
    setRejectError(false)
    setRejectMode(false)
    setDialogOpen(true)
  }

  const handleApprove = () => {
    if (!selectedId) return
    setIssues((prev) =>
      prev.map((i) => i.id === selectedId ? { ...i, status: 'approved' } : i)
    )
    setActionDone('approved')
  }

  const handleReject = () => {
    if (!rejectReason.trim()) { setRejectError(true); return }
    if (!selectedId) return
    setIssues((prev) =>
      prev.map((i) => i.id === selectedId ? { ...i, status: 'rejected', rejectReason } : i)
    )
    setActionDone('rejected')
  }

  const filteredIssues = issues.filter(
    (issue) =>
      issue.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.requisitionNo.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingCount = issues.filter((i) => i.status === 'pending').length

  // ── render ────────────────────────────────────────────────
  return (
    <AppShell
      title="Phiếu xuất chờ duyệt"
      subtitle="Duyệt các phiếu xuất kho trước khi thực hiện xuất"
    >
      <div className="flex flex-col gap-6 p-6">

        {/* Header badge */}
        <div className="flex items-center justify-end">
          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200">
            <Clock className="size-3" />
            {pendingCount} phiếu chờ duyệt
          </Badge>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo số phiếu, bộ phận, requisition..."
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
                  <TableHead>Số phiếu xuất</TableHead>
                  <TableHead>Số Requisition</TableHead>
                  <TableHead>Lệnh sản xuất</TableHead>
                  <TableHead>Bộ phận</TableHead>
                  <TableHead className="text-right">Số dòng</TableHead>
                  <TableHead className="text-right">Tổng SL</TableHead>
                  <TableHead>Độ ưu tiên</TableHead>
                  <TableHead>Người yêu cầu</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium">{issue.id}</TableCell>
                    <TableCell>{issue.requisitionNo}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{issue.productionOrder}</Badge>
                    </TableCell>
                    <TableCell>{issue.department}</TableCell>
                    <TableCell className="text-right">{issue.totalItems}</TableCell>
                    <TableCell className="text-right">{issue.totalQuantity}</TableCell>
                    <TableCell>
                      <Badge className={issue.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
                        {issue.priority === 'high' ? 'Cao' : 'Bình thường'}
                      </Badge>
                    </TableCell>
                    <TableCell>{issue.requestedBy}</TableCell>
                    <TableCell>{issue.requestedAt}</TableCell>
                    <TableCell>
                      {issue.status === 'approved' && (
                        <Badge className="bg-emerald-100 text-emerald-700">Đã duyệt</Badge>
                      )}
                      {issue.status === 'rejected' && (
                        <Badge className="bg-red-100 text-red-700">Từ chối</Badge>
                      )}
                      {issue.status === 'pending' && (
                        <Badge className="bg-amber-100 text-amber-700">Chờ duyệt</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {/* Nút Xem — mọi trạng thái */}
                        <Button
                          variant="ghost" size="icon" className="size-8"
                          title="Xem chi tiết"
                          onClick={() => openDetail(issue.id)}
                        >
                          <Eye className="size-4" />
                        </Button>

                        {/* Nút Duyệt — chỉ pending, mở cùng modal */}
                        {issue.status === 'pending' && (
                          <Button
                            variant="ghost" size="icon"
                            className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Xem & duyệt"
                            onClick={() => openDetail(issue.id)}
                          >
                            <Check className="size-4" />
                          </Button>
                        )}

                        {/* Nút Từ chối — chỉ pending, mở cùng modal */}
                        {issue.status === 'pending' && (
                          <Button
                            variant="ghost" size="icon"
                            className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Xem & từ chối"
                            onClick={() => {
                              openDetail(issue.id)
                              // mở sẵn reject form
                              setTimeout(() => setRejectMode(true), 50)
                            }}
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
            <DialogTitle>Chi tiết phiếu xuất {currentIssue?.id}</DialogTitle>
            <DialogDescription>
              Xem thông tin và thực hiện duyệt hoặc từ chối phiếu xuất
            </DialogDescription>
          </DialogHeader>

          {currentIssue && (
            <>
              {/* Banner kết quả */}
              {actionDone === 'approved' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                  <CheckCircle2 className="size-4 shrink-0" />
                  Phiếu đã được duyệt và tạo Pick List thành công
                </div>
              )}
              {actionDone === 'rejected' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <X className="size-4 shrink-0" />
                  Phiếu đã bị từ chối
                </div>
              )}

              {/* Thông tin chi tiết */}
              <div className="space-y-3 py-2">
                <div className="rounded-lg bg-muted/50 p-4 space-y-2.5">
                  {[
                    { label: 'Số Requisition', value: currentIssue.requisitionNo },
                    { label: 'Lệnh sản xuất',  value: currentIssue.productionOrder },
                    { label: 'Bộ phận',        value: currentIssue.department },
                    { label: 'Người yêu cầu',  value: currentIssue.requestedBy },
                    { label: 'Ngày tạo',       value: currentIssue.requestedAt },
                    { label: 'Tổng số dòng',   value: `${currentIssue.totalItems} dòng` },
                    { label: 'Tổng số lượng',  value: currentIssue.totalQuantity },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}:</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Độ ưu tiên:</span>
                    <Badge className={currentIssue.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
                      {currentIssue.priority === 'high' ? 'Cao' : 'Bình thường'}
                    </Badge>
                  </div>
                </div>

                {/* Lý do từ chối (nếu đã bị từ chối trước đó) */}
                {currentIssue.status === 'rejected' && currentIssue.rejectReason && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm">
                    <p className="text-red-700 font-medium mb-1">Lý do từ chối:</p>
                    <p className="text-red-600">{currentIssue.rejectReason}</p>
                  </div>
                )}

                {/* Approve form */}
                {currentIssue.status === 'pending' && !rejectMode && !actionDone && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <Checkbox
                      id="signature"
                      checked={signatureConfirmed}
                      onCheckedChange={(c) => setSignatureConfirmed(!!c)}
                    />
                    <label htmlFor="signature" className="text-sm cursor-pointer flex items-center gap-2">
                      <PenTool className="size-4 text-primary" />
                      Ký xác nhận bằng chữ ký điện tử
                    </label>
                  </div>
                )}

                {/* Reject form */}
                {currentIssue.status === 'pending' && rejectMode && !actionDone && (
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
              {currentIssue.status === 'pending' && !actionDone && (
                <DialogFooter className="gap-2 flex-wrap">
                  {!rejectMode ? (
                    <>
                      {/* Switch sang reject mode */}
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setRejectMode(true)}
                      >
                        <X className="size-4 mr-2" /> Từ chối
                      </Button>
                      {/* Duyệt */}
                      <Button
                        disabled={!signatureConfirmed}
                        onClick={handleApprove}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Check className="size-4 mr-2" /> Duyệt và tạo Pick List
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setRejectMode(false)}>
                        Quay lại
                      </Button>
                      <Button variant="destructive" onClick={handleReject}>
                        <X className="size-4 mr-2" /> Xác nhận từ chối
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