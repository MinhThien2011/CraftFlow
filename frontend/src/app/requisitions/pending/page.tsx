'use client'

import { useState, useMemo } from 'react'
import { AppShell } from '@/components/app-shell'
import {
  ClipboardList, Search, Eye, Check, X, Clock, User, Package,
  AlertTriangle, ChevronLeft, ChevronRight, Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { pendingRequisitions } from '@/lib/warehouse-mock-data'
import { format, formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

// ─── Types ───────────────────────────────────────────────────────────────────
type Priority = 'high' | 'normal' | 'low'
type Status   = 'pending' | 'preparing' | 'approved' | 'rejected'
type Req      = typeof pendingRequisitions[0]

// ─── Constants ────────────────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<Priority, string> = {
  high:   'bg-red-100 text-red-700 border-red-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  low:    'bg-gray-100 text-gray-600 border-gray-200',
}
const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'Cao', normal: 'Bình thường', low: 'Thấp',
}
const STATUS_LABELS: Record<Status, string> = {
  pending:  'Chờ duyệt',
  preparing:'Đang chuẩn bị',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
}

const PAGE_SIZE = 5

// ─── Elapsed-time helper ──────────────────────────────────────────────────────
function ElapsedTime({ date }: { date: Date }) {
  const distance = formatDistanceToNow(date, { addSuffix: false, locale: vi })
  const hours = (Date.now() - date.getTime()) / 3_600_000
  const color = hours > 8 ? 'text-red-500' : hours > 4 ? 'text-amber-500' : 'text-muted-foreground'
  return (
    <div className="space-y-0.5">
      <p className="text-sm text-muted-foreground">{format(date, 'HH:mm dd/MM/yyyy', { locale: vi })}</p>
      <p className={`text-xs font-medium ${color}`}>Đã chờ {distance}</p>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={7}>
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <ClipboardList className="mb-3 size-10 opacity-30" />
          <p className="text-sm">{message}</p>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void
}) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t pt-4">
      <p className="text-sm text-muted-foreground">
        Hiển thị {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} / {total} yêu cầu
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="size-8" disabled={page === 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <Button
            key={p} variant={p === page ? 'default' : 'outline'}
            size="icon" className="size-8"
            onClick={() => onChange(p)}
          >{p}</Button>
        ))}
        <Button variant="outline" size="icon" className="size-8" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── Reject Dialog (standalone) ───────────────────────────────────────────────
