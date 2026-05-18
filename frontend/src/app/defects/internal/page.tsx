'use client'

import { useState, useMemo } from 'react'
import { AppShell } from '@/components/app-shell'
import {
  AlertCircle, Search, Eye, Check, Wrench,
  Recycle, Trash2, User, Filter
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────
type Severity = 'light' | 'medium' | 'heavy'
type Status   = 'pending' | 'processing' | 'resolved'
type Action   = 'repair' | 'recycle' | 'scrap' | ''

interface Resolution {
  action: Action
  note: string
  resolvedAt: Date
}

interface Report {
  id: string
  productName: string
  defectType: string
  severity: Severity
  quantity: number
  reportedBy: string
  reportedAt: Date
  status: Status
  resolution?: Resolution
}

const INITIAL_DEFECT_REPORTS: Report[] = [
  {
    id: '1',
    productName: 'Gấu bông Teddy',
    defectType: 'Đường may bị lỗi',
    severity: 'light',
    quantity: 5,
    reportedBy: 'Nguyễn Văn A',
    reportedAt: new Date('2024-03-14T14:30:00'),
    status: 'pending',
  },
  {
    id: '2',
    productName: 'Thỏ handmade',
    defectType: 'Vải bị phai màu',
    severity: 'medium',
    quantity: 3,
    reportedBy: 'Trần Thị B',
    reportedAt: new Date('2024-03-14T10:00:00'),
    status: 'processing',
  },
]

// ─── Constants ────────────────────────────────────────────────────────────────
const SEVERITY_COLORS: Record<Severity, string> = {
  light:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  heavy:  'bg-red-100 text-red-700 border-red-200',
}
const SEVERITY_LABELS: Record<Severity, string> = {
  light: 'Nhẹ', medium: 'Trung bình', heavy: 'Nặng',
}
const STATUS_COLORS: Record<Status, string> = {
  pending:    'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  resolved:   'bg-emerald-100 text-emerald-700',
}
const STATUS_LABELS: Record<Status, string> = {
  pending: 'Chờ xử lý', processing: 'Đang xử lý', resolved: 'Đã xử lý',
}
const ACTION_LABELS: Record<string, string> = {
  repair: 'Sửa chữa', recycle: 'Tái chế', scrap: 'Phế liệu',
}
const ACTION_ICONS: Record<string, React.ReactNode> = {
  repair:  <Wrench  className="size-4 text-blue-600" />,
  recycle: <Recycle className="size-4 text-emerald-600" />,
  scrap:   <Trash2  className="size-4 text-red-600" />,
}

const PAGE_SIZE = 6

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={8}>
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <AlertCircle className="mb-3 size-10 opacity-30" />
          <p className="text-sm">Không có báo cáo lỗi nào</p>
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
        Hiển thị {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} / {total}
      </p>
      <div className="flex gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <Button
            key={p} size="icon" className="size-8"
            variant={p === page ? 'default' : 'outline'}
            onClick={() => onChange(p)}
          >{p}</Button>
        ))}
      </div>
    </div>
  )
}

