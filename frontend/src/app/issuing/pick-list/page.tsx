'use client'

import { useState, useRef } from 'react'
import { Search, Printer, CheckCircle2, MapPin, Package, ArrowRight, QrCode, Boxes, Clock3, Truck } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { QRCodeSVG } from 'qrcode.react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = 'pending' | 'in_progress' | 'completed'

interface PickItem {
  id: string
  materialCode: string
  materialName: string
  location: string
  quantity: number
  picked: boolean
  unit: string
}

interface PickList {
  id: string
  issueNo: string
  department: string
  productionOrder: string
  createdAt: string
  status: Status
  items: PickItem[]
}

// ─── QR value builders ────────────────────────────────────────────────────────
// Encode thông tin vào QR dạng JSON — máy scan có thể đọc và xử lý tự động

function buildItemQRValue(pl: PickList, item: PickItem): string {
  return JSON.stringify({
    pickListId: pl.id,
    issueNo: pl.issueNo,
    productionOrder: pl.productionOrder,
    department: pl.department,
    materialCode: item.materialCode,
    materialName: item.materialName,
    location: item.location,
    quantity: item.quantity,
    unit: item.unit
  })
}

function buildPickListQRValue(pl: PickList): string {
  return JSON.stringify({
    pickListId: pl.id,
    issueNo: pl.issueNo,
    productionOrder: pl.productionOrder,
    department: pl.department,
    totalItems: pl.items.length,
    createdAt: pl.createdAt
  })
}

// ─── Initial Data ─────────────────────────────────────────────────────────────

const initialPickLists: PickList[] = [
  {
    id: 'PL-2024-001',
    issueNo: 'PX-2024-00089',
    department: 'Xưởng sản xuất A',
    productionOrder: 'LSX-2024-001',
    createdAt: '2024-01-15 10:45',
    status: 'in_progress',
    items: [
      { id: '1', materialCode: 'LEN-001', materialName: 'Len cotton cao cấp', location: 'A-01-01', quantity: 50, picked: true, unit: 'cuộn' },
      { id: '2', materialCode: 'LEN-002', materialName: 'Len acrylic', location: 'A-01-02', quantity: 30, picked: true, unit: 'cuộn' },
      { id: '3', materialCode: 'PKN-001', materialName: 'Phụ kiện nút áo', location: 'B-02-01', quantity: 200, picked: false, unit: 'bộ' },
      { id: '4', materialCode: 'CHI-001', materialName: 'Chỉ may màu trắng', location: 'C-01-03', quantity: 20, picked: false, unit: 'cuộn' }
    ]
  },
  {
    id: 'PL-2024-002',
    issueNo: 'PX-2024-00088',
    department: 'Xưởng sản xuất B',
    productionOrder: 'LSX-2024-002',
    createdAt: '2024-01-15 09:30',
    status: 'pending',
    items: [
      { id: '1', materialCode: 'VAI-001', materialName: 'Vải lót', location: 'D-01-01', quantity: 100, picked: false, unit: 'm' },
      { id: '2', materialCode: 'KEO-001', materialName: 'Keo dán', location: 'E-02-01', quantity: 50, picked: false, unit: 'hộp' }
    ]
  },
  {
    id: 'PL-2024-003',
    issueNo: 'PX-2024-00087',
    department: 'Xưởng may C',
    productionOrder: 'LSX-2024-003',
    createdAt: '2024-01-14 14:20',
    status: 'completed',
    items: [
      { id: '1', materialCode: 'VAI-002', materialName: 'Vải cotton', location: 'A-03-01', quantity: 80, picked: true, unit: 'm' },
      { id: '2', materialCode: 'CHI-002', materialName: 'Chỉ màu đen', location: 'C-01-01', quantity: 15, picked: true, unit: 'cuộn' }
    ]
  }
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getProgress(pl: PickList): number {
  const picked = pl.items.filter((i) => i.picked).length
  return Math.round((picked / pl.items.length) * 100)
}

function getStatus(pl: PickList): Status {
  const p = getProgress(pl)
  if (pl.status === 'completed' || p === 100) return 'completed'
  if (p > 0) return 'in_progress'
  return 'pending'
}

const STATUS_LABEL: Record<Status, string> = {
  in_progress: 'Đang lấy',
  completed: 'Hoàn thành',
  pending: 'Chờ lấy'
}

const STATUS_CLASS: Record<Status, string> = {
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PickListPage() {
  const [pickLists, setPickLists] = useState<PickList[]>(initialPickLists)
  const [selectedId, setSelectedId] = useState<string>(initialPickLists[0].id)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all')
  const [confirmOpen, setConfirmOpen] = useState(false)

  // QR states
  const [itemQR, setItemQR] = useState<{ item: PickItem; pl: PickList } | null>(null)
  const [allQROpen, setAllQROpen] = useState(false)

  const printRef = useRef<HTMLDivElement>(null)

  const selectedPickList = pickLists.find((pl) => pl.id === selectedId)!

  // ── Derived stats ────────────────────────────────────────────────────────────

  const allItems = pickLists.flatMap((pl) => pl.items)
  const totalItems = allItems.length
  const pickedItems = allItems.filter((i) => i.picked).length
  const remainingItems = totalItems - pickedItems
  const completedLists = pickLists.filter((pl) => getStatus(pl) === 'completed').length

  // ── Filtered list ────────────────────────────────────────────────────────────

  const filteredPickLists = pickLists.filter((pl) => {
    const matchQuery =
      pl.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pl.department.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = filterStatus === 'all' || getStatus(pl) === filterStatus
    return matchQuery && matchStatus
  })

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function toggleItem(itemId: string) {
    setPickLists((prev) =>
      prev.map((pl) =>
        pl.id !== selectedId
          ? pl
          : {
              ...pl,
              items: pl.items.map((item) =>
                item.id === itemId ? { ...item, picked: !item.picked } : item
              )
            }
      )
    )
  }

  function confirmComplete() {
    setPickLists((prev) =>
      prev.map((pl) => (pl.id === selectedId ? { ...pl, status: 'completed' } : pl))
    )
    setConfirmOpen(false)
  }

  // In QR — mở print dialog với nội dung từ printRef
  function handlePrintAllQR() {
    const content = printRef.current
    if (!content) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Codes — ${selectedPickList.id}</title>
          <style>
            body { font-family: sans-serif; padding: 24px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
            .qr-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; break-inside: avoid; }
            .qr-card svg { display: block; margin: 0 auto 10px; }
            .code { font-size: 13px; font-weight: 700; margin-bottom: 3px; }
            .name { font-size: 12px; color: #6b7280; margin-bottom: 6px; }
            .meta { font-size: 11px; color: #9ca3af; }
            .header { margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; }
            .header h1 { font-size: 18px; margin: 0 0 4px; }
            .header p { font-size: 13px; color: #6b7280; margin: 0; }
            @media print { body { padding: 12px; } }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 300)
  }

  // In QR đơn lẻ 1 item
  function handlePrintSingleQR(pl: PickList, item: PickItem) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>QR — ${item.materialCode}</title>
          <style>
            body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
            .card{border:1px solid #e5e7eb;border-radius:12px;padding:24px;text-align:center;width:260px}
            svg{display:block;margin:0 auto 14px}
            .code{font-size:15px;font-weight:700;margin-bottom:4px}
            .name{font-size:13px;color:#6b7280;margin-bottom:12px}
            table{width:100%;font-size:12px;border-collapse:collapse}
            td{padding:4px 0}
            td:first-child{color:#9ca3af;text-align:left}
            td:last-child{font-weight:600;text-align:right}
          </style>
        </head>
        <body>
          <div class="card">
            <div id="qr"></div>
            <div class="code">${item.materialCode}</div>
            <div class="name">${item.materialName}</div>
            <table>
              <tr><td>Vị trí kho</td><td>${item.location}</td></tr>
              <tr><td>Số lượng</td><td>${item.quantity} ${item.unit}</td></tr>
              <tr><td>Pick list</td><td>${pl.id}</td></tr>
              <tr><td>Lệnh SX</td><td>${pl.productionOrder}</td></tr>
            </table>
          </div>
          <script src="https://unpkg.com/qrcode/build/qrcode.min.js"></script>
          <script>
            QRCode.toCanvas(
              document.createElement('canvas'),
              ${JSON.stringify(buildItemQRValue(pl, item))},
              { width: 180 },
              function(err, canvas) {
                if (!err) document.getElementById('qr').appendChild(canvas)
                setTimeout(() => { window.print(); window.close() }, 400)
              }
            )
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const progress = getProgress(selectedPickList)

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <AppShell title="Pick List" subtitle="Danh sách lấy hàng theo vị trí kho">
      <div className="flex flex-col gap-6 p-6">

        {/* Top actions */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setAllQROpen(true)}>
            <QrCode className="size-4 mr-2" />
            Tạo QR Pick List
          </Button>
          <Button variant="outline">
            <Printer className="size-4 mr-2" />
            In Pick List
          </Button>
        </div>

        {/* ── Stats summary ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Tổng items"
            value={totalItems}
            icon={Boxes}
            iconClassName="bg-amber-50 text-amber-700"
          />
          <StatCard
            label="Đã pick"
            value={pickedItems}
            icon={Truck}
            iconClassName="bg-blue-50 text-blue-700"
          />
          <StatCard
            label="Còn lại"
            value={remainingItems}
            icon={Clock3}
            iconClassName="bg-amber-50 text-amber-700"
          />
          <StatCard
            label="Hoàn thành"
            value={`${completedLists}/${pickLists.length} PL`}
            icon={CheckCircle2}
            iconClassName="bg-emerald-50 text-emerald-700"
          />
        </div>

        {/* ── Main grid ── */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Pick List Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Danh sách Pick List</CardTitle>

              {/* Search */}
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm pick list..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filter tabs */}
              <div className="flex flex-wrap gap-2 mt-2">
                {(['all', 'in_progress', 'pending', 'completed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterStatus(f)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      filterStatus === f
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {f === 'all' ? 'Tất cả' : STATUS_LABEL[f]}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="space-y-2">
              {filteredPickLists.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Không tìm thấy pick list</p>
              )}
              {filteredPickLists.map((pl) => {
                const s = getStatus(pl)
                const p = getProgress(pl)
                return (
                  <div
                    key={pl.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedId === pl.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedId(pl.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{pl.id}</span>
                      <Badge className={STATUS_CLASS[s]}>{STATUS_LABEL[s]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{pl.department}</p>
                    <div className="flex items-center gap-2">
                      <Progress value={p} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground">{p}%</span>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Pick List Detail */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {selectedPickList.id}
                    <Badge variant="outline">{selectedPickList.productionOrder}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {selectedPickList.department} | {selectedPickList.createdAt}
                  </CardDescription>
                </div>
                <Button disabled={progress < 100} onClick={() => setConfirmOpen(true)}>
                  <CheckCircle2 className="size-4 mr-2" />
                  Hoàn thành Pick
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {/* Route */}
              <div className="rounded-lg border bg-muted/30 p-3 mb-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  Lộ trình tối ưu
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground overflow-x-auto">
                  {selectedPickList.items.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-1 rounded ${item.picked ? 'bg-emerald-100 text-emerald-700' : 'bg-background'}`}>
                        {item.location}
                      </span>
                      {index < selectedPickList.items.length - 1 && (
                        <ArrowRight className="size-4 text-muted-foreground/50" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                {selectedPickList.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                      item.picked ? 'bg-emerald-50 border-emerald-200' : 'bg-background'
                    }`}
                  >
                    <Checkbox
                      checked={item.picked}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{item.materialName}</span>
                        <Badge variant="outline" className="text-xs">{item.materialCode}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {item.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="size-3" />
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    </div>

                    {/* QR button per item */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-primary px-2"
                      onClick={() => setItemQR({ item, pl: selectedPickList })}
                      title="Xem QR code"
                    >
                      <QrCode className="size-4" />
                    </Button>

                    {item.picked ? (
                      <CheckCircle2 className="size-6 text-emerald-500 shrink-0" />
                    ) : (
                      <Button size="sm" onClick={() => toggleItem(item.id)}>Pick</Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Confirm hoàn thành ── */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận hoàn thành pick</DialogTitle>
              <DialogDescription>
                Bạn có chắc muốn xác nhận hoàn thành pick list này không?
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg bg-muted/40 p-4 text-sm space-y-1">
              <p><span className="text-muted-foreground">Pick list:</span> <strong>{selectedPickList.id}</strong></p>
              <p><span className="text-muted-foreground">Xưởng:</span> {selectedPickList.department}</p>
              <p><span className="text-muted-foreground">Lệnh SX:</span> {selectedPickList.productionOrder}</p>
              <p>
                <span className="text-muted-foreground">Items đã pick:</span>{' '}
                <strong className="text-emerald-700">
                  {selectedPickList.items.filter((i) => i.picked).length}/{selectedPickList.items.length} (100%)
                </strong>
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Huỷ bỏ</Button>
              <Button onClick={confirmComplete}>
                <CheckCircle2 className="size-4 mr-2" />
                Xác nhận hoàn thành
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── QR đơn lẻ 1 item ── */}
        <Dialog open={!!itemQR} onOpenChange={(o) => !o && setItemQR(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="size-4" />
                QR Code — {itemQR?.item.materialCode}
              </DialogTitle>
              <DialogDescription>{itemQR?.item.materialName}</DialogDescription>
            </DialogHeader>

            {itemQR && (
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 border rounded-xl bg-white">
                  <QRCodeSVG
                    value={buildItemQRValue(itemQR.pl, itemQR.item)}
                    size={200}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <div className="w-full rounded-lg bg-muted/40 p-3 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mã vật liệu</span>
                    <span className="font-semibold">{itemQR.item.materialCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vị trí kho</span>
                    <span className="font-semibold">{itemQR.item.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Số lượng</span>
                    <span className="font-semibold">{itemQR.item.quantity} {itemQR.item.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pick list</span>
                    <span className="font-semibold">{itemQR.pl.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lệnh SX</span>
                    <span className="font-semibold">{itemQR.pl.productionOrder}</span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setItemQR(null)}>Đóng</Button>
              {itemQR && (
                <Button onClick={() => handlePrintSingleQR(itemQR.pl, itemQR.item)}>
                  <Printer className="size-4 mr-2" />
                  In QR này
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Modal tất cả QR của pick list hiện tại ── */}
        <Dialog open={allQROpen} onOpenChange={setAllQROpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="size-4" />
                QR Codes — {selectedPickList.id}
              </DialogTitle>
              <DialogDescription>
                {selectedPickList.department} · {selectedPickList.items.length} items · {selectedPickList.productionOrder}
              </DialogDescription>
            </DialogHeader>

            {/* Nội dung ẩn dùng để in */}
            <div ref={printRef} className="hidden">
              <div className="header">
                <h1>QR Codes — {selectedPickList.id}</h1>
                <p>{selectedPickList.department} | {selectedPickList.productionOrder} | {selectedPickList.createdAt}</p>
              </div>
              <div className="grid">
                {selectedPickList.items.map((item) => (
                  <div key={item.id} className="qr-card">
                    <QRCodeSVG value={buildItemQRValue(selectedPickList, item)} size={120} level="M" />
                    <div className="code">{item.materialCode}</div>
                    <div className="name">{item.materialName}</div>
                    <div className="meta">📍 {item.location} &nbsp;|&nbsp; 📦 {item.quantity} {item.unit}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* QR tổng của pick list */}
            <div className="flex gap-4 p-4 rounded-xl border bg-muted/30 mb-4">
              <div className="bg-white p-2 rounded-lg border shrink-0">
                <QRCodeSVG
                  value={buildPickListQRValue(selectedPickList)}
                  size={80}
                  level="M"
                />
              </div>
              <div className="flex flex-col justify-center gap-1 text-sm">
                <p className="font-semibold text-base">{selectedPickList.id}</p>
                <p className="text-muted-foreground">{selectedPickList.department}</p>
                <p className="text-muted-foreground">Lệnh SX: {selectedPickList.productionOrder}</p>
                <Badge className={STATUS_CLASS[getStatus(selectedPickList)]}>
                  {STATUS_LABEL[getStatus(selectedPickList)]}
                </Badge>
              </div>
            </div>

            {/* Grid QR từng item */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {selectedPickList.items.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center ${
                    item.picked ? 'border-emerald-200 bg-emerald-50/60' : 'bg-background'
                  }`}
                >
                  <div className="bg-white p-2 rounded-lg border">
                    <QRCodeSVG
                      value={buildItemQRValue(selectedPickList, item)}
                      size={100}
                      level="M"
                    />
                  </div>
                  <div className="w-full">
                    <p className="font-semibold text-sm">{item.materialCode}</p>
                    <p className="text-xs text-muted-foreground leading-snug mb-2">{item.materialName}</p>
                    <div className="flex justify-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />{item.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="size-3" />{item.quantity} {item.unit}
                      </span>
                    </div>
                    {item.picked && (
                      <Badge className="mt-2 bg-emerald-100 text-emerald-700 text-xs">Đã pick</Badge>
                    )}
                  </div>
                  {/* In QR đơn từ trong modal all */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground h-7 px-2"
                    onClick={() => handlePrintSingleQR(selectedPickList, item)}
                  >
                    <Printer className="size-3 mr-1" />
                    In QR
                  </Button>
                </div>
              ))}
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setAllQROpen(false)}>Đóng</Button>
              <Button onClick={handlePrintAllQR}>
                <Printer className="size-4 mr-2" />
                In tất cả QR
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppShell>
  )
}

// ─── StatCard component ───────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName
}: {
  label: string
  value: string | number
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