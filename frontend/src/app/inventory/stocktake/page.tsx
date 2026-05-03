'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import {
  Clipboard, Plus, Search, Play, Pause, CheckCircle2,
  AlertTriangle, FileSignature, Calculator, AlertCircle, X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

// ── Types ─────────────────────────────────────────────────────
type SessionStatus = 'draft' | 'in_progress' | 'completed' | 'approved'

interface StocktakeSession {
  id: string
  code: string
  type: 'cycle' | 'physical'
  zone: string
  totalItems: number
  countedItems: number
  discrepancies: number
  createdBy: string
  createdAt: Date
  status: SessionStatus
  adjustReason?: string
}

interface StocktakeItem {
  id: string
  itemCode: string
  itemName: string
  location: string
  systemQty: number
  countedQty: number | null
  unit: string
  note: string
}

// ── Initial data ──────────────────────────────────────────────
const INITIAL_SESSIONS: StocktakeSession[] = [
  {
    id: '1', code: 'KK-2024-015', type: 'cycle', zone: 'A - Nguyên liệu',
    totalItems: 25, countedItems: 20, discrepancies: 3,
    createdBy: 'Nguyễn Văn Kho', createdAt: new Date(Date.now() - 86400000),
    status: 'in_progress'
  },
  {
    id: '2', code: 'KK-2024-014', type: 'physical', zone: 'Toàn kho',
    totalItems: 150, countedItems: 150, discrepancies: 8,
    createdBy: 'Trần Thị Kho', createdAt: new Date(Date.now() - 7 * 86400000),
    status: 'completed'
  }
]

const INITIAL_ITEMS: StocktakeItem[] = [
  { id: '1', itemCode: 'NVL-001', itemName: 'Len cotton cao cấp',     location: 'A1-01', systemQty: 250, countedQty: 248, unit: 'cuộn', note: '' },
  { id: '2', itemCode: 'NVL-002', itemName: 'Len acrylic',            location: 'A1-02', systemQty: 180, countedQty: 180, unit: 'cuộn', note: '' },
  { id: '3', itemCode: 'NVL-003', itemName: 'Bông gòn nhồi',          location: 'A2-01', systemQty: 50,  countedQty: 45,  unit: 'kg',   note: 'Cần kiểm tra lại' },
  { id: '4', itemCode: 'PK-001',  itemName: 'Mắt thú nhồi bông 8mm', location: 'B1-01', systemQty: 500, countedQty: null, unit: 'hộp', note: '' },
  { id: '5', itemCode: 'PK-002',  itemName: 'Mũi thú nhồi bông',     location: 'B1-02', systemQty: 200, countedQty: null, unit: 'cái', note: '' },
]

// ── Constants ─────────────────────────────────────────────────
const STATUS_CONFIG: Record<SessionStatus, { label: string; color: string }> = {
  draft:       { label: 'Nháp',       color: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'Đang kiểm', color: 'bg-blue-100 text-blue-700' },
  completed:   { label: 'Hoàn thành', color: 'bg-amber-100 text-amber-700' },
  approved:    { label: 'Đã duyệt',   color: 'bg-emerald-100 text-emerald-700' },
}

// ── Helper ────────────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-xs text-destructive flex items-center gap-1 mt-1"><AlertCircle className="size-3" />{msg}</p>
}