// ─── Process Dialog ───────────────────────────────────────────────────────────
function ProcessDialog({ report, onProcess }: {
  report: Report
  onProcess: (id: number | string, action: Action, note: string) => void
}) {
  const [open, setOpen]     = useState(false)
  const [action, setAction] = useState<Action>('')
  const [note, setNote]     = useState('')

  function handleSubmit() {
    if (!action) return
    onProcess(report.id, action, note)
    setOpen(false)
    setAction('')
    setNote('')
  }

  // Resolution history for resolved reports
  const res = (report as any).resolution as Resolution | undefined

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v)
      if (!v) { setAction(''); setNote('') }
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <Eye className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Chi tiết báo cáo lỗi</DialogTitle>
          <DialogDescription>Xem chi tiết và xử lý hàng lỗi</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-muted-foreground">Sản phẩm</Label><p className="font-medium">{report.productName}</p></div>
            <div><Label className="text-muted-foreground">Loại lỗi</Label><p className="font-medium">{report.defectType}</p></div>
            <div>
              <Label className="text-muted-foreground">Mức độ</Label>
              <div className="mt-1">
                <Badge className={SEVERITY_COLORS[report.severity as Severity]}>
                  {SEVERITY_LABELS[report.severity as Severity]}
                </Badge>
              </div>
            </div>
            <div><Label className="text-muted-foreground">Số lượng</Label><p className="font-medium">{report.quantity} sản phẩm</p></div>
            <div><Label className="text-muted-foreground">Báo cáo bởi</Label><p className="font-medium">{report.reportedBy}</p></div>
            <div>
              <Label className="text-muted-foreground">Thời gian</Label>
              <p className="font-medium">{format(report.reportedAt, 'HH:mm dd/MM/yyyy', { locale: vi })}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Trạng thái</Label>
              <div className="mt-1">
                <Badge className={STATUS_COLORS[report.status as Status]}>
                  {STATUS_LABELS[report.status as Status]}
                </Badge>
              </div>
            </div>
          </div>

          {/* Resolution history for resolved */}
          {res && (
            <div className="rounded-lg border bg-emerald-50 p-4 space-y-2">
              <p className="text-sm font-semibold text-emerald-700">Kết quả xử lý</p>
              <div className="flex items-center gap-2 text-sm">
                {ACTION_ICONS[res.action]}
                <span className="font-medium">{ACTION_LABELS[res.action]}</span>
                <span className="text-muted-foreground">—</span>
                <span className="text-muted-foreground">
                  {format(res.resolvedAt, 'HH:mm dd/MM/yyyy', { locale: vi })}
                </span>
              </div>
              {res.note && <p className="text-sm text-muted-foreground">Ghi chú: {res.note}</p>}
            </div>
          )}

          {/* Action selector for pending */}
          {report.status === 'pending' && (
            <div className="space-y-3 border-t pt-4">
              <Label>Chọn phương án xử lý</Label>
              <RadioGroup value={action} onValueChange={(v) => setAction(v as Action)}>
                {[
                  { value: 'repair',  icon: <Wrench className="size-4 text-blue-600" />,   label: 'Sửa chữa',  desc: 'Gửi đi sửa chữa và nhập lại kho' },
                  { value: 'recycle', icon: <Recycle className="size-4 text-emerald-600" />, label: 'Tái chế',   desc: 'Tái sử dụng nguyên liệu' },
                  { value: 'scrap',   icon: <Trash2 className="size-4 text-red-600" />,     label: 'Phế liệu',  desc: 'Chuyển thành phế liệu' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors
                      ${action === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setAction(opt.value as Action)}
                  >
                    <RadioGroupItem value={opt.value} id={opt.value} />
                    <Label htmlFor={opt.value} className="flex items-center gap-2 cursor-pointer flex-1">
                      {opt.icon}
                      <div>
                        <p className="font-medium">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <div className="space-y-2">
                <Label>Ghi chú xử lý</Label>
                <Textarea
                  placeholder="Nhập ghi chú..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {report.status === 'pending' && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
            <Button disabled={!action} onClick={handleSubmit}>
              <Check className="mr-2 size-4" /> Phê duyệt xử lý
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Quick Process Button ─────────────────────────────────────────────────────
function QuickProcessDialog({ report, onProcess }: {
  report: Report
  onProcess: (id: number | string, action: Action, note: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700">
          <Wrench className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Xử lý nhanh — {report.productName}</DialogTitle>
          <DialogDescription>Chọn phương án xử lý ngay</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          {[
            { value: 'repair' as Action,  label: 'Sửa chữa',  icon: <Wrench className="size-4 text-blue-600" />,    cls: 'border-blue-200 hover:bg-blue-50' },
            { value: 'recycle' as Action, label: 'Tái chế',   icon: <Recycle className="size-4 text-emerald-600" />, cls: 'border-emerald-200 hover:bg-emerald-50' },
            { value: 'scrap' as Action,   label: 'Phế liệu',  icon: <Trash2 className="size-4 text-red-600" />,      cls: 'border-red-200 hover:bg-red-50' },
          ].map(opt => (
            <Button
              key={opt.value}
              variant="outline"
              className={`justify-start gap-2 ${opt.cls}`}
              onClick={() => { onProcess(report.id, opt.value, ''); setOpen(false) }}
            >
              {opt.icon} {opt.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Reports Table ────────────────────────────────────────────────────────────
function ReportsTable({ items, onProcess }: {
  items: Report[]
  onProcess: (id: number | string, action: Action, note: string) => void
}) {
  const [page, setPage] = useState(1)
  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>Loại lỗi</TableHead>
              <TableHead>Mức độ</TableHead>
              <TableHead className="text-center">Số lượng</TableHead>
              <TableHead>Báo cáo bởi</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? <EmptyState /> : paginated.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="font-medium">{report.productName}</TableCell>
                <TableCell className="text-sm">{report.defectType}</TableCell>
                <TableCell>
                  <Badge className={SEVERITY_COLORS[report.severity as Severity]}>
                    {SEVERITY_LABELS[report.severity as Severity]}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">{report.quantity}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="size-3.5 text-primary" />
                    </div>
                    <span className="text-sm">{report.reportedBy}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge className={STATUS_COLORS[report.status as Status]}>
                      {STATUS_LABELS[report.status as Status]}
                    </Badge>
                    {(report as any).resolution && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {ACTION_ICONS[(report as any).resolution.action]}
                        {ACTION_LABELS[(report as any).resolution.action]}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(report.reportedAt, 'HH:mm dd/MM', { locale: vi })}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-0.5">
                    <ProcessDialog report={report} onProcess={onProcess} />
                    {report.status === 'pending' && (
                      <QuickProcessDialog report={report} onProcess={onProcess} />
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
export default function InternalDefectsPage() {
  const { toast } = useToast()
  const [reports, setReports] = useState<Report[]>(
    INITIAL_DEFECT_REPORTS
  )
  const [searchTerm, setSearchTerm]         = useState('')
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all')
  const [activeTab, setActiveTab]           = useState<Status | 'all'>('all')

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleProcess(id: number | string, action: Action, note: string) {
    setReports(prev => prev.map(r => r.id === id
      ? {
          ...r,
          status: 'resolved' as Status,
          resolution: { action, note, resolvedAt: new Date() }
        }
      : r
    ))
    toast({
      title: `✅ Đã phê duyệt xử lý`,
      description: `Phương án: ${ACTION_LABELS[action as string]}${note ? ` — ${note}` : ''}`,
    })
  }

  // ── Computed ──────────────────────────────────────────────────────────────────
  const byStatus = (s: Status) => reports.filter(r => r.status === s)

  const filtered = useMemo(() => {
    const base = activeTab === 'all' ? reports : reports.filter(r => r.status === activeTab)
    return base.filter(r => {
      const matchSearch =
        r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.defectType.toLowerCase().includes(searchTerm.toLowerCase())
      const matchSeverity = severityFilter === 'all' || r.severity === severityFilter
      return matchSearch && matchSeverity
    })
  }, [reports, activeTab, searchTerm, severityFilter])

  const pendingCount    = byStatus('pending').length
  const processingCount = byStatus('processing').length
  const resolvedCount   = byStatus('resolved').length

  return (
    <AppShell title="Báo cáo lỗi nội bộ" subtitle="Quản lý và xử lý hàng lỗi trong quy trình sản xuất">
      <div className="space-y-6">

        {/* Summary — dynamic */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { icon: AlertCircle, bg: 'bg-amber-100',   color: 'text-amber-600',   label: 'Chờ xử lý',           value: pendingCount    },
            { icon: Wrench,      bg: 'bg-blue-100',    color: 'text-blue-600',    label: 'Đang sửa chữa',       value: processingCount },
            { icon: Trash2,      bg: 'bg-red-100',     color: 'text-red-600',     label: 'Phế liệu',            value: reports.filter(r => (r as any).resolution?.action === 'scrap').length },
            { icon: Check,       bg: 'bg-emerald-100', color: 'text-emerald-600', label: 'Đã xử lý tháng này', value: resolvedCount   },
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
              <CardTitle className="text-lg font-semibold">Danh sách báo cáo lỗi</CardTitle>
              <div className="flex flex-wrap gap-2">
                {/* Severity filter */}
                <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as any)}>
                  <SelectTrigger className="w-40 gap-1">
                    <Filter className="size-4 text-muted-foreground" />
                    <SelectValue placeholder="Mức độ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả mức độ</SelectItem>
                    <SelectItem value="light">Nhẹ</SelectItem>
                    <SelectItem value="medium">Trung bình</SelectItem>
                    <SelectItem value="heavy">Nặng</SelectItem>
                  </SelectContent>
                </Select>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Tìm sản phẩm / loại lỗi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">
                  Tất cả
                  <Badge variant="secondary" className="ml-2 text-xs">{reports.length}</Badge>
                </TabsTrigger>
                {(['pending', 'processing', 'resolved'] as Status[]).map(s => (
                  <TabsTrigger key={s} value={s}>
                    {STATUS_LABELS[s]}
                    <Badge variant="secondary" className="ml-2 text-xs">{byStatus(s).length}</Badge>
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={activeTab}>
                <ReportsTable items={filtered} onProcess={handleProcess} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}