function RejectDialog({ req, onConfirm }: { req: Req; onConfirm: (id: string, reason: string) => void }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')

  function handleConfirm() {
    if (!reason.trim()) return
    onConfirm(req.id, reason)
    setOpen(false)
    setReason('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-red-600 hover:bg-red-50">
          <X className="mr-2 size-4" /> Từ chối
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Từ chối yêu cầu {req.code}</DialogTitle>
          <DialogDescription>Vui lòng nhập lý do từ chối để thông báo cho nhân viên.</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Textarea
            placeholder="Lý do từ chối..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          {!reason.trim() && reason.length > 0 && (
            <p className="mt-1 text-xs text-red-500">Vui lòng nhập lý do từ chối</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
          <Button variant="destructive" disabled={!reason.trim()} onClick={handleConfirm}>
            Xác nhận từ chối
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Approve Confirm Dialog ───────────────────────────────────────────────────
function ApproveDialog({ req, onConfirm }: { req: Req; onConfirm: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Check className="mr-2 size-4" /> Duyệt yêu cầu
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận duyệt yêu cầu</DialogTitle>
          <DialogDescription>
            Bạn có chắc chắn muốn duyệt yêu cầu <strong>{req.code}</strong> của <strong>{req.staffName}</strong>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { onConfirm(req.id); setOpen(false) }}>
            <Check className="mr-2 size-4" /> Xác nhận duyệt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Detail Dialog ────────────────────────────────────────────────────────────
function DetailDialog({ req, onApprove, onReject }: {
  req: Req
  onApprove: (id: string) => void
  onReject: (id: string, reason: string) => void
}) {
  const [open, setOpen] = useState(false)

  function handleApprove(id: string) { onApprove(id); setOpen(false) }
  function handleReject(id: string, reason: string) { onReject(id, reason); setOpen(false) }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <Eye className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Chi tiết yêu cầu {req.code}</DialogTitle>
          <DialogDescription>Xem và xử lý yêu cầu vật liệu</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Nhân viên</Label>
              <p className="font-medium">{req.staffName}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Bộ phận</Label>
              <p className="font-medium">{req.department}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Ưu tiên</Label>
              <Badge className={PRIORITY_COLORS[req.priority as Priority]}>
                {PRIORITY_LABELS[req.priority as Priority]}
              </Badge>
            </div>
            <div>
              <Label className="text-muted-foreground">Thời gian tạo</Label>
              <ElapsedTime date={req.createdAt} />
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Vật liệu yêu cầu</Label>
            <div className="mt-2 rounded-lg border divide-y">
              {req.materials.map((m, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm">{m.name}</span>
                  <span className="text-sm font-medium">{m.quantity} {m.unit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {req.status === 'pending' && (
          <DialogFooter className="gap-2">
            <RejectDialog req={req} onConfirm={handleReject} />
            <ApproveDialog req={req} onConfirm={handleApprove} />
          </DialogFooter>
        )}
        {req.status === 'rejected' && req.rejectReason && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            <strong>Lý do từ chối:</strong> {req.rejectReason}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Requisitions Table ───────────────────────────────────────────────────────
function RequisitionsTable({ items, onApprove, onReject, showActions }: {
  items: Req[]
  onApprove: (id: string) => void
  onReject: (id: string, reason: string) => void
  showActions: boolean
}) {
  const [page, setPage] = useState(1)
  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã yêu cầu</TableHead>
              <TableHead>Nhân viên</TableHead>
              <TableHead>Bộ phận</TableHead>
              <TableHead>Vật liệu yêu cầu</TableHead>
              <TableHead>Ưu tiên</TableHead>
              <TableHead>Thời gian chờ</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <EmptyState message="Không có yêu cầu nào" />
            ) : paginated.map((req) => (
              <TableRow key={req.id}>
                <TableCell className="font-medium">{req.code}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="size-4 text-primary" />
                    </div>
                    <span>{req.staffName}</span>
                  </div>
                </TableCell>
                <TableCell>{req.department}</TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    {req.materials.map((m, i) => (
                      <p key={i} className="text-sm">• {m.name} × {m.quantity} {m.unit}</p>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={PRIORITY_COLORS[req.priority as Priority]}>
                    {PRIORITY_LABELS[req.priority as Priority]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ElapsedTime date={req.createdAt} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <DetailDialog req={req} onApprove={onApprove} onReject={onReject} />
                    {showActions && (
                      <>
                        <ApproveInlineBtn req={req} onApprove={onApprove} />
                        <RejectInlineBtn req={req} onReject={onReject} />
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} total={items.length} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  )
}

// Quick approve/reject inline buttons with confirmation
function ApproveInlineBtn({ req, onApprove }: { req: Req; onApprove: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
          <Check className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Duyệt yêu cầu?</DialogTitle>
          <DialogDescription>Xác nhận duyệt <strong>{req.code}</strong>?</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { onApprove(req.id); setOpen(false) }}>
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RejectInlineBtn({ req, onReject }: { req: Req; onReject: (id: string, reason: string) => void }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50">
          <X className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Từ chối yêu cầu {req.code}?</DialogTitle>
        </DialogHeader>
        <Textarea placeholder="Lý do từ chối..." value={reason} onChange={e => setReason(e.target.value)} rows={3} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
          <Button variant="destructive" disabled={!reason.trim()} onClick={() => { onReject(req.id, reason); setOpen(false); setReason('') }}>
            Từ chối
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PendingRequisitionsPage() {
  const { toast } = useToast()

  // Local state mutable copy
  const [reqs, setReqs] = useState<(Req & { rejectReason?: string })[]>(pendingRequisitions)
  const [searchTerm, setSearchTerm]       = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all')
  const [activeTab, setActiveTab]         = useState<Status>('pending')

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleApprove(id: string) {
    setReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r))
    toast({ title: '✅ Đã duyệt yêu cầu', description: `Yêu cầu đã được duyệt thành công.` })
  }

  function handleReject(id: string, reason: string) {
    setReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected', rejectReason: reason } : r))
    toast({ title: '❌ Đã từ chối yêu cầu', description: reason, variant: 'destructive' })
  }

  // ── Computed ─────────────────────────────────────────────────────────────────
  const byStatus = useMemo(() =>
    (status: Status) => reqs.filter(r => r.status === status), [reqs])

  const filtered = useMemo(() => {
    return byStatus(activeTab).filter(r => {
      const matchSearch =
        r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.staffName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchPriority = priorityFilter === 'all' || r.priority === priorityFilter
      return matchSearch && matchPriority
    })
  }, [reqs, activeTab, searchTerm, priorityFilter])

  const pendingCount   = byStatus('pending').length
  const preparingCount = byStatus('preparing').length
  const highPriority   = byStatus('pending').filter(r => r.priority === 'high').length
  const timeout        = byStatus('pending').filter(r => {
    const hours = (Date.now() - r.createdAt.getTime()) / 3_600_000
    return hours > 8
  }).length

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppShell title="Yêu cầu vật liệu chờ duyệt" subtitle="Duyệt và xử lý yêu cầu vật liệu từ sản xuất">
      <div className="space-y-6">

        {/* Summary Cards — computed dynamically */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { icon: Clock,         bg: 'bg-amber-100', color: 'text-amber-600', label: 'Chờ duyệt',      value: pendingCount   },
            { icon: Package,       bg: 'bg-blue-100',  color: 'text-blue-600',  label: 'Đang chuẩn bị', value: preparingCount },
            { icon: ClipboardList, bg: 'bg-red-100',   color: 'text-red-600',   label: 'Ưu tiên cao',   value: highPriority   },
            { icon: AlertTriangle, bg: 'bg-orange-100',color: 'text-orange-600',label: 'Sắp timeout',    value: timeout        },
          ].map(({ icon: Icon, bg, color, label, value }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg ${bg} p-3`}>
                    <Icon className={`size-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Card with Tabs */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-semibold">Danh sách yêu cầu</CardTitle>
              <div className="flex flex-wrap gap-2">
                {/* Priority filter */}
                <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
                  <SelectTrigger className="w-44 gap-1">
                    <Filter className="size-4 text-muted-foreground" />
                    <SelectValue placeholder="Ưu tiên" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả ưu tiên</SelectItem>
                    <SelectItem value="high">Cao</SelectItem>
                    <SelectItem value="normal">Bình thường</SelectItem>
                    <SelectItem value="low">Thấp</SelectItem>
                  </SelectContent>
                </Select>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Tìm mã / nhân viên..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as Status); }}>
              <TabsList className="mb-4">
                {(['pending', 'preparing', 'approved', 'rejected'] as Status[]).map(s => (
                  <TabsTrigger key={s} value={s}>
                    {STATUS_LABELS[s]}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {byStatus(s).length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>

              {(['pending', 'preparing', 'approved', 'rejected'] as Status[]).map(s => (
                <TabsContent key={s} value={s}>
                  <RequisitionsTable
                    items={filtered}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    showActions={s === 'pending'}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}