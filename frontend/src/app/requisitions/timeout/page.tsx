'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/app-shell'
import {
  Clock, AlertTriangle, User, XCircle, RotateCcw,
  Eye, RefreshCw, PlusCircle, History
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { format, formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────
interface TimeoutHistory {
  date: Date
  code: string
  reason: string
}

interface TimeoutRequisition {
  id: string
  code: string
  staffName: string
  staffId: string
  department: string
  materials: { name: string; quantity: number; unit: string }[]
  createdAt: Date
  timeoutAt: Date
  status: 'timeout' | 'near_timeout'
  timeoutCount: number
  timeoutHistory: TimeoutHistory[]
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const INITIAL_DATA: TimeoutRequisition[] = [
  {
    id: '1',
    code: 'REQ-2024-008',
    staffName: 'Nguyễn Văn A',
    staffId: 'NV001',
    department: 'Sản xuất',
    materials: [
      { name: 'Len cotton cao cấp', quantity: 30, unit: 'cuộn' },
      { name: 'Chỉ may trắng', quantity: 10, unit: 'cuộn' },
    ],
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    timeoutAt: new Date(Date.now() - 30 * 60 * 1000),
    status: 'timeout',
    timeoutCount: 2,
    timeoutHistory: [
      { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), code: 'REQ-2024-003', reason: 'Không lấy hàng đúng giờ' },
      { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), code: 'REQ-2024-001', reason: 'Hết ca làm việc' },
    ],
  },
  {
    id: '2',
    code: 'REQ-2024-012',
    staffName: 'Trần Thị B',
    staffId: 'NV002',
    department: 'Sản xuất',
    materials: [{ name: 'Bông gòn nhồi', quantity: 15, unit: 'kg' }],
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    timeoutAt: new Date(Date.now() + 25 * 60 * 1000),
    status: 'near_timeout',
    timeoutCount: 0,
    timeoutHistory: [],
  },
  {
    id: '3',
    code: 'REQ-2024-015',
    staffName: 'Lê Văn C',
    staffId: 'NV003',
    department: 'Hoàn thiện',
    materials: [
      { name: 'Mút xốp PE 5cm', quantity: 20, unit: 'tấm' },
      { name: 'Keo dán vải', quantity: 5, unit: 'lọ' },
      { name: 'Dây kéo 30cm', quantity: 100, unit: 'cái' },
    ],
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    timeoutAt: new Date(Date.now() + 8 * 60 * 1000),
    status: 'near_timeout',
    timeoutCount: 1,
    timeoutHistory: [
      { date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), code: 'REQ-2024-007', reason: 'Bận họp đột xuất' },
    ],
  },
]

