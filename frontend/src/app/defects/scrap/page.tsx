'use client'

import { useState, useMemo, useRef } from 'react'
import { AppShell } from '@/components/app-shell'
import {
  Trash2, Search, Plus, Eye, CheckCircle2, Scale,
  DollarSign, FileSignature, ChevronLeft, ChevronRight,
  AlertTriangle, X, PenLine
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
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────
type ScrapStatus = 'pending' | 'approved' | 'sold' | 'disposed'

interface ScrapItem {
  id: string
  code: string
  items: { name: string; quantity: number; unit: string; weight: number }[]
  totalWeight: number
  estimatedValue: number
  createdBy: string
  createdAt: Date
  status: ScrapStatus
  requireAdminApproval: boolean
  note?: string
  signatureDataUrl?: string
  approvedAt?: Date
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const INITIAL_SCRAP: ScrapItem[] = [
  {
    id: '1',
    code: 'SCRAP-2024-015',
    items: [
      { name: 'Len phế phẩm', quantity: 50, unit: 'cuộn', weight: 25 },
      { name: 'Vải vụn', quantity: 100, unit: 'mảnh', weight: 15 },
    ],
    totalWeight: 40,
    estimatedValue: 2500000,
    createdBy: 'Nguyễn Văn Kho',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: 'pending',
    requireAdminApproval: true,
  },
  {
    id: '2',
    code: 'SCRAP-2024-014',
    items: [{ name: 'Bông gòn hư', quantity: 20, unit: 'kg', weight: 20 }],
    totalWeight: 20,
    estimatedValue: 500000,
    createdBy: 'Trần Thị Staff',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    status: 'pending',
    requireAdminApproval: false,
  },
  {
    id: '3',
    code: 'SCRAP-2024-013',
    items: [{ name: 'Sản phẩm lỗi không sửa được', quantity: 15, unit: 'cái', weight: 8 }],
    totalWeight: 8,
    estimatedValue: 0,
    createdBy: 'Lê Văn Staff',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    status: 'approved',
    requireAdminApproval: false,
    approvedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
]

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ScrapStatus, { label: string; color: string }> = {
  pending:  { label: 'Chờ duyệt', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Đã duyệt',  color: 'bg-blue-100 text-blue-700' },
  sold:     { label: 'Đã bán',    color: 'bg-emerald-100 text-emerald-700' },
  disposed: { label: 'Đã hủy',   color: 'bg-gray-100 text-gray-600' },
}
const ADMIN_THRESHOLD = 2_000_000
const PAGE_SIZE = 5

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)

// ─── Signature Canvas ─────────────────────────────────────────────────────────
function SignatureCanvas({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing   = useRef(false)
  const [signed, setSigned] = useState(false)

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawing.current = true
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setSigned(true)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    ctx.lineWidth   = 2
    ctx.lineCap     = 'round'
    ctx.strokeStyle = '#1a1a1a'
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function stopDraw() { drawing.current = false }

  function clear() {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSigned(false)
  }

  function save() {
    const dataUrl = canvasRef.current!.toDataURL()
    onSave(dataUrl)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Chữ ký điện tử</Label>
        {signed && (
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={clear}>
            <X className="size-3" /> Xóa
          </Button>
        )}
      </div>
      <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={500} height={120}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        />
      </div>
      {!signed && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <PenLine className="size-3" /> Ký vào ô trên để xác nhận
        </p>
      )}
      {signed && (
        <Button size="sm" className="w-full" onClick={save}>
          <FileSignature className="mr-2 size-4" /> Lưu chữ ký & Phê duyệt
        </Button>
      )}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={7}>
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Trash2 className="mb-3 size-10 opacity-30" />
          <p className="text-sm">Không có phiếu phế liệu nào</p>
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
            variant={p === page ? 'default' : 'outline'} onClick={() => onChange(p)}>{p}
          </Button>
        ))}
        <Button variant="outline" size="icon" className="size-8" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── Detail Dialog ────────────────────────────────────────────────────────────
function DetailDialog({ item }: { item: ScrapItem }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <Eye className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Chi tiết — {item.code}</DialogTitle>
          <DialogDescription>Thông tin phiếu xử lý phế liệu</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-muted-foreground">Người tạo</Label><p className="font-medium">{item.createdBy}</p></div>
            <div><Label className="text-muted-foreground">Ngày tạo</Label><p className="font-medium">{format(item.createdAt, 'dd/MM/yyyy', { locale: vi })}</p></div>
            <div>
              <Label className="text-muted-foreground">Trạng thái</Label>
              <div className="mt-1 flex items-center gap-2">
                <Badge className={STATUS_CONFIG[item.status].color}>{STATUS_CONFIG[item.status].label}</Badge>
                {item.requireAdminApproval && <Badge variant="destructive" className="text-[10px]">Admin</Badge>}
              </div>
            </div>
            {item.approvedAt && (
              <div><Label className="text-muted-foreground">Ngày duyệt</Label><p className="font-medium">{format(item.approvedAt, 'dd/MM/yyyy HH:mm', { locale: vi })}</p></div>
            )}
          </div>

          <div>
            <Label className="text-muted-foreground">Danh sách phế liệu</Label>
            <div className="mt-2 divide-y rounded-lg border">
              {item.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span>{it.name} × {it.quantity} {it.unit}</span>
                  <span className="text-muted-foreground">{it.weight} kg</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-2 font-medium">
                <span>Tổng trọng lượng</span>
                <span>{item.totalWeight} kg</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <span className="text-sm text-muted-foreground">Giá trị thu hồi dự kiến</span>
            <span className={`font-semibold ${item.estimatedValue > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {item.estimatedValue > 0 ? formatCurrency(item.estimatedValue) : 'Không thu hồi'}
            </span>
          </div>

          {item.note && (
            <div><Label className="text-muted-foreground">Ghi chú</Label><p className="text-sm mt-1">{item.note}</p></div>
          )}

          {item.signatureDataUrl && (
            <div>
              <Label className="text-muted-foreground">Chữ ký phê duyệt</Label>
              <div className="mt-2 rounded-lg border bg-white p-2">
                <img src={item.signatureDataUrl} alt="signature" className="h-16 w-full object-contain" />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Approve Dialog ───────────────────────────────────────────────────────────
function ApproveDialog({ item, onApprove }: {
  item: ScrapItem
  onApprove: (id: string, sig: string) => void
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [sig, setSig]   = useState('')

  function handleSave(dataUrl: string) {
    setSig(dataUrl)
    onApprove(item.id, dataUrl)
    toast({ title: '✅ Đã phê duyệt & Trừ kho', description: `${item.code} — ${formatCurrency(item.estimatedValue)}` })
    setOpen(false)
    setSig('')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSig('') }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-emerald-600 hover:bg-emerald-50">
          <CheckCircle2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Phê duyệt phiếu phế liệu</DialogTitle>
          <DialogDescription>Xác nhận phê duyệt {item.code}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tổng trọng lượng</span>
              <span className="font-medium">{item.totalWeight} kg</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Giá trị thu hồi</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(item.estimatedValue)}</span>
            </div>
          </div>
          <SignatureCanvas onSave={handleSave} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Create Dialog ────────────────────────────────────────────────────────────
function CreateDialog({ onCreated }: { onCreated: (item: ScrapItem) => void }) {
  const { toast } = useToast()
  const [open, setOpen]         = useState(false)
  const [type, setType]         = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit]         = useState('')
  const [weight, setWeight]     = useState('')
  const [value, setValue]       = useState('')
  const [note, setNote]         = useState('')
  const [errors, setErrors]     = useState<Record<string, string>>({})

  const parsedValue  = Number(value)  || 0
  const parsedWeight = Number(weight) || 0
  const needsAdmin   = parsedValue >= ADMIN_THRESHOLD

  function validate() {
    const e: Record<string, string> = {}
    if (!type)     e.type     = 'Vui lòng chọn loại phế liệu'
    if (!quantity || Number(quantity) <= 0) e.quantity = 'Số lượng phải > 0'
    if (!unit)     e.unit     = 'Vui lòng chọn đơn vị'
    if (!weight || Number(weight) <= 0)     e.weight   = 'Trọng lượng phải > 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const TYPE_NAMES: Record<string, string> = {
    fabric: 'Vải vụn', yarn: 'Len phế phẩm',
    cotton: 'Bông gòn hư', product: 'Sản phẩm lỗi', other: 'Khác',
  }

  function handleCreate() {
    if (!validate()) return
    const newItem: ScrapItem = {
      id: String(Date.now()),
      code: `SCRAP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
      items: [{ name: TYPE_NAMES[type] || type, quantity: Number(quantity), unit, weight: parsedWeight }],
      totalWeight: parsedWeight,
      estimatedValue: parsedValue,
      createdBy: 'Dương Văn Minh',
      createdAt: new Date(),
      status: 'pending',
      requireAdminApproval: needsAdmin,
      note,
    }
    onCreated(newItem)
    toast({
      title: '📋 Đã tạo phiếu phế liệu',
      description: `${newItem.code}${needsAdmin ? ' — Cần Admin phê duyệt' : ''}`,
    })
    setOpen(false)
    setType(''); setQuantity(''); setUnit(''); setWeight(''); setValue(''); setNote(''); setErrors({})
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setErrors({}) }}>
      <DialogTrigger asChild>
        <Button><Plus className="size-4 mr-2" /> Tạo phiếu</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Tạo phiếu xử lý phế liệu</DialogTitle>
          <DialogDescription>Nhập thông tin phế liệu cần xử lý</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Loại phế liệu <span className="text-red-500">*</span></Label>
              <Select value={type} onValueChange={v => { setType(v); setErrors(e => ({ ...e, type: '' })) }}>
                <SelectTrigger className={errors.type ? 'border-red-400' : ''}>
                  <SelectValue placeholder="Chọn loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fabric">Vải vụn</SelectItem>
                  <SelectItem value="yarn">Len phế phẩm</SelectItem>
                  <SelectItem value="cotton">Bông gòn hư</SelectItem>
                  <SelectItem value="product">Sản phẩm lỗi</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-red-500">{errors.type}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Số lượng <span className="text-red-500">*</span></Label>
              <Input
                type="number" placeholder="0" value={quantity}
                onChange={e => { setQuantity(e.target.value); setErrors(er => ({ ...er, quantity: '' })) }}
                className={errors.quantity ? 'border-red-400' : ''}
              />
              {errors.quantity && <p className="text-xs text-red-500">{errors.quantity}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Đơn vị <span className="text-red-500">*</span></Label>
              <Select value={unit} onValueChange={v => { setUnit(v); setErrors(e => ({ ...e, unit: '' })) }}>
                <SelectTrigger className={errors.unit ? 'border-red-400' : ''}>
                  <SelectValue placeholder="Chọn đơn vị" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilogram (kg)</SelectItem>
                  <SelectItem value="cái">Cái</SelectItem>
                  <SelectItem value="cuộn">Cuộn</SelectItem>
                  <SelectItem value="mảnh">Mảnh</SelectItem>
                </SelectContent>
              </Select>
              {errors.unit && <p className="text-xs text-red-500">{errors.unit}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Trọng lượng (kg) <span className="text-red-500">*</span></Label>
              <Input
                type="number" placeholder="0.00" value={weight}
                onChange={e => { setWeight(e.target.value); setErrors(er => ({ ...er, weight: '' })) }}
                className={errors.weight ? 'border-red-400' : ''}
              />
              {errors.weight && <p className="text-xs text-red-500">{errors.weight}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Giá trị thu hồi dự kiến (VND)</Label>
            <Input
              type="number" placeholder="0" value={value}
              onChange={e => setValue(e.target.value)}
            />
            {needsAdmin && value && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600">
                <AlertTriangle className="size-3.5" />
                Giá trị &gt; 2,000,000 VND — phiếu này cần <strong>Admin phê duyệt</strong>
              </div>
            )}
            {parsedValue > 0 && !needsAdmin && (
              <p className="text-xs text-muted-foreground">≈ {formatCurrency(parsedValue)}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Ghi chú</Label>
            <Textarea placeholder="Mô tả chi tiết phế liệu..." value={note} onChange={e => setNote(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
          <Button onClick={handleCreate}>Tạo phiếu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Scrap Table ──────────────────────────────────────────────────────────────
function ScrapTable({ items, onApprove }: {
  items: ScrapItem[]
  onApprove: (id: string, sig: string) => void
}) {
  const [page, setPage] = useState(1)
  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã phiếu</TableHead>
              <TableHead>Phế liệu</TableHead>
              <TableHead className="text-right">Trọng lượng</TableHead>
              <TableHead className="text-right">Giá trị thu hồi</TableHead>
              <TableHead>Người tạo</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? <EmptyState /> : paginated.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {item.code}
                    {item.requireAdminApproval && (
                      <Badge variant="destructive" className="text-[10px]">Admin</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    {item.items.map((it, i) => (
                      <p key={i} className="text-sm">• {it.name} × {it.quantity} {it.unit}</p>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">{item.totalWeight} kg</TableCell>
                <TableCell className="text-right">
                  {item.estimatedValue > 0 ? (
                    <span className="font-medium text-emerald-600">{formatCurrency(item.estimatedValue)}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">Không thu hồi</span>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm">{item.createdBy}</p>
                    <p className="text-xs text-muted-foreground">{format(item.createdAt, 'dd/MM/yyyy', { locale: vi })}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_CONFIG[item.status].color}>
                    {STATUS_CONFIG[item.status].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-0.5">
                    <DetailDialog item={item} />
                    {item.status === 'pending' && !item.requireAdminApproval && (
                      <ApproveDialog item={item} onApprove={onApprove} />
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
export default function ScrapPage() {
  const [items, setItems]           = useState<ScrapItem[]>(INITIAL_SCRAP)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab]   = useState<'all' | ScrapStatus>('all')

  function handleApprove(id: string, sig: string) {
    setItems(prev => prev.map(r => r.id === id
      ? { ...r, status: 'approved' as ScrapStatus, signatureDataUrl: sig, approvedAt: new Date() }
      : r
    ))
  }

  function handleCreated(item: ScrapItem) {
    setItems(prev => [item, ...prev])
  }

  const byStatus = (s: ScrapStatus) => items.filter(r => r.status === s)

  const filtered = useMemo(() => {
    const base = activeTab === 'all' ? items : items.filter(r => r.status === activeTab)
    return base.filter(r =>
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [items, activeTab, searchTerm])

  // Dynamic summary values
  const pendingItems    = byStatus('pending')
  const totalPendingKg  = pendingItems.reduce((s, r) => s + r.totalWeight, 0)
  const totalRecovered  = byStatus('sold').reduce((s, r) => s + r.estimatedValue, 0)
  const adminCount      = pendingItems.filter(r => r.requireAdminApproval).length

  return (
    <AppShell title="Xử lý Phế liệu" subtitle="Quản lý và xử lý phế liệu từ sản xuất">
      <div className="space-y-6">

        {/* Summary — dynamic */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-100 p-3"><Trash2 className="size-5 text-amber-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Chờ duyệt</p>
                  <p className="text-2xl font-bold">{pendingItems.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3"><Scale className="size-5 text-blue-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng KL chờ xử lý</p>
                  <p className="text-2xl font-bold">{totalPendingKg} kg</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-emerald-100 p-3"><DollarSign className="size-5 text-emerald-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Giá trị thu hồi (tháng)</p>
                  <p className="text-2xl font-bold">
                    {totalRecovered >= 1_000_000
                      ? `${(totalRecovered / 1_000_000).toFixed(1)}M`
                      : formatCurrency(totalRecovered)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-red-100 p-3"><FileSignature className="size-5 text-red-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Cần Admin duyệt</p>
                  <p className="text-2xl font-bold">{adminCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-semibold">Danh sách phiếu phế liệu</CardTitle>
              <div className="flex gap-2">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Tìm mã / người tạo..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <CreateDialog onCreated={handleCreated} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">
                  Tất cả <Badge variant="secondary" className="ml-1.5 text-xs">{items.length}</Badge>
                </TabsTrigger>
                {(['pending', 'approved', 'sold', 'disposed'] as ScrapStatus[]).map(s => (
                  <TabsTrigger key={s} value={s}>
                    {STATUS_CONFIG[s].label}
                    <Badge variant="secondary" className="ml-1.5 text-xs">{byStatus(s).length}</Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={activeTab}>
                <ScrapTable items={filtered} onApprove={handleApprove} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}