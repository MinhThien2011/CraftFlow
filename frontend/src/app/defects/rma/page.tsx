'use client'

import { useState, useMemo } from 'react'
import { AppShell } from '@/components/app-shell'
import {
  RotateCcw, Search, Eye, CheckCircle2, XCircle, Package,
  ClipboardCheck, Camera, X, Upload, Clock, Check, ChevronLeft, ChevronRight
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
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────
type RMAStatus = 'pending_approval' | 'approved' | 'received' | 'qc_checking' | 'resolved' | 'rejected'
type QCResult  = 'refund' | 'replace' | 'repair' | 'reject' | ''

interface TimelineEvent {
  status: RMAStatus
  label: string
  at: Date
  note?: string
}

interface RMAItem {
  id: string
  code: string
  customerName: string
  orderCode: string
  products: { name: string; quantity: number; reason: string }[]
  createdAt: Date
  status: RMAStatus
  qcResult?: QCResult
  qcNote?: string
  qcImages?: string[]
  rejectReason?: string
  timeline: TimelineEvent[]
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const INITIAL_RMA: RMAItem[] = [
  {
    id: '1',
    code: 'RMA-2024-008',
    customerName: 'Cửa hàng Gấu Bông 123',
    orderCode: 'ORD-2024-056',
    products: [
      { name: 'Gấu bông Teddy Size L', quantity: 2, reason: 'Đường may bị bung' },
      { name: 'Thỏ Handmade', quantity: 1, reason: 'Màu sắc không đúng' },
    ],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: 'pending_approval',
    timeline: [
      { status: 'pending_approval', label: 'Tạo yêu cầu RMA', at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    ],
  },
  {
    id: '2',
    code: 'RMA-2024-009',
    customerName: 'Shop Đồ Chơi Online',
    orderCode: 'ORD-2024-062',
    products: [
      { name: 'Gấu bông Mini', quantity: 5, reason: 'Bông nhồi không đều' },
    ],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    status: 'approved',
    timeline: [
      { status: 'pending_approval', label: 'Tạo yêu cầu RMA', at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      { status: 'approved', label: 'Phê duyệt RMA', at: new Date(Date.now() - 20 * 60 * 60 * 1000) },
    ],
  },
  {
    id: '3',
    code: 'RMA-2024-007',
    customerName: 'Siêu thị ABC',
    orderCode: 'ORD-2024-048',
    products: [
      { name: 'Túi đeo chéo Handmade', quantity: 3, reason: 'Dây đeo bị lỗi' },
    ],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    status: 'qc_checking',
    timeline: [
      { status: 'pending_approval', label: 'Tạo yêu cầu RMA', at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      { status: 'approved', label: 'Phê duyệt RMA', at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
      { status: 'received', label: 'Đã nhận hàng về kho', at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      { status: 'qc_checking', label: 'Bắt đầu kiểm tra QC', at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
    ],
  },
]

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<RMAStatus, { label: string; color: string }> = {
  pending_approval: { label: 'Chờ phê duyệt',    color: 'bg-amber-100 text-amber-700' },
  approved:         { label: 'Đã duyệt',          color: 'bg-blue-100 text-blue-700' },
  received:         { label: 'Đã nhận hàng',      color: 'bg-indigo-100 text-indigo-700' },
  qc_checking:      { label: 'Đang kiểm tra QC',  color: 'bg-purple-100 text-purple-700' },
  resolved:         { label: 'Đã xử lý',          color: 'bg-emerald-100 text-emerald-700' },
  rejected:         { label: 'Từ chối',            color: 'bg-red-100 text-red-700' },
}
const QC_LABELS: Record<string, string> = {
  refund: 'Hoàn tiền', replace: 'Đổi hàng mới', repair: 'Sửa chữa', reject: 'Từ chối (lỗi KH)',
}
const STATUS_ORDER: RMAStatus[] = ['pending_approval', 'approved', 'received', 'qc_checking', 'resolved']
const PAGE_SIZE = 5

// ─── Helpers ──────────────────────────────────────────────────────────────────
function addTimelineEvent(item: RMAItem, status: RMAStatus, label: string, note?: string): RMAItem {
  return {
    ...item,
    status,
    timeline: [...item.timeline, { status, label, at: new Date(), note }],
  }
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={7}>
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <RotateCcw className="mb-3 size-10 opacity-30" />
          <p className="text-sm">Không có RMA nào</p>
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
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} / {total}
      </p>
      <div className="flex gap-1">
        <Button variant="outline" size="icon" className="size-8" disabled={page === 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <Button key={p} size="icon" className="size-8"
            variant={p === page ? 'default' : 'outline'} onClick={() => onChange(p)}>{p}</Button>
        ))}
        <Button variant="outline" size="icon" className="size-8" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── Status Timeline ──────────────────────────────────────────────────────────
function StatusTimeline({ item }: { item: RMAItem }) {
  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground">Lịch sử trạng thái</Label>
      <div className="mt-2 space-y-0">
        {item.timeline.map((ev, i) => {
          const isLast = i === item.timeline.length - 1
          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`size-7 rounded-full flex items-center justify-center border-2
                  ${isLast ? 'border-primary bg-primary text-white' : 'border-muted-foreground/30 bg-muted'}`}>
                  {isLast
                    ? <Check className="size-3.5" />
                    : <Clock className="size-3 text-muted-foreground" />}
                </div>
                {i < item.timeline.length - 1 && (
                  <div className="w-px flex-1 bg-muted-foreground/20 my-1" style={{ minHeight: 16 }} />
                )}
              </div>
              <div className="pb-3">
                <p className="text-sm font-medium">{ev.label}</p>
                <p className="text-xs text-muted-foreground">
                  {format(ev.at, 'HH:mm dd/MM/yyyy', { locale: vi })}
                </p>
                {ev.note && <p className="text-xs text-muted-foreground mt-0.5 italic">{ev.note}</p>}
              </div>
            </div>
          )
        })}
        {/* Remaining steps */}
        {item.status !== 'rejected' && item.status !== 'resolved' && (() => {
          const remaining = STATUS_ORDER.slice(STATUS_ORDER.indexOf(item.status) + 1)
          return remaining.map((s, i) => (
            <div key={s} className="flex gap-3 opacity-35">
              <div className="flex flex-col items-center">
                <div className="size-7 rounded-full border-2 border-dashed border-muted-foreground/40 bg-transparent flex items-center justify-center">
                  <Clock className="size-3 text-muted-foreground" />
                </div>
                {i < remaining.length - 1 && (
                  <div className="w-px flex-1 bg-muted-foreground/10 my-1" style={{ minHeight: 16 }} />
                )}
              </div>
              <div className="pb-3">
                <p className="text-sm">{STATUS_CONFIG[s].label}</p>
              </div>
            </div>
          ))
        })()}
      </div>
    </div>
  )
}

// ─── Image Upload ─────────────────────────────────────────────────────────────
function ImageUploader({ images, onChange }: {
  images: string[]; onChange: (imgs: string[]) => void
}) {
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    files.forEach(f => {
      const reader = new FileReader()
      reader.onload = ev => {
        if (ev.target?.result) onChange([...images, ev.target.result as string])
      }
      reader.readAsDataURL(f)
    })
    e.target.value = ''
  }

  return (
    <div className="space-y-2">
      <Label>Ảnh bằng chứng</Label>
      <div className="flex flex-wrap gap-2">
        {images.map((src, i) => (
          <div key={i} className="relative size-20 rounded-lg border overflow-hidden">
            <img src={src} alt="" className="size-full object-cover" />
            <button
              onClick={() => onChange(images.filter((_, j) => j !== i))}
              className="absolute top-0.5 right-0.5 size-5 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        <label className="size-20 rounded-lg border-2 border-dashed border-muted-foreground/30
          flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
          <Upload className="size-5 text-muted-foreground mb-1" />
          <span className="text-xs text-muted-foreground">Tải ảnh</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFile} />
        </label>
      </div>
    </div>
  )
}

// ─── Detail / Action Dialog ───────────────────────────────────────────────────
function RMADialog({ item, onUpdate }: {
  item: RMAItem
  onUpdate: (updated: RMAItem) => void
}) {
  const { toast } = useToast()
  const [open, setOpen]           = useState(false)
  const [qcDecision, setQcDecision] = useState<QCResult>('')
  const [qcNote, setQcNote]       = useState('')
  const [qcImages, setQcImages]   = useState<string[]>([])
  const [rejectReason, setRejectReason] = useState('')

  function close() {
    setOpen(false)
    setQcDecision(''); setQcNote(''); setQcImages([]); setRejectReason('')
  }

  function handleApprove() {
    onUpdate(addTimelineEvent(item, 'approved', 'Phê duyệt RMA'))
    toast({ title: '✅ Đã phê duyệt RMA', description: `${item.code} đã được duyệt.` })
    close()
  }

  function handleReject() {
    if (!rejectReason.trim()) return
    onUpdate(addTimelineEvent({ ...item, rejectReason }, 'rejected', 'Từ chối RMA', rejectReason))
    toast({ title: '❌ Đã từ chối RMA', description: rejectReason, variant: 'destructive' })
    close()
  }

  function handleQCConfirm() {
    if (!qcDecision) return
    const updated = addTimelineEvent(
      { ...item, qcResult: qcDecision, qcNote, qcImages },
      'resolved', 'Hoàn tất kiểm tra QC', `Phương án: ${QC_LABELS[qcDecision]}`
    )
    onUpdate(updated)
    toast({ title: '🔍 QC hoàn tất', description: `Phương án: ${QC_LABELS[qcDecision]}` })
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else setOpen(true) }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <Eye className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết RMA {item.code}</DialogTitle>
          <DialogDescription>{item.customerName} — {item.orderCode}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Info */}
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-muted-foreground">Khách hàng</Label><p className="font-medium">{item.customerName}</p></div>
            <div><Label className="text-muted-foreground">Mã đơn hàng</Label><p className="font-medium">{item.orderCode}</p></div>
            <div>
              <Label className="text-muted-foreground">Trạng thái</Label>
              <div className="mt-1"><Badge className={STATUS_CONFIG[item.status].color}>{STATUS_CONFIG[item.status].label}</Badge></div>
            </div>
            <div><Label className="text-muted-foreground">Ngày tạo</Label><p className="text-sm">{format(item.createdAt, 'dd/MM/yyyy', { locale: vi })}</p></div>
          </div>

          {/* Products */}
          <div>
            <Label className="text-muted-foreground">Sản phẩm trả lại</Label>
            <div className="mt-2 divide-y rounded-lg border">
              {item.products.map((p, i) => (
                <div key={i} className="flex items-start justify-between p-3">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">Lý do: {p.reason}</p>
                  </div>
                  <Badge variant="secondary">{p.quantity} sản phẩm</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <StatusTimeline item={item} />

          {/* Reject reason */}
          {item.status === 'rejected' && item.rejectReason && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-700">Lý do từ chối</p>
              <p className="text-sm text-red-600 mt-1">{item.rejectReason}</p>
            </div>
          )}

          {/* QC result (resolved) */}
          {item.status === 'resolved' && item.qcResult && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
              <p className="text-sm font-semibold text-emerald-700">Kết quả QC</p>
              <p className="text-sm"><span className="font-medium">Phương án:</span> {QC_LABELS[item.qcResult]}</p>
              {item.qcNote && <p className="text-sm text-muted-foreground">{item.qcNote}</p>}
              {item.qcImages && item.qcImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {item.qcImages.map((src, i) => (
                    <img key={i} src={src} alt="" className="size-16 rounded-lg border object-cover" />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reject form (pending_approval) */}
          {item.status === 'pending_approval' && (
            <div className="space-y-2 border-t pt-4">
              <Label>Lý do từ chối (nếu từ chối)</Label>
              <Textarea
                placeholder="Nhập lý do từ chối RMA..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={2}
              />
            </div>
          )}

          {/* QC form (qc_checking) */}
          {item.status === 'qc_checking' && (
            <div className="space-y-4 rounded-lg bg-muted/50 p-4 border-t">
              <h4 className="font-medium">Kết quả kiểm tra QC</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quyết định xử lý</Label>
                  <Select value={qcDecision} onValueChange={v => setQcDecision(v as QCResult)}>
                    <SelectTrigger><SelectValue placeholder="Chọn phương án" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="refund">Hoàn tiền</SelectItem>
                      <SelectItem value="replace">Đổi hàng mới</SelectItem>
                      <SelectItem value="repair">Sửa chữa</SelectItem>
                      <SelectItem value="reject">Từ chối (lỗi KH)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ghi chú QC</Label>
                <Textarea
                  placeholder="Mô tả chi tiết tình trạng sản phẩm..."
                  value={qcNote}
                  onChange={e => setQcNote(e.target.value)}
                  rows={3}
                />
              </div>
              <ImageUploader images={qcImages} onChange={setQcImages} />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="ghost" onClick={close}>Đóng</Button>
          {item.status === 'pending_approval' && (
            <>
              <Button
                variant="outline" className="text-red-600 hover:bg-red-50"
                disabled={!rejectReason.trim()} onClick={handleReject}
              >
                <XCircle className="mr-2 size-4" /> Từ chối RMA
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove}>
                <CheckCircle2 className="mr-2 size-4" /> Phê duyệt RMA
              </Button>
            </>
          )}
          {item.status === 'qc_checking' && (
            <Button disabled={!qcDecision} onClick={handleQCConfirm}>
              <ClipboardCheck className="mr-2 size-4" /> Xác nhận kết quả QC
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Quick Approve/Reject inline ──────────────────────────────────────────────
function QuickApproveBtn({ item, onUpdate }: { item: RMAItem; onUpdate: (u: RMAItem) => void }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-emerald-600 hover:bg-emerald-50">
          <CheckCircle2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Phê duyệt {item.code}?</DialogTitle></DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
            onUpdate(addTimelineEvent(item, 'approved', 'Phê duyệt RMA'))
            toast({ title: '✅ Đã phê duyệt', description: item.code })
            setOpen(false)
          }}>Xác nhận</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function QuickRejectBtn({ item, onUpdate }: { item: RMAItem; onUpdate: (u: RMAItem) => void }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setReason('') }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-red-600 hover:bg-red-50">
          <XCircle className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Từ chối {item.code}?</DialogTitle></DialogHeader>
        <Textarea placeholder="Lý do từ chối..." value={reason} onChange={e => setReason(e.target.value)} rows={3} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
          <Button variant="destructive" disabled={!reason.trim()} onClick={() => {
            onUpdate(addTimelineEvent({ ...item, rejectReason: reason }, 'rejected', 'Từ chối RMA', reason))
            toast({ title: '❌ Đã từ chối', description: reason, variant: 'destructive' })
            setOpen(false); setReason('')
          }}>Từ chối</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── RMA Table ────────────────────────────────────────────────────────────────
function RMATable({ items, onUpdate }: { items: RMAItem[]; onUpdate: (u: RMAItem) => void }) {
  const [page, setPage] = useState(1)
  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã RMA</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Mã đơn hàng</TableHead>
              <TableHead>Sản phẩm trả</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? <EmptyState /> : paginated.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.code}</TableCell>
                <TableCell>{item.customerName}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{item.orderCode}</TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    {item.products.map((p, i) => (
                      <p key={i} className="text-sm">• {p.name} × {p.quantity}</p>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge className={STATUS_CONFIG[item.status].color}>
                      {STATUS_CONFIG[item.status].label}
                    </Badge>
                    {item.qcResult && (
                      <p className="text-xs text-muted-foreground">{QC_LABELS[item.qcResult]}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(item.createdAt, 'dd/MM/yyyy', { locale: vi })}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-0.5">
                    <RMADialog item={item} onUpdate={onUpdate} />
                    {item.status === 'pending_approval' && (
                      <>
                        <QuickApproveBtn item={item} onUpdate={onUpdate} />
                        <QuickRejectBtn item={item} onUpdate={onUpdate} />
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RMAPage() {
  const [items, setItems] = useState<RMAItem[]>(INITIAL_RMA)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab]   = useState<'all' | RMAStatus>('all')

  function handleUpdate(updated: RMAItem) {
    setItems(prev => prev.map(r => r.id === updated.id ? updated : r))
  }

  const byStatus = (s: RMAStatus) => items.filter(r => r.status === s)

  const filtered = useMemo(() => {
    const base = activeTab === 'all' ? items : items.filter(r => r.status === activeTab)
    return base.filter(r =>
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [items, activeTab, searchTerm])

  return (
    <AppShell title="Hàng trả từ khách (RMA)" subtitle="Xử lý yêu cầu trả hàng và kiểm tra chất lượng">
      <div className="space-y-6">

        {/* Summary — dynamic */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { icon: RotateCcw,     bg: 'bg-amber-100',   color: 'text-amber-600',   label: 'Chờ duyệt',          value: byStatus('pending_approval').length },
            { icon: Package,       bg: 'bg-blue-100',    color: 'text-blue-600',    label: 'Chờ nhận hàng',      value: byStatus('approved').length },
            { icon: ClipboardCheck,bg: 'bg-purple-100',  color: 'text-purple-600',  label: 'Đang kiểm QC',       value: byStatus('qc_checking').length },
            { icon: CheckCircle2,  bg: 'bg-emerald-100', color: 'text-emerald-600', label: 'Đã xử lý tháng này', value: byStatus('resolved').length },
          ].map(({ icon: Icon, bg, color, label, value }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg ${bg} p-3`}><Icon className={`size-5 ${color}`} /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-semibold">Danh sách RMA</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm mã RMA / khách hàng..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
              <TabsList className="mb-4 flex-wrap h-auto gap-1">
                <TabsTrigger value="all">
                  Tất cả <Badge variant="secondary" className="ml-1.5 text-xs">{items.length}</Badge>
                </TabsTrigger>
                {([
                  ['pending_approval', 'Chờ duyệt'],
                  ['qc_checking',      'Đang QC'],
                  ['resolved',         'Đã xử lý'],
                  ['rejected',         'Từ chối'],
                ] as [RMAStatus, string][]).map(([s, label]) => (
                  <TabsTrigger key={s} value={s}>
                    {label} <Badge variant="secondary" className="ml-1.5 text-xs">{byStatus(s).length}</Badge>
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={activeTab}>
                <RMATable items={filtered} onUpdate={handleUpdate} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}