// ─── Countdown Timer ──────────────────────────────────────────────────────────
function CountdownBadge({ timeoutAt, status }: { timeoutAt: Date; status: string }) {
  const [remaining, setRemaining] = useState('')
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    function update() {
      const diff = timeoutAt.getTime() - Date.now()
      if (diff <= 0) {
        setRemaining('Đã timeout')
        setUrgent(true)
        return
      }
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setUrgent(mins < 10)
      setRemaining(`Còn ${mins}:${String(secs).padStart(2, '0')}`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [timeoutAt])

  if (status === 'timeout') {
    return <Badge variant="destructive">Đã Timeout</Badge>
  }
  return (
    <Badge className={urgent
      ? 'bg-red-100 text-red-700 border-red-200 animate-pulse'
      : 'bg-amber-100 text-amber-700 border-amber-200'
    }>
      <Clock className="mr-1 size-3" />
      {remaining}
    </Badge>
  )
}

// ─── Timeout History Panel ────────────────────────────────────────────────────
function TimeoutHistoryDialog({ req }: { req: TimeoutRequisition }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
          <History className="size-3" />
          Lịch sử ({req.timeoutCount})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lịch sử timeout — {req.staffName}</DialogTitle>
          <DialogDescription>Các lần timeout trước đây của nhân viên này</DialogDescription>
        </DialogHeader>
        {req.timeoutHistory.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Chưa có lịch sử timeout</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {req.timeoutHistory.map((h, i) => (
              <div key={i} className="flex flex-col gap-1 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{h.code}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(h.date, 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{h.reason}</p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Detail Dialog ────────────────────────────────────────────────────────────
function DetailDialog({ req }: { req: TimeoutRequisition }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <Eye className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-140">
        <DialogHeader>
          <DialogTitle>Chi tiết — {req.code}</DialogTitle>
          <DialogDescription>Thông tin yêu cầu vật liệu timeout</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-muted-foreground">Nhân viên</Label><p className="font-medium">{req.staffName}</p></div>
            <div><Label className="text-muted-foreground">Bộ phận</Label><p className="font-medium">{req.department}</p></div>
            <div>
              <Label className="text-muted-foreground">Trạng thái</Label>
              <div className="mt-1"><CountdownBadge timeoutAt={req.timeoutAt} status={req.status} /></div>
            </div>
            <div>
              <Label className="text-muted-foreground">Timeout count</Label>
              <Badge variant={req.timeoutCount > 0 ? 'destructive' : 'secondary'} className="mt-1">
                {req.timeoutCount} lần
              </Badge>
            </div>
            <div><Label className="text-muted-foreground">Thời gian tạo</Label><p className="text-sm">{format(req.createdAt, 'HH:mm dd/MM/yyyy', { locale: vi })}</p></div>
            <div>
              <Label className="text-muted-foreground">{req.status === 'timeout' ? 'Timeout lúc' : 'Sẽ timeout lúc'}</Label>
              <p className={`text-sm font-medium ${req.status === 'timeout' ? 'text-red-600' : 'text-amber-600'}`}>
                {format(req.timeoutAt, 'HH:mm dd/MM/yyyy', { locale: vi })}
              </p>
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Vật liệu yêu cầu</Label>
            <div className="mt-2 divide-y rounded-lg border">
              {req.materials.map((m, i) => (
                <div key={i} className="flex justify-between px-4 py-2 text-sm">
                  <span>{m.name}</span>
                  <span className="font-medium">{m.quantity} {m.unit}</span>
                </div>
              ))}
            </div>
          </div>
          {req.timeoutHistory.length > 0 && (
            <div>
              <Label className="text-muted-foreground">Lịch sử timeout</Label>
              <div className="mt-2 divide-y rounded-lg border">
                {req.timeoutHistory.map((h, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2 text-xs">
                    <span className="font-medium">{h.code}</span>
                    <span className="text-muted-foreground">{format(h.date, 'dd/MM/yyyy', { locale: vi })}</span>
                    <span className="text-muted-foreground">{h.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Cancel Dialog ────────────────────────────────────────────────────────────
function CancelDialog({ req, onCancel }: {
  req: TimeoutRequisition
  onCancel: (id: string, reason: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')

  function handleConfirm() {
    if (!reason.trim()) return
    onCancel(req.id, reason)
    setOpen(false)
    setReason('')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setReason('') }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-red-600 hover:bg-red-50 hover:text-red-700">
          <XCircle className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hủy Requisition {req.code}</DialogTitle>
          <DialogDescription>
            Hành động này sẽ hủy yêu cầu, giải phóng reserve và gửi thông báo cho nhân viên.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {req.timeoutCount > 0 && (
            <Alert variant="destructive" className="border-amber-200 bg-amber-50 text-amber-800">
              <AlertTriangle className="size-4" />
              <AlertDescription>
                <strong>{req.staffName}</strong> đã có <strong>{req.timeoutCount}</strong> lần timeout trước đây.
                {req.timeoutCount >= 2 && ' Cân nhắc nhắc nhở hoặc hạn chế quyền tạo yêu cầu.'}
              </AlertDescription>
            </Alert>
          )}
          {req.timeoutHistory.length > 0 && (
            <div>
              <Label className="text-muted-foreground text-xs">Lịch sử timeout</Label>
              <div className="mt-1 divide-y rounded-lg border text-xs">
                {req.timeoutHistory.map((h, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2">
                    <span className="font-medium">{h.code}</span>
                    <span className="text-muted-foreground">{format(h.date, 'dd/MM/yyyy', { locale: vi })}</span>
                    <span className="text-muted-foreground max-w-35 truncate">{h.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Lý do hủy <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="Nhập lý do hủy requisition..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            {reason.length > 0 && !reason.trim() && (
              <p className="text-xs text-red-500">Vui lòng nhập lý do</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Đóng</Button>
          <Button variant="destructive" disabled={!reason.trim()} onClick={handleConfirm}>
            <XCircle className="mr-2 size-4" /> Xác nhận hủy & Gửi thông báo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Extend Dialog ────────────────────────────────────────────────────────────
function ExtendDialog({ req, onExtend }: {
  req: TimeoutRequisition
  onExtend: (id: string, minutes: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [minutes, setMinutes] = useState(30)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700">
          <PlusCircle className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Gia hạn — {req.code}</DialogTitle>
          <DialogDescription>Kéo dài thời gian chờ cho yêu cầu này</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label>Gia hạn thêm</Label>
          <div className="flex gap-2">
            {[15, 30, 60, 120].map(m => (
              <Button
                key={m}
                variant={minutes === m ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMinutes(m)}
              >
                {m < 60 ? `${m} phút` : `${m / 60} giờ`}
              </Button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
          <Button onClick={() => { onExtend(req.id, minutes); setOpen(false) }}>
            <PlusCircle className="mr-2 size-4" /> Gia hạn {minutes < 60 ? `${minutes} phút` : `${minutes / 60} giờ`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={7}>
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Clock className="mb-3 size-10 opacity-30" />
          <p className="text-sm">Không có yêu cầu timeout nào</p>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TimeoutRequisitionsPage() {
  const { toast } = useToast()
  const [reqs, setReqs] = useState<TimeoutRequisition[]>(INITIAL_DATA)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Auto-refresh every 30s
  const refresh = useCallback(() => {
    // In real app: re-fetch from API. Here we just update timestamp & re-evaluate statuses.
    setReqs(prev => prev.map(r => ({
      ...r,
      status: r.timeoutAt.getTime() <= Date.now() ? 'timeout' : 'near_timeout'
    })))
    setLastRefresh(new Date())
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(refresh, 30_000)
    return () => clearInterval(id)
  }, [autoRefresh, refresh])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleCancel(id: string, reason: string) {
    const req = reqs.find(r => r.id === id)
    setReqs(prev => prev.filter(r => r.id !== id))
    toast({
      title: '🗑️ Đã hủy yêu cầu',
      description: `${req?.code} đã bị hủy. Đã gửi thông báo cho ${req?.staffName}.`,
      variant: 'destructive',
    })
  }

  function handleExtend(id: string, minutes: number) {
    setReqs(prev => prev.map(r => {
      if (r.id !== id) return r
      const newTimeout = new Date(Math.max(r.timeoutAt.getTime(), Date.now()) + minutes * 60_000)
      return { ...r, timeoutAt: newTimeout, status: 'near_timeout' }
    }))
    const req = reqs.find(r => r.id === id)
    toast({
      title: '⏱️ Đã gia hạn',
      description: `${req?.code} được gia hạn thêm ${minutes < 60 ? `${minutes} phút` : `${minutes / 60} giờ`}.`,
    })
  }

  // ── Computed ──────────────────────────────────────────────────────────────────
  const timeoutCount   = reqs.filter(r => r.status === 'timeout').length
  const nearCount      = reqs.filter(r => r.status === 'near_timeout').length
  const reprocessCount = 3 // static from business logic

  const urgentCount = timeoutCount + nearCount

  return (
    <AppShell
      title="Xử lý Timeout Requisition"
      subtitle="Quản lý các yêu cầu vật liệu đã/sắp timeout"
    >
      <div className="space-y-6">

        {/* Warning Alert — dynamic count */}
        {urgentCount > 0 && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-800">
            <AlertTriangle className="size-4" />
            <AlertTitle>Cảnh báo Timeout</AlertTitle>
            <AlertDescription>
              Có <strong>{urgentCount}</strong> requisition cần xử lý khẩn cấp
              ({timeoutCount} đã timeout, {nearCount} sắp timeout).
              Hệ thống sẽ tự động hủy sau khi timeout.
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards — dynamic */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-red-100 p-3"><XCircle className="size-5 text-red-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Đã Timeout</p>
                  <p className="text-2xl font-bold text-red-600">{timeoutCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-100 p-3"><Clock className="size-5 text-amber-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Sắp Timeout</p>
                  <p className="text-2xl font-bold text-amber-600">{nearCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3"><RotateCcw className="size-5 text-blue-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Tái xử lý hôm nay</p>
                  <p className="text-2xl font-bold">{reprocessCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Clock className="size-5 text-red-600" />
                Danh sách Timeout
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Cập nhật: {format(lastRefresh, 'HH:mm:ss', { locale: vi })}
                </span>
                <Button
                  variant="outline" size="sm" className="gap-1"
                  onClick={() => { refresh(); toast({ title: '🔄 Đã làm mới dữ liệu' }) }}
                >
                  <RefreshCw className="size-3.5" />
                  Làm mới
                </Button>
                <Button
                  variant={autoRefresh ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAutoRefresh(v => !v)}
                >
                  {autoRefresh ? 'Tự động: Bật' : 'Tự động: Tắt'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã yêu cầu</TableHead>
                    <TableHead>Nhân viên</TableHead>
                    <TableHead>Vật liệu</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Timeout Count</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reqs.length === 0
                    ? <EmptyState />
                    : reqs.map((req) => (
                      <TableRow
                        key={req.id}
                        className={req.status === 'timeout' ? 'bg-red-50' : 'bg-amber-50'}
                      >
                        <TableCell className="font-medium">{req.code}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="size-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{req.staffName}</p>
                              <p className="text-xs text-muted-foreground">{req.department}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {req.materials.slice(0, 2).map((m, i) => (
                              <p key={i} className="text-sm">• {m.name} × {m.quantity} {m.unit}</p>
                            ))}
                            {req.materials.length > 2 && (
                              <p className="text-xs text-muted-foreground">
                                +{req.materials.length - 2} mặt hàng khác
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <CountdownBadge timeoutAt={req.timeoutAt} status={req.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <Badge variant={req.timeoutCount > 0 ? 'destructive' : 'secondary'}>
                                {req.timeoutCount} lần
                              </Badge>
                              {req.timeoutCount > 1 && <AlertTriangle className="size-4 text-amber-500" />}
                            </div>
                            {req.timeoutHistory.length > 0 && (
                              <TimeoutHistoryDialog req={req} />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="space-y-0.5">
                            <p className="text-muted-foreground">Tạo: {format(req.createdAt, 'HH:mm dd/MM', { locale: vi })}</p>
                            <p className={req.status === 'timeout' ? 'font-medium text-red-600' : 'font-medium text-amber-600'}>
                              {req.status === 'timeout' ? 'Timeout:' : 'Sẽ timeout:'}{' '}
                              {format(req.timeoutAt, 'HH:mm', { locale: vi })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-0.5">
                            <DetailDialog req={req} />
                            <ExtendDialog req={req} onExtend={handleExtend} />
                            <CancelDialog req={req} onCancel={handleCancel} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}