// ── Main ──────────────────────────────────────────────────────
export default function StocktakePage() {
  const [sessions, setSessions]   = useState<StocktakeSession[]>(INITIAL_SESSIONS)
  const [items, setItems]         = useState<StocktakeItem[]>(INITIAL_ITEMS)
  const [searchTerm, setSearchTerm] = useState('')

  // selected session for detail modal
  const [selectedSession, setSelectedSession] = useState<StocktakeSession | null>(null)
  const [detailOpen, setDetailOpen]           = useState(false)

  // approve sub-dialog
  const [approveOpen, setApproveOpen]   = useState(false)
  const [adjustReason, setAdjustReason] = useState('')
  const [reasonError, setReasonError]   = useState(false)
  const [approveDone, setApproveDone]   = useState(false)

  // create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createType, setCreateType] = useState('')
  const [createZone, setCreateZone] = useState('')
  const [createNote, setCreateNote] = useState('')
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({})
  const [createDone, setCreateDone] = useState(false)

  // luôn lấy session mới nhất
  const currentSession = sessions.find((s) => s.id === selectedSession?.id) ?? selectedSession

  // ── computed ──────────────────────────────────────────────
  const discrepancyCount = (sessionItems: StocktakeItem[]) =>
    sessionItems.filter((i) => i.countedQty !== null && i.countedQty !== i.systemQty).length

  const countedCount = (sessionItems: StocktakeItem[]) =>
    sessionItems.filter((i) => i.countedQty !== null).length

  const stats = {
    inProgress: sessions.filter((s) => s.status === 'in_progress').length,
    completed:  sessions.filter((s) => s.status === 'completed').length,
    discrepancies: sessions.reduce((sum, s) => sum + s.discrepancies, 0),
    approved:   sessions.filter((s) => s.status === 'approved').length,
  }

  const filtered = sessions.filter(
    (s) =>
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.zone.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ── Actions ───────────────────────────────────────────────

  // Nhập SL thực tế
  const updateCountedQty = (itemId: string, value: string) => {
    const qty = value === '' ? null : Number(value)
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, countedQty: qty } : i))
  }

  const updateNote = (itemId: string, value: string) => {
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, note: value } : i))
  }

  // Hoàn thành kiểm kê
  const handleComplete = () => {
    if (!currentSession) return
    const counted   = countedCount(items)
    const discrepancies = discrepancyCount(items)
    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSession.id
          ? { ...s, status: 'completed', countedItems: counted, discrepancies }
          : s
      )
    )
    setDetailOpen(false)
  }

  // Mở approve dialog
  const openApprove = () => {
    setAdjustReason('')
    setReasonError(false)
    setApproveDone(false)
    setApproveOpen(true)
  }

  // Xác nhận duyệt
  const handleApprove = () => {
    if (!adjustReason.trim()) { setReasonError(true); return }
    if (!currentSession) return
    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSession.id
          ? { ...s, status: 'approved', adjustReason }
          : s
      )
    )
    setApproveDone(true)
  }

  // Tạo phiên mới
  const validateCreate = () => {
    const errs: Record<string, string> = {}
    if (!createType) errs.type = 'Vui lòng chọn loại kiểm kê'
    if (!createZone) errs.zone = 'Vui lòng chọn khu vực'
    return errs
  }

  const handleCreate = () => {
    const errs = validateCreate()
    if (Object.keys(errs).length) { setCreateErrors(errs); return }

    const zoneLabels: Record<string, string> = {
      all: 'Toàn kho', A: 'Zone A - Nguyên liệu',
      B: 'Zone B - Phụ kiện', C: 'Zone C - Dụng cụ', D: 'Zone D - Thành phẩm',
    }
    const newSession: StocktakeSession = {
      id:          Date.now().toString(),
      code:        `KK-2024-${String(sessions.length + 16).padStart(3, '0')}`,
      type:        createType as 'cycle' | 'physical',
      zone:        zoneLabels[createZone] ?? createZone,
      totalItems:  0,
      countedItems: 0,
      discrepancies: 0,
      createdBy:   'Dương Văn Minh',
      createdAt:   new Date(),
      status:      'draft',
    }
    setSessions((prev) => [newSession, ...prev])
    setCreateDone(true)
  }

  const openCreate = () => {
    setCreateType('')
    setCreateZone('')
    setCreateNote('')
    setCreateErrors({})
    setCreateDone(false)
    setCreateOpen(true)
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <AppShell title="Kiểm kê Kho" subtitle="Cycle Count và Physical Count">
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Đang kiểm kê',         value: stats.inProgress,    bg: 'bg-blue-100',    Icon: Play,         ic: 'text-blue-600' },
            { label: 'Chờ duyệt',            value: stats.completed,     bg: 'bg-amber-100',   Icon: Clipboard,    ic: 'text-amber-600' },
            { label: 'Chênh lệch phát hiện', value: stats.discrepancies, bg: 'bg-red-100',     Icon: AlertTriangle, ic: 'text-red-600' },
            { label: 'Đã duyệt tháng này',   value: stats.approved,      bg: 'bg-emerald-100', Icon: CheckCircle2, ic: 'text-emerald-600' },
          ].map(({ label, value, bg, Icon, ic }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg ${bg} p-3`}><Icon className={`size-5 ${ic}`} /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sessions table */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-semibold">Phiên kiểm kê</CardTitle>
              <div className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button onClick={openCreate}>
                  <Plus className="size-4 mr-2" /> Tạo phiên kiểm kê
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã phiên</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Khu vực</TableHead>
                    <TableHead>Người tạo</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead>Tiến độ</TableHead>
                    <TableHead>Chênh lệch</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground text-sm">
                        Không có phiên kiểm kê nào
                      </TableCell>
                    </TableRow>
                  ) : filtered.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.code}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {session.type === 'cycle' ? 'Cycle Count' : 'Physical Count'}
                        </Badge>
                      </TableCell>
                      <TableCell>{session.zone}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{session.createdBy}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(session.createdAt, 'dd/MM/yyyy', { locale: vi })}
                      </TableCell>
                      <TableCell>
                        {session.totalItems > 0 ? (
                          <div className="space-y-1 w-32">
                            <div className="flex justify-between text-xs">
                              <span>{session.countedItems}/{session.totalItems}</span>
                              <span>{Math.round((session.countedItems / session.totalItems) * 100)}%</span>
                            </div>
                            <Progress value={(session.countedItems / session.totalItems) * 100} className="h-2" />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Chưa bắt đầu</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {session.discrepancies > 0
                          ? <Badge variant="destructive">{session.discrepancies} items</Badge>
                          : <Badge variant="secondary">0</Badge>
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_CONFIG[session.status].color}>
                          {STATUS_CONFIG[session.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => { setSelectedSession(session); setDetailOpen(true) }}
                        >
                          {session.status === 'in_progress' ? (
                            <><Play className="size-4 mr-1" />Tiếp tục</>
                          ) : session.status === 'draft' ? (
                            <><Play className="size-4 mr-1" />Bắt đầu</>
                          ) : 'Xem chi tiết'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Detail Modal ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết kiểm kê {currentSession?.code}</DialogTitle>
            <DialogDescription>
              {currentSession?.zone} · {currentSession?.type === 'cycle' ? 'Cycle Count' : 'Physical Count'}
            </DialogDescription>
          </DialogHeader>

          {currentSession && (
            <>
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3 py-2">
                {[
                  { label: 'Đã kiểm',    value: `${countedCount(items)}/${items.length}`, color: 'text-blue-600' },
                  { label: 'Chênh lệch', value: discrepancyCount(items),                  color: discrepancyCount(items) > 0 ? 'text-red-600' : 'text-emerald-600' },
                  { label: 'Trạng thái', value: STATUS_CONFIG[currentSession.status].label, color: 'text-foreground' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Items table */}
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Mã SP</TableHead>
                      <TableHead>Tên sản phẩm</TableHead>
                      <TableHead>Vị trí</TableHead>
                      <TableHead className="text-right">SL Hệ thống</TableHead>
                      <TableHead className="text-right w-32">SL Thực tế</TableHead>
                      <TableHead className="text-right">Chênh lệch</TableHead>
                      <TableHead className="w-36">Ghi chú</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const diff = item.countedQty !== null ? item.countedQty - item.systemQty : null
                      const hasDiscrepancy = diff !== null && diff !== 0
                      const isEditable = currentSession.status === 'in_progress' || currentSession.status === 'draft'

                      return (
                        <TableRow key={item.id} className={hasDiscrepancy ? 'bg-red-50' : ''}>
                          <TableCell className="font-medium">{item.itemCode}</TableCell>
                          <TableCell>{item.itemName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{item.location}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{item.systemQty} {item.unit}</TableCell>

                          {/* [FIX] Nhập SL thực tế */}
                          <TableCell className="text-right">
                            {isEditable ? (
                              <Input
                                type="number"
                                className="w-24 h-8 text-right ml-auto"
                                placeholder="Nhập SL"
                                value={item.countedQty ?? ''}
                                onChange={(e) => updateCountedQty(item.id, e.target.value)}
                              />
                            ) : (
                              <span>{item.countedQty ?? '—'} {item.countedQty !== null ? item.unit : ''}</span>
                            )}
                          </TableCell>

                          {/* [FIX] Tự tính chênh lệch */}
                          <TableCell className="text-right">
                            {diff === null ? (
                              <span className="text-muted-foreground text-sm">—</span>
                            ) : diff === 0 ? (
                              <CheckCircle2 className="size-4 text-emerald-500 inline" />
                            ) : (
                              <span className={`font-semibold ${diff < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {diff > 0 ? '+' : ''}{diff}
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            {isEditable ? (
                              <Input
                                className="w-32 h-8 text-xs"
                                placeholder="Ghi chú..."
                                value={item.note}
                                onChange={(e) => updateNote(item.id, e.target.value)}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">{item.note || '—'}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Footer actions */}
              <DialogFooter className="gap-2 flex-wrap">
                {(currentSession.status === 'in_progress' || currentSession.status === 'draft') && (
                  <>
                    <Button variant="outline">
                      <Pause className="size-4 mr-2" /> Tạm dừng
                    </Button>
                    <Button
                      onClick={handleComplete}
                      disabled={countedCount(items) === 0}
                    >
                      <CheckCircle2 className="size-4 mr-2" /> Hoàn thành kiểm kê
                    </Button>
                  </>
                )}

                {currentSession.status === 'completed' && (
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => { setDetailOpen(false); openApprove() }}
                  >
                    <Calculator className="size-4 mr-2" /> Điều chỉnh & Duyệt
                  </Button>
                )}

                {currentSession.status === 'approved' && (
                  <div className="flex items-center gap-2 text-emerald-600 text-sm">
                    <CheckCircle2 className="size-4" />
                    Phiên kiểm kê đã được duyệt
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Approve Dialog ── */}
      <Dialog open={approveOpen} onOpenChange={(o) => { setApproveOpen(o); if (!o) setApproveDone(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Điều chỉnh & Duyệt kiểm kê</DialogTitle>
            <DialogDescription>
              Xác nhận điều chỉnh {currentSession?.discrepancies} mặt hàng có chênh lệch — {currentSession?.code}
            </DialogDescription>
          </DialogHeader>

          {approveDone ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle2 className="size-4 shrink-0" />
              Đã duyệt và điều chỉnh tồn kho thành công
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Tóm tắt chênh lệch */}
              {currentSession && currentSession.discrepancies > 0 && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm font-medium text-red-700 mb-2">Tóm tắt chênh lệch</p>
                  <div className="space-y-1">
                    {items.filter((i) => i.countedQty !== null && i.countedQty !== i.systemQty).map((i) => (
                      <div key={i.id} className="flex justify-between text-xs text-red-600">
                        <span>{i.itemName}</span>
                        <span className="font-medium">
                          {i.systemQty} → {i.countedQty} {i.unit}
                          ({(i.countedQty! - i.systemQty) > 0 ? '+' : ''}{i.countedQty! - i.systemQty})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lý do bắt buộc */}
              <div className="space-y-2">
                <Label>
                  Lý do điều chỉnh <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  placeholder="Nhập lý do điều chỉnh chênh lệch..."
                  rows={3}
                  value={adjustReason}
                  onChange={(e) => { setAdjustReason(e.target.value); setReasonError(false) }}
                  className={reasonError ? 'border-destructive' : ''}
                />
                <FieldError msg={reasonError ? 'Vui lòng nhập lý do điều chỉnh' : undefined} />
              </div>

              {/* Chữ ký */}
              <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
                <FileSignature className="size-4 text-primary shrink-0" />
                <span className="text-sm">Ký xác nhận điều chỉnh tồn kho bằng chữ ký điện tử</span>
              </div>
            </div>
          )}

          <DialogFooter>
            {approveDone ? (
              <Button variant="outline" onClick={() => setApproveOpen(false)}>Đóng</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setApproveOpen(false)}>Hủy</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleApprove}>
                  Xác nhận điều chỉnh
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setCreateDone(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo phiên kiểm kê mới</DialogTitle>
            <DialogDescription>Chọn loại kiểm kê và khu vực cần kiểm</DialogDescription>
          </DialogHeader>

          {createDone ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle2 className="size-4 shrink-0" />
              Phiên kiểm kê đã được tạo và xuất hiện trong danh sách
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Loại kiểm kê <span className="text-destructive">*</span></Label>
                <Select value={createType} onValueChange={(v) => { setCreateType(v); setCreateErrors((p) => ({ ...p, type: '' })) }}>
                  <SelectTrigger className={createErrors.type ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Chọn loại kiểm kê" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cycle">Cycle Count (Kiểm định kỳ)</SelectItem>
                    <SelectItem value="physical">Physical Count (Kiểm toàn bộ)</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError msg={createErrors.type} />
              </div>

              <div className="space-y-2">
                <Label>Khu vực kiểm kê <span className="text-destructive">*</span></Label>
                <Select value={createZone} onValueChange={(v) => { setCreateZone(v); setCreateErrors((p) => ({ ...p, zone: '' })) }}>
                  <SelectTrigger className={createErrors.zone ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Chọn khu vực" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toàn kho</SelectItem>
                    <SelectItem value="A">Zone A - Nguyên liệu</SelectItem>
                    <SelectItem value="B">Zone B - Phụ kiện</SelectItem>
                    <SelectItem value="C">Zone C - Dụng cụ</SelectItem>
                    <SelectItem value="D">Zone D - Thành phẩm</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError msg={createErrors.zone} />
              </div>

              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea
                  placeholder="Ghi chú cho phiên kiểm kê..."
                  value={createNote}
                  onChange={(e) => setCreateNote(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {createDone ? (
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Đóng</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button>
                <Button onClick={handleCreate}>Tạo phiên kiểm kê</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}