"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { AlertTriangle, Bell, Package, Search, Download, AlertCircle, CheckCircle2 } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import type { Material } from "@/lib/types"
import { cn } from "@/lib/utils"
import { materialApi } from "@/api/material.api"
import { toast } from "sonner"
import { CurrencyDisplay } from "@/components/ui/currency-display"

// ── Mock data fallback (dùng khi API trả về rỗng) ─────────────
const MOCK_MATERIALS: Material[] = [
  { _id: 'm1', name: 'Bông gòn nhồi',          code: 'NVL-003', unit: 'kg',   currentStock: 0,   threshold: 20,  price: 45000,  supplier: { name: 'Công ty Bông Việt' } } as any,
  { _id: 'm2', name: 'Mắt thú nhồi bông 8mm',  code: 'PK-001',  unit: 'hộp',  currentStock: 15,  threshold: 50,  price: 32000,  supplier: { name: 'NCC Phụ kiện ABC' } } as any,
  { _id: 'm3', name: 'Mũi thú nhồi bông',      code: 'PK-002',  unit: 'cái',  currentStock: 80,  threshold: 100, price: 5000,   supplier: { name: 'NCC Phụ kiện ABC' } } as any,
  { _id: 'm4', name: 'Kim khâu số 3',           code: 'DC-001',  unit: 'cái',  currentStock: 0,   threshold: 100, price: 2000,   supplier: { name: 'Công ty Dụng cụ XYZ' } } as any,
  { _id: 'm5', name: 'Len wool Úc',             code: 'NVL-004', unit: 'cuộn', currentStock: 120, threshold: 100, price: 185000, supplier: { name: 'Công ty TNHH Len Việt' } } as any,
  { _id: 'm6', name: 'Chỉ thêu màu đỏ',        code: 'PK-010',  unit: 'cuộn', currentStock: 5,   threshold: 30,  price: 12000,  supplier: { name: 'NCC Phụ kiện ABC' } } as any,
  { _id: 'm7', name: 'Vải lót polyester',       code: 'NVL-010', unit: 'm',    currentStock: 0,   threshold: 50,  price: 28000,  supplier: { name: 'Công ty Vải VN' } } as any,
]

// ── Types ─────────────────────────────────────────────────────
interface RestockDraft {
  material: Material
  quantity: string
  note: string
}

interface ThresholdDraft {
  material: Material
  threshold: string
}

// ── Export CSV ────────────────────────────────────────────────
function exportAlertsCSV(materials: Material[]) {
  const headers = ['Mã', 'Tên nguyên liệu', 'Nhà cung cấp', 'Tồn kho', 'ĐVT', 'Mức tối thiểu', 'Trạng thái', 'Đơn giá']
  const rows = materials.map((m) => [
    m.code,
    m.name,
    m.supplier?.name ?? '',
    m.currentStock,
    m.unit,
    m.threshold,
    m.currentStock === 0 ? 'Nguy cấp' : 'Sắp hết',
    m.price,
  ])
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `canh-bao-ton-kho-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
}

// ── Field error ───────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
      <AlertCircle className="size-3" />{msg}
    </p>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function AlertsPage() {
  const [searchQuery, setSearchQuery]   = useState("")
  const [statusFilter, setStatusFilter] = useState<"All" | "Critical" | "Low Stock">("All")
  const [allMaterials, setAllMaterials] = useState<Material[]>([])
  const [isLoading, setIsLoading]       = useState(true)

  // restock modal
  const [restockItem, setRestockItem]   = useState<RestockDraft | null>(null)
  const [restockOpen, setRestockOpen]   = useState(false)
  const [restockError, setRestockError] = useState('')
  const [restockDone, setRestockDone]   = useState(false)

  // threshold modal
  const [thresholdItem, setThresholdItem]   = useState<ThresholdDraft | null>(null)
  const [thresholdOpen, setThresholdOpen]   = useState(false)
  const [thresholdError, setThresholdError] = useState('')
  const [thresholdDone, setThresholdDone]   = useState(false)

  // ── Fetch ──────────────────────────────────────────────────
  const fetchLowStock = useCallback(async (search?: string) => {
    setIsLoading(true)
    try {
      const response = await materialApi.getLowStockMaterials({ search, limit: 50, page: 1 })
      if (response.success && response.data.materials?.length > 0) {
        setAllMaterials(response.data.materials)
      } else {
        // fallback mock khi API trả rỗng
        const filtered = MOCK_MATERIALS.filter((m) =>
          !search || m.name.toLowerCase().includes(search.toLowerCase())
        )
        setAllMaterials(filtered)
      }
    } catch {
      // fallback mock khi API lỗi
      setAllMaterials(MOCK_MATERIALS)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchLowStock(searchQuery), 400)
    return () => clearTimeout(timer)
  }, [searchQuery, fetchLowStock])

  // ── Filter ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allMaterials.filter((m) => {
      if (statusFilter === "Critical")  return m.currentStock === 0
      if (statusFilter === "Low Stock") return m.currentStock > 0 && m.currentStock <= m.threshold
      return true
    })
  }, [allMaterials, statusFilter])

  const criticalCount  = allMaterials.filter((m) => m.currentStock === 0).length
  const lowStockCount  = allMaterials.filter((m) => m.currentStock > 0 && m.currentStock <= m.threshold).length

  // ── Helpers ────────────────────────────────────────────────
  // % tồn kho so với mức tối thiểu (>100% = đủ, 0% = hết)
  const stockPct = (m: Material) => {
    if (!m.threshold) return 100
    return Math.min(100, Math.round((m.currentStock / m.threshold) * 100))
  }

  const getStatusBadge = (m: Material) => {
    if (m.currentStock === 0) return <Badge className="bg-[#DC3545] text-white hover:bg-[#DC3545]/90">Nguy cấp</Badge>
    return <Badge className="bg-[#FFA500] text-white hover:bg-[#FFA500]/90">Sắp hết</Badge>
  }

  // ── Restock ────────────────────────────────────────────────
  const openRestock = (m: Material) => {
    setRestockItem({ material: m, quantity: '', note: '' })
    setRestockError('')
    setRestockDone(false)
    setRestockOpen(true)
  }

  const handleRestock = () => {
    if (!restockItem) return
    const qty = Number(restockItem.quantity)
    if (!restockItem.quantity || qty <= 0) { setRestockError('Vui lòng nhập số lượng > 0'); return }
    // TODO: gọi API tạo phiếu nhập
    toast.success(`Đã tạo yêu cầu nhập ${qty} ${restockItem.material.unit} ${restockItem.material.name}`)
    setRestockDone(true)
  }

  // ── Threshold ──────────────────────────────────────────────
  const openThreshold = (m: Material) => {
    setThresholdItem({ material: m, threshold: String(m.threshold ?? '') })
    setThresholdError('')
    setThresholdDone(false)
    setThresholdOpen(true)
  }

  const handleThreshold = () => {
    if (!thresholdItem) return
    const val = Number(thresholdItem.threshold)
    if (!thresholdItem.threshold || val < 0) { setThresholdError('Vui lòng nhập ngưỡng hợp lệ'); return }
    // cập nhật local
    setAllMaterials((prev) =>
      prev.map((m) => m._id === thresholdItem.material._id ? { ...m, threshold: val } : m)
    )
    // TODO: gọi API cập nhật threshold
    setThresholdDone(true)
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <AppShell title="Cảnh báo tồn kho" subtitle="Theo dõi nguyên vật liệu sắp hết và mức tồn kho nguy hiểm">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Cảnh báo tồn kho</h2>
            <p className="text-sm text-muted-foreground">Theo dõi nguyên vật liệu sắp hết và mức tồn kho nguy hiểm</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => exportAlertsCSV(filtered)}>
              <Download className="h-4 w-4" /> Xuất Excel
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => {
              // mở modal thiết lập — chọn NVL đầu tiên làm ví dụ
              if (filtered.length > 0) openThreshold(filtered[0])
            }}>
              <Bell className="h-4 w-4" /> Thiết lập cảnh báo
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Cảnh báo Khẩn cấp', value: criticalCount, color: 'text-[#DC3545]', bg: 'bg-[#FFEBEE]', iconColor: 'text-[#DC3545]' },
            { label: 'Cảnh báo Sắp hết',  value: lowStockCount, color: 'text-[#FFA500]', bg: 'bg-[#FFF3E0]', iconColor: 'text-[#FFA500]' },
            { label: 'Tổng cảnh báo',     value: allMaterials.length, color: 'text-foreground', bg: 'bg-[#F5F0EB]', iconColor: 'text-[#8B7355]' },
          ].map(({ label, value, color, bg, iconColor }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", bg)}>
                  <AlertTriangle className={cn("h-6 w-6", iconColor)} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className={cn("text-2xl font-bold", color)}>{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm nguyên liệu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                {(['All', 'Critical', 'Low Stock'] as const).map((f) => (
                  <Button
                    key={f}
                    variant={statusFilter === f ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(f)}
                    className={cn(
                      statusFilter === f && f === 'Critical' && 'bg-[#DC3545] hover:bg-[#DC3545]/90',
                      statusFilter === f && f === 'Low Stock' && 'bg-[#FFA500] hover:bg-[#FFA500]/90',
                    )}
                  >
                    {f === 'All' ? 'Tất cả' : f === 'Critical' ? 'Nguy cấp' : 'Sắp hết'}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nguyên liệu</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-40">Mức tồn kho</TableHead>
                  <TableHead className="text-right">Tồn hiện tại</TableHead>
                  <TableHead className="text-right">Mức tối thiểu</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      {Array(7).fill(0).map((__, j) => (
                        <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Không có cảnh báo nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m) => {
                    const pct = stockPct(m)
                    const isCritical = m.currentStock === 0
                    return (
                      <TableRow key={m._id}>
                        <TableCell>
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs text-muted-foreground">{m.code} · {m.supplier?.name}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(m)}</TableCell>

                        {/* [NEW] Progress bar */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  isCritical ? 'bg-[#DC3545]' : 'bg-[#FFA500]'
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground text-right">{pct}%</p>
                          </div>
                        </TableCell>

                        <TableCell className={cn(
                          "text-right font-medium",
                          isCritical ? "text-[#DC3545]" : "text-[#FFA500]"
                        )}>
                          {m.currentStock} {m.unit}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {m.threshold} {m.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          <CurrencyDisplay value={m.price} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {/* [NEW] Thiết lập ngưỡng */}
                            <Button
                              variant="ghost" size="sm"
                              className="text-xs text-muted-foreground"
                              onClick={() => openThreshold(m)}
                            >
                              <Bell className="size-3 mr-1" /> Ngưỡng
                            </Button>
                            {/* [NEW] Nhập hàng */}
                            <Button variant="outline" size="sm" onClick={() => openRestock(m)}>
                              Nhập hàng
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ── Restock Modal ── */}
      <Dialog open={restockOpen} onOpenChange={(o) => { setRestockOpen(o); if (!o) setRestockDone(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nhập hàng – {restockItem?.material.name}</DialogTitle>
            <DialogDescription>
              Tồn hiện tại: <strong>{restockItem?.material.currentStock} {restockItem?.material.unit}</strong> · Mức tối thiểu: <strong>{restockItem?.material.threshold} {restockItem?.material.unit}</strong>
            </DialogDescription>
          </DialogHeader>

          {restockDone ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle2 className="size-4 shrink-0" />
              Đã tạo yêu cầu nhập hàng thành công
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Gợi ý số lượng cần nhập */}
              {restockItem && restockItem.material.threshold > restockItem.material.currentStock && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                  Gợi ý: cần nhập thêm ít nhất{' '}
                  <strong>{restockItem.material.threshold - restockItem.material.currentStock} {restockItem.material.unit}</strong>{' '}
                  để đạt mức tối thiểu
                </div>
              )}

              <div className="space-y-2">
                <Label>Số lượng cần nhập <span className="text-destructive">*</span></Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    placeholder="Nhập số lượng..."
                    value={restockItem?.quantity ?? ''}
                    onChange={(e) => {
                      setRestockItem((prev) => prev ? { ...prev, quantity: e.target.value } : prev)
                      setRestockError('')
                    }}
                    className={restockError ? 'border-destructive' : ''}
                    min={1}
                  />
                  <span className="text-sm text-muted-foreground shrink-0">{restockItem?.material.unit}</span>
                </div>
                <FieldError msg={restockError} />
              </div>

              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea
                  placeholder="Ghi chú thêm cho yêu cầu nhập hàng..."
                  rows={2}
                  value={restockItem?.note ?? ''}
                  onChange={(e) => setRestockItem((prev) => prev ? { ...prev, note: e.target.value } : prev)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm p-3 bg-muted/50 rounded-lg">
                <div><span className="text-muted-foreground">Nhà cung cấp:</span> <strong>{restockItem?.material.supplier?.name}</strong></div>
                <div><span className="text-muted-foreground">Đơn giá:</span> <strong><CurrencyDisplay value={restockItem?.material.price ?? 0} /></strong></div>
              </div>
            </div>
          )}

          <DialogFooter>
            {restockDone ? (
              <Button variant="outline" onClick={() => setRestockOpen(false)}>Đóng</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setRestockOpen(false)}>Hủy</Button>
                <Button onClick={handleRestock}>Tạo yêu cầu nhập</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Threshold Modal ── */}
      <Dialog open={thresholdOpen} onOpenChange={(o) => { setThresholdOpen(o); if (!o) setThresholdDone(false) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Thiết lập ngưỡng cảnh báo</DialogTitle>
            <DialogDescription>
              {thresholdItem?.material.name} · Ngưỡng hiện tại: <strong>{thresholdItem?.material.threshold} {thresholdItem?.material.unit}</strong>
            </DialogDescription>
          </DialogHeader>

          {thresholdDone ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle2 className="size-4 shrink-0" />
              Đã cập nhật ngưỡng cảnh báo thành công
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Ngưỡng cảnh báo mới <span className="text-destructive">*</span></Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    placeholder="Nhập ngưỡng..."
                    value={thresholdItem?.threshold ?? ''}
                    onChange={(e) => {
                      setThresholdItem((prev) => prev ? { ...prev, threshold: e.target.value } : prev)
                      setThresholdError('')
                    }}
                    className={thresholdError ? 'border-destructive' : ''}
                    min={0}
                  />
                  <span className="text-sm text-muted-foreground shrink-0">{thresholdItem?.material.unit}</span>
                </div>
                <FieldError msg={thresholdError} />
                <p className="text-xs text-muted-foreground">
                  Hệ thống sẽ cảnh báo khi tồn kho xuống dưới mức này
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            {thresholdDone ? (
              <Button variant="outline" onClick={() => setThresholdOpen(false)}>Đóng</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setThresholdOpen(false)}>Hủy</Button>
                <Button onClick={handleThreshold}>Lưu ngưỡng</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}