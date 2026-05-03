'use client'

import { useState, useMemo, useRef } from 'react'
import { AppShell } from '@/components/app-shell'
import {
  Search,
  QrCode,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Package,
  History,
  ChevronRight,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  lotItems,
  lotMovementHistory,
  finishedGoodsLocations,
  type LotItem,
  type FinishedGoodsLocation,
  type QCStatus,
} from '@/lib/finished-goods-mock-data'
import { cn } from '@/lib/utils'

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
}

function getDaysUntilExpiry(expiryDate: string | null): number {
  if (!expiryDate) return 999 // Far future if no expiry
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function getUsagePct(loc: FinishedGoodsLocation) {
  return Math.round((loc.used / loc.capacity) * 100)
}

const QC_BADGE: Record<QCStatus, { label: string; className: string; icon: React.ReactNode }> = {
  passed: { label: 'Đã QC', className: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="size-3" /> },
  pending: { label: 'Chờ QC', className: 'bg-amber-100 text-amber-700', icon: <Clock className="size-3" /> },
  failed: { label: 'Không đạt', className: 'bg-red-100 text-red-700', icon: <AlertTriangle className="size-3" /> },
}

const ACTION_LABEL: Record<string, string> = {
  created: 'Tạo lô',
  moved: 'Di chuyển',
  assigned: 'Gắn vị trí',
  exported: 'Xuất kho',
}

const ACTION_COLOR: Record<string, string> = {
  created: 'bg-muted-foreground',
  moved: 'bg-amber-500',
  assigned: 'bg-blue-500',
  exported: 'bg-emerald-500',
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function LotLocationPage() {
  const [query, setQuery] = useState('')
  const [selectedLot, setSelectedLot] = useState<LotItem | null>(null)
  const [selectedShelf, setSelectedShelf] = useState<FinishedGoodsLocation | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const scanInputRef = useRef<HTMLInputElement>(null)

  /* Filter lots by search query */
  const filteredLots = useMemo(() => {
    const q = query.toLowerCase()
    return lotItems.filter(
      l =>
        l.code.toLowerCase().includes(q) ||
        l.productName.toLowerCase().includes(q),
    )
  }, [query])

  /* Available shelves (not 100% full) */
  const availableShelves = finishedGoodsLocations.filter(
    loc => loc.used / loc.capacity < 1,
  )

  /* History for selected lot */
  const lotHistory = selectedLot
    ? lotMovementHistory.filter(h => h.lotId === selectedLot.id)
    : []

  function handleSelectLot(lot: LotItem) {
    setSelectedLot(lot)
    setSelectedShelf(null)
  }

  function handleConfirmAssign() {
    // In a real app: call API here
    setConfirmOpen(false)
    setSelectedShelf(null)
  }

  return (
    <AppShell
      title="Gắn vị trí lô hàng"
      subtitle="Tìm kiếm lô hàng và gán vào vị trí kệ lưu trữ"
    >
      <Tabs defaultValue="assign" className="space-y-6">
        <TabsList>
          <TabsTrigger value="assign">
            <MapPin className="mr-1.5 size-4" />
            Gắn vị trí
          </TabsTrigger>
          <TabsTrigger value="by-lot">
            <Package className="mr-1.5 size-4" />
            Xem theo lô
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-1.5 size-4" />
            Lịch sử di chuyển
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Gắn vị trí ─────────────────────────────────────────── */}
        <TabsContent value="assign">
          <div className="grid gap-6 lg:grid-cols-2">

            {/* LEFT: Search + Lot list */}
            <div className="space-y-4">
              {/* Search bar */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Tìm kiếm lô hàng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        placeholder="Mã lô hoặc tên sản phẩm..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                      />
                    </div>
                    {/* QR Scan */}
                    <Dialog open={scanOpen} onOpenChange={setScanOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon" title="Quét mã QR">
                          <QrCode className="size-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Quét mã QR / Barcode</DialogTitle>
                          <DialogDescription>
                            Hướng camera vào mã QR hoặc nhập thủ công mã lô bên dưới.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-4 py-4">
                          {/* Placeholder scanner frame */}
                          <div className="flex size-48 items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-muted">
                            <QrCode className="size-16 text-muted-foreground/50" />
                          </div>
                          <Input
                            ref={scanInputRef}
                            placeholder="Hoặc nhập mã lô thủ công..."
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                setQuery((e.target as HTMLInputElement).value)
                                setScanOpen(false)
                              }
                            }}
                          />
                        </div>
                        <DialogFooter>
                          <Button variant="ghost" onClick={() => setScanOpen(false)}>Đóng</Button>
                          <Button onClick={() => {
                            if (scanInputRef.current?.value) {
                              setQuery(scanInputRef.current.value)
                            }
                            setScanOpen(false)
                          }}>
                            Tìm kiếm
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Lot results */}
                  <div className="space-y-2">
                    {filteredLots.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        Không tìm thấy lô hàng nào.
                      </p>
                    ) : (
                      filteredLots.map(lot => {
                        const qc = QC_BADGE[lot.qcStatus]
                        const isSelected = selectedLot?.id === lot.id
                        return (
                          <button
                            key={lot.id}
                            onClick={() => handleSelectLot(lot)}
                            className={cn(
                              'w-full rounded-lg border p-3 text-left transition-all hover:bg-muted/50',
                              isSelected
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                : 'border-border',
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-xs font-semibold text-blue-700">
                                  FG
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{lot.code}</p>
                                  <p className="text-xs text-muted-foreground">{lot.productName} · {lot.quantity} {lot.unit}</p>
                                </div>
                              </div>
                              <Badge variant="secondary" className={cn('flex items-center gap-1 text-xs', qc.className)}>
                                {qc.icon}
                                {qc.label}
                              </Badge>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Current location card */}
              {selectedLot && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">
                      Vị trí hiện tại · {selectedLot.code}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedLot.currentLocationId ? (
                      <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold text-white">
                          {selectedLot.currentLocationId}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-emerald-800">{selectedLot.currentLocationLabel}</p>
                          <p className="text-xs text-emerald-600">
                            Gắn lúc {formatDateTime(selectedLot.assignedAt!)} · bởi {selectedLot.assignedBy}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                        <MapPin className="size-4" />
                        Lô hàng chưa được gắn vị trí
                      </div>
                    )}

                    {/* Lot detail */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <DetailRow label="NSX" value={formatDate(selectedLot.manufactureDate)} />
                      <DetailRow label="HSD" value={formatDate(selectedLot.expiryDate)} warn={getDaysUntilExpiry(selectedLot.expiryDate) <= 30} />
                      <DetailRow label="Số lượng" value={`${selectedLot.quantity} ${selectedLot.unit}`} />
                      <DetailRow label="Trạng thái QC" value={QC_BADGE[selectedLot.qcStatus].label} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* RIGHT: Shelf picker + History */}
            {selectedLot ? (
              <div className="space-y-4">
                {/* Shelf picker */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Chọn kệ đích</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {availableShelves.map(loc => {
                      const pct = getUsagePct(loc)
                      const isSel = selectedShelf?.id === loc.id
                      const barColor =
                        pct >= 80 ? 'bg-amber-500' : pct >= 50 ? 'bg-primary' : 'bg-emerald-500'
                      const dotColor =
                        pct >= 80 ? 'bg-amber-500' : pct >= 50 ? 'bg-primary' : 'bg-emerald-500'

                      return (
                        <button
                          key={loc.id}
                          onClick={() => setSelectedShelf(isSel ? null : loc)}
                          className={cn(
                            'w-full rounded-lg border p-3 text-left transition-all hover:bg-muted/50',
                            isSel
                              ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200'
                              : 'border-border',
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={cn('size-2.5 rounded-full shrink-0', dotColor)} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">
                                  Khu {loc.zone} - Kệ {loc.shelf} · {loc.id}
                                </p>
                                <span className="text-xs text-muted-foreground ml-2">{pct}%</span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{loc.description}</p>
                              <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full transition-all', barColor)}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                            {isSel && <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />}
                          </div>
                        </button>
                      )
                    })}

                    {/* Confirm button */}
                    <div className="pt-2">
                      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                        <DialogTrigger asChild>
                          <Button
                            className="w-full"
                            disabled={!selectedShelf}
                          >
                            <CheckCircle2 className="mr-2 size-4" />
                            Xác nhận gắn vị trí
                            {selectedShelf && (
                              <>
                                <ChevronRight className="mx-1 size-4 opacity-50" />
                                {selectedShelf.id}
                              </>
                            )}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Xác nhận gắn vị trí</DialogTitle>
                            <DialogDescription>
                              Kiểm tra thông tin trước khi xác nhận.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-2">
                            <ConfirmRow
                              icon={<Package className="size-4" />}
                              label="Lô hàng"
                              value={`${selectedLot.code} – ${selectedLot.productName}`}
                            />
                            <ConfirmRow
                              icon={<ArrowRight className="size-4" />}
                              label="Từ vị trí"
                              value={selectedLot.currentLocationLabel ?? 'Chưa có vị trí'}
                            />
                            <ConfirmRow
                              icon={<MapPin className="size-4" />}
                              label="Đến vị trí"
                              value={selectedShelf ? `Khu ${selectedShelf.zone} - Kệ ${selectedShelf.shelf} (${selectedShelf.id})` : '—'}
                            />
                          </div>
                          <DialogFooter>
                            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
                              Hủy
                            </Button>
                            <Button onClick={handleConfirmAssign}>
                              Xác nhận
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>

                {/* Movement history for selected lot */}
                {lotHistory.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold">
                        Lịch sử di chuyển · {selectedLot.code}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative pl-4">
                        {/* Vertical line */}
                        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

                        <div className="space-y-4">
                          {lotHistory.map(hist => (
                            <div key={hist.id} className="flex gap-3">
                              <div
                                className={cn(
                                  'relative z-10 mt-1 size-2.5 shrink-0 rounded-full',
                                  ACTION_COLOR[hist.action],
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-medium">
                                      {ACTION_LABEL[hist.action]}
                                      {hist.fromLocation && hist.toLocation && (
                                        <span className="font-normal text-muted-foreground">
                                          {' · '}{hist.fromLocation} <ArrowRight className="inline size-3" /> {hist.toLocation}
                                        </span>
                                      )}
                                      {!hist.fromLocation && hist.toLocation && (
                                        <span className="font-normal text-muted-foreground">
                                          {' · '}{hist.toLocation}
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {hist.note} · {hist.performedBy}
                                    </p>
                                  </div>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatDateTime(hist.timestamp)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                <div>
                  <MapPin className="mx-auto mb-3 size-8 opacity-30" />
                  <p className="text-sm">Chọn một lô hàng để xem vị trí và gắn kệ</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab 2: Xem theo lô ────────────────────────────────────────── */}
        <TabsContent value="by-lot">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Danh sách lô hàng theo vị trí</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {lotItems.map(lot => {
                  const qc = QC_BADGE[lot.qcStatus]
                  return (
                    <div key={lot.id} className="flex items-center gap-4 py-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-semibold text-blue-700">
                        FG
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{lot.code}</p>
                        <p className="text-xs text-muted-foreground">{lot.productName} · {lot.quantity} {lot.unit}</p>
                      </div>
                      <Badge variant="secondary" className={cn('flex items-center gap-1 text-xs shrink-0', qc.className)}>
                        {qc.icon}
                        {qc.label}
                      </Badge>
                      <div className="text-right shrink-0">
                        {lot.currentLocationLabel ? (
                          <div className="flex items-center gap-1.5 text-sm text-emerald-700">
                            <MapPin className="size-3.5" />
                            {lot.currentLocationLabel}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Chưa gắn vị trí</span>
                        )}
                        <p className="text-xs text-muted-foreground">
                          HSD: {formatDate(lot.expiryDate)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Lịch sử di chuyển ──────────────────────────────────── */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Toàn bộ lịch sử di chuyển</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-5">
                <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
                <div className="space-y-5">
                  {lotMovementHistory.map(hist => {
                    const lot = lotItems.find(l => l.id === hist.lotId)
                    return (
                      <div key={hist.id} className="flex gap-3">
                        <div
                          className={cn(
                            'relative z-10 mt-1.5 size-3 shrink-0 rounded-full',
                            ACTION_COLOR[hist.action],
                          )}
                        />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-1">
                            <div>
                              <span className="text-sm font-medium">{ACTION_LABEL[hist.action]}</span>
                              {' · '}
                              <span className="text-sm text-muted-foreground">
                                {lot?.code ?? hist.lotId}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">{formatDateTime(hist.timestamp)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {lot?.productName} · {hist.note}
                          </p>
                          {hist.fromLocation && hist.toLocation && (
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span>{hist.fromLocation}</span>
                              <ArrowRight className="size-3" />
                              <span>{hist.toLocation}</span>
                            </div>
                          )}
                          <p className="mt-0.5 text-xs text-muted-foreground">Bởi: {hist.performedBy}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  )
}

/* ─── Tiny sub-components ────────────────────────────────────────────────── */

function DetailRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <p className={cn('font-medium', warn ? 'text-red-600' : 'text-foreground')}>{value}</p>
    </div>
  )
}

function ConfirmRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}