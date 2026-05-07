'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, CheckCircle2, UserCheck, Package, PenTool, AlertTriangle, RotateCcw } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfirmItem {
  id: string
  pickListNo: string
  department: string
  productionOrder: string
  pickedBy: string
  pickedAt: string
  totalItems: number
  totalQuantity: number
  warehouseConfirm: boolean
  warehouseSignature: string | null   // base64 dataURL
  warehouseConfirmedAt: string | null
  receiverConfirm: boolean
  receiverSignature: string | null
  receiverConfirmedAt: string | null
}

type ConfirmSide = 'warehouse' | 'receiver'

// ─── Initial Data ─────────────────────────────────────────────────────────────

const initialItems: ConfirmItem[] = [
  {
    id: 'PX-2024-00089', pickListNo: 'PL-2024-001', department: 'Xưởng sản xuất A',
    productionOrder: 'LSX-2024-001', pickedBy: 'Nguyễn Văn A', pickedAt: '2024-01-15 11:30',
    totalItems: 4, totalQuantity: 300,
    warehouseConfirm: true, warehouseSignature: null, warehouseConfirmedAt: '2024-01-15 11:45',
    receiverConfirm: false, receiverSignature: null, receiverConfirmedAt: null
  },
  {
    id: 'PX-2024-00088', pickListNo: 'PL-2024-002', department: 'Xưởng sản xuất B',
    productionOrder: 'LSX-2024-002', pickedBy: 'Trần Văn B', pickedAt: '2024-01-15 10:00',
    totalItems: 6, totalQuantity: 450,
    warehouseConfirm: false, warehouseSignature: null, warehouseConfirmedAt: null,
    receiverConfirm: false, receiverSignature: null, receiverConfirmedAt: null
  },
  {
    id: 'PX-2024-00086', pickListNo: 'PL-2024-003', department: 'Xưởng đóng gói',
    productionOrder: 'LSX-2024-005', pickedBy: 'Phạm Thị D', pickedAt: '2024-01-15 09:15',
    totalItems: 5, totalQuantity: 280,
    warehouseConfirm: false, warehouseSignature: null, warehouseConfirmedAt: null,
    receiverConfirm: false, receiverSignature: null, receiverConfirmedAt: null
  },
  {
    id: 'PX-2024-00085', pickListNo: 'PL-2024-004', department: 'Xưởng sản xuất B',
    productionOrder: 'LSX-2024-006', pickedBy: 'Lê Thị C', pickedAt: '2024-01-14 16:30',
    totalItems: 3, totalQuantity: 150,
    warehouseConfirm: true, warehouseSignature: null, warehouseConfirmedAt: '2024-01-14 16:50',
    receiverConfirm: true, receiverSignature: null, receiverConfirmedAt: '2024-01-14 17:05'
  }
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getItemStatus(item: ConfirmItem): 'completed' | 'partial' | 'pending' {
  if (item.warehouseConfirm && item.receiverConfirm) return 'completed'
  if (item.warehouseConfirm || item.receiverConfirm) return 'partial'
  return 'pending'
}

function now(): string {
  return new Date().toLocaleString('vi-VN', { hour12: false }).replace(',', '')
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Signature Canvas ─────────────────────────────────────────────────────────

function SignatureCanvas({
  onSave,
  onCancel
}: {
  onSave: (dataUrl: string) => void
  onCancel: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasStrokes = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current
    if (!canvas) return
    drawing.current = true
    hasStrokes.current = true
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    e.preventDefault()
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    e.preventDefault()
  }

  function stopDraw() { drawing.current = false }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    hasStrokes.current = false
  }

  function save() {
    const canvas = canvasRef.current
    if (!canvas || !hasStrokes.current) return
    onSave(canvas.toDataURL('image/png'))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border-2 border-dashed border-border overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={480}
          height={160}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">Vẽ chữ ký của bạn vào ô trên</p>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={clearCanvas}>
          <RotateCcw className="size-3 mr-1" /> Xoá
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Huỷ</Button>
        <Button size="sm" onClick={save}>Lưu chữ ký</Button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DualConfirmPage() {
  const [items, setItems] = useState<ConfirmItem[]>(initialItems)
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogItem, setDialogItem] = useState<ConfirmItem | null>(null)
  const [signingSide, setSigningSide] = useState<ConfirmSide | null>(null)

  // ── Stats ──────────────────────────────────────────────────────────────────

  const pending  = items.filter((i) => getItemStatus(i) === 'pending').length
  const partial  = items.filter((i) => getItemStatus(i) === 'partial').length
  const completed = items.filter((i) => getItemStatus(i) === 'completed').length
  const total    = items.length

  // ── Filtered ───────────────────────────────────────────────────────────────

  const filtered = items.filter(
    (i) =>
      i.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.productionOrder.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── Handlers ──────────────────────────────────────────────────────────────

  function openDialog(item: ConfirmItem) {
    setDialogItem({ ...item })
    setSigningSide(null)
  }

  function handleSaveSignature(dataUrl: string) {
    if (!dialogItem || !signingSide) return
    const timestamp = now()
    const updated: ConfirmItem =
      signingSide === 'warehouse'
        ? { ...dialogItem, warehouseConfirm: true, warehouseSignature: dataUrl, warehouseConfirmedAt: timestamp }
        : { ...dialogItem, receiverConfirm: true, receiverSignature: dataUrl, receiverConfirmedAt: timestamp }
    setDialogItem(updated)
    setSigningSide(null)
    // Persist to main list
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
  }

  const synced = dialogItem ? items.find((i) => i.id === dialogItem.id) ?? dialogItem : null

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppShell title="Dual Confirmation" subtitle="Xác nhận hai bên (Kho và Người nhận) khi giao hàng">
      <div className="flex flex-col gap-6 p-6">

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Tổng phiếu"
            value={total}
            icon={Package}
            iconClassName="bg-amber-50 text-amber-700"
          />
          <StatCard
            label="Chờ xác nhận"
            value={pending}
            icon={AlertTriangle}
            iconClassName="bg-amber-50 text-amber-700"
          />
          <StatCard
            label="Xác nhận 1 bên"
            value={partial}
            icon={UserCheck}
            iconClassName="bg-blue-50 text-blue-700"
          />
          <StatCard
            label="Hoàn thành"
            value={completed}
            icon={CheckCircle2}
            iconClassName="bg-emerald-50 text-emerald-700"
          />
        </div>

        {/* ── Info Banner ── */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <UserCheck className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Quy trình Dual Confirmation</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Mỗi phiếu xuất kho cần xác nhận bởi <strong>Thủ kho</strong> (người giao) và <strong>Người nhận hàng</strong> (Production).
                Cả hai bên phải ký xác nhận bằng chữ ký tay điện tử.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Search ── */}
        <div className="flex items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo số phiếu, bộ phận, lệnh SX..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 shrink-0">
            <AlertTriangle className="size-3" />
            {pending + partial} chờ xác nhận
          </Badge>
        </div>

        {/* ── Table ── */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Số phiếu xuất</TableHead>
                  <TableHead>Pick List</TableHead>
                  <TableHead>Lệnh SX</TableHead>
                  <TableHead>Bộ phận nhận</TableHead>
                  <TableHead className="text-right">Số lượng</TableHead>
                  <TableHead>Người lấy hàng</TableHead>
                  <TableHead className="text-center">Kho xác nhận</TableHead>
                  <TableHead className="text-center">Người nhận XN</TableHead>
                  <TableHead className="text-center">Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const status = getItemStatus(item)
                  return (
                    <TableRow key={item.id} className={status === 'completed' ? 'bg-emerald-50/40' : ''}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell className="text-muted-foreground">{item.pickListNo}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.productionOrder}</Badge>
                      </TableCell>
                      <TableCell>{item.department}</TableCell>
                      <TableCell className="text-right text-sm">
                        {item.totalItems} dòng / {item.totalQuantity} SP
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-6">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {initials(item.pickedBy)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{item.pickedBy}</span>
                        </div>
                      </TableCell>
                      {/* Kho confirm */}
                      <TableCell className="text-center">
                        {item.warehouseConfirm ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <CheckCircle2 className="size-5 text-emerald-500" />
                            <span className="text-[10px] text-muted-foreground">{item.warehouseConfirmedAt?.split(' ')[1]}</span>
                          </div>
                        ) : (
                          <div className="size-5 rounded-full border-2 border-muted-foreground/30 mx-auto" />
                        )}
                      </TableCell>
                      {/* Receiver confirm */}
                      <TableCell className="text-center">
                        {item.receiverConfirm ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <CheckCircle2 className="size-5 text-emerald-500" />
                            <span className="text-[10px] text-muted-foreground">{item.receiverConfirmedAt?.split(' ')[1]}</span>
                          </div>
                        ) : (
                          <div className="size-5 rounded-full border-2 border-muted-foreground/30 mx-auto" />
                        )}
                      </TableCell>
                      {/* Status badge */}
                      <TableCell className="text-center">
                        {status === 'completed' && <Badge className="bg-emerald-100 text-emerald-700">Hoàn thành</Badge>}
                        {status === 'partial'   && <Badge className="bg-blue-100 text-blue-700">1/2 bên</Badge>}
                        {status === 'pending'   && <Badge className="bg-amber-100 text-amber-700">Chờ XN</Badge>}
                      </TableCell>
                      {/* Action */}
                      <TableCell className="text-right">
                        {status !== 'completed' ? (
                          <Button size="sm" onClick={() => openDialog(item)}>
                            <PenTool className="size-4 mr-1" />
                            Xác nhận
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => openDialog(item)}>
                            Xem
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ── Confirm Dialog ── */}
        <Dialog open={!!dialogItem} onOpenChange={(o) => { if (!o) { setDialogItem(null); setSigningSide(null) } }}>
          <DialogContent className="max-w-lg">
            {dialogItem && !signingSide && (
              <>
                <DialogHeader>
                  <DialogTitle>Xác nhận giao nhận hàng</DialogTitle>
                  <DialogDescription>
                    Phiếu xuất: <strong>{dialogItem.id}</strong> | {dialogItem.department}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  {/* Summary */}
                  <div className="rounded-lg bg-muted/50 p-4 grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-muted-foreground">Lệnh sản xuất</span>
                    <span className="font-medium text-right">{dialogItem.productionOrder}</span>
                    <span className="text-muted-foreground">Tổng số lượng</span>
                    <span className="font-medium text-right">{dialogItem.totalQuantity} SP</span>
                    <span className="text-muted-foreground">Số dòng</span>
                    <span className="font-medium text-right">{dialogItem.totalItems} dòng</span>
                    <span className="text-muted-foreground">Người lấy hàng</span>
                    <span className="font-medium text-right">{dialogItem.pickedBy}</span>
                  </div>

                  {/* Warehouse side */}
                  <ConfirmSideCard
                    icon={<Package className="size-5 text-primary" />}
                    title="Thủ kho xác nhận"
                    subtitle="Xác nhận đã giao đúng số lượng"
                    confirmed={dialogItem.warehouseConfirm}
                    confirmedAt={dialogItem.warehouseConfirmedAt}
                    signature={dialogItem.warehouseSignature}
                    onSign={() => setSigningSide('warehouse')}
                  />

                  {/* Receiver side */}
                  <ConfirmSideCard
                    icon={<UserCheck className="size-5 text-blue-500" />}
                    title="Người nhận xác nhận"
                    subtitle="Xác nhận đã nhận đúng số lượng"
                    confirmed={dialogItem.receiverConfirm}
                    confirmedAt={dialogItem.receiverConfirmedAt}
                    signature={dialogItem.receiverSignature}
                    onSign={() => setSigningSide('receiver')}
                    disabled={!dialogItem.warehouseConfirm}
                    disabledHint="Chờ thủ kho xác nhận trước"
                  />
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => { setDialogItem(null); setSigningSide(null) }}>
                    Đóng
                  </Button>
                </DialogFooter>
              </>
            )}

            {/* Signature drawing panel */}
            {dialogItem && signingSide && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <PenTool className="size-4" />
                    {signingSide === 'warehouse' ? 'Chữ ký Thủ kho' : 'Chữ ký Người nhận'}
                  </DialogTitle>
                  <DialogDescription>
                    Vẽ chữ ký xác nhận cho phiếu {dialogItem.id}
                  </DialogDescription>
                </DialogHeader>
                <SignatureCanvas
                  onSave={handleSaveSignature}
                  onCancel={() => setSigningSide(null)}
                />
              </>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </AppShell>
  )
}

// ─── ConfirmSideCard ──────────────────────────────────────────────────────────

function ConfirmSideCard({
  icon, title, subtitle, confirmed, confirmedAt, signature, onSign, disabled, disabledHint
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  confirmed: boolean
  confirmedAt: string | null
  signature: string | null
  onSign: () => void
  disabled?: boolean
  disabledHint?: string
}) {
  return (
    <div className={`rounded-lg border p-3 transition-colors ${confirmed ? 'bg-emerald-50 border-emerald-200' : 'bg-background'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {confirmed ? (
          <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
            <CheckCircle2 className="size-4" />
            {confirmedAt && <span>{confirmedAt}</span>}
          </div>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <Button
              size="sm"
              variant={disabled ? 'ghost' : 'outline'}
              disabled={disabled}
              onClick={onSign}
              className={disabled ? 'text-muted-foreground' : ''}
            >
              <PenTool className="size-3 mr-1" />
              Ký xác nhận
            </Button>
            {disabled && disabledHint && (
              <span className="text-[10px] text-muted-foreground">{disabledHint}</span>
            )}
          </div>
        )}
      </div>
      {/* Signature preview */}
      {confirmed && signature && (
        <div className="mt-2 rounded border bg-white p-1">
          <img src={signature} alt="Chữ ký" className="h-12 w-full object-contain" />
        </div>
      )}
      {confirmed && !signature && (
        <div className="mt-2 rounded border bg-white px-3 py-1.5 text-xs text-muted-foreground italic">
          Đã xác nhận
        </div>
      )}
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, iconClassName
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  iconClassName?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClassName ?? 'bg-muted text-muted-foreground'}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight text-foreground">{value}</p>
        </div>
      </div>
    </div>
  )
}