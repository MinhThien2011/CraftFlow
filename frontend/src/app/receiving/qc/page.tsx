'use client'

import { useState } from 'react'
import { Search, CheckCircle2, XCircle, Clock, Eye, FileCheck, AlertCircle } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

// ── Types ─────────────────────────────────────────────────────
type QCStatus = 'pending' | 'checking' | 'passed' | 'failed' | 'partial'
type Priority = 'high' | 'normal'

interface QCResult {
  result: string
  notes: string
  checkedItems: string[]
  inspectedAt: string
}

interface QCItem {
  id: string
  receiptNo: string
  materialCode: string
  materialName: string
  supplier: string
  quantity: number
  unit: string
  receivedDate: string
  status: QCStatus
  priority: Priority
  qcResult?: QCResult
}

// ── Static data ───────────────────────────────────────────────
const INITIAL_ITEMS: QCItem[] = [
  {
    id: 'QC-001',
    receiptNo: 'PN-2024-00123',
    materialCode: 'LEN-001',
    materialName: 'Len cotton cao cấp',
    supplier: 'Công ty Len Việt Nam',
    quantity: 200, unit: 'cuộn',
    receivedDate: '2024-01-15',
    status: 'pending', priority: 'high'
  },
  {
    id: 'QC-002',
    receiptNo: 'PN-2024-00124',
    materialCode: 'PKN-003',
    materialName: 'Phụ kiện nút áo',
    supplier: 'Công ty TNHH ABC',
    quantity: 500, unit: 'bộ',
    receivedDate: '2024-01-15',
    status: 'checking', priority: 'normal'
  },
  {
    id: 'QC-003',
    receiptNo: 'PN-2024-00120',
    materialCode: 'LEN-002',
    materialName: 'Len acrylic',
    supplier: 'Nhà cung cấp XYZ',
    quantity: 150, unit: 'cuộn',
    receivedDate: '2024-01-14',
    status: 'passed', priority: 'normal',
    qcResult: {
      result: 'passed',
      notes: 'Hàng đúng quy cách, bao bì nguyên vẹn. Đã kiểm tra xác suất 10% lô hàng.',
      checkedItems: ['visual', 'color', 'dimension', 'weight', 'packaging', 'quantity', 'document'],
      inspectedAt: '14/01/2024 14:30'
    }
  },
  {
    id: 'QC-004',
    receiptNo: 'PN-2024-00118',
    materialCode: 'VAI-001',
    materialName: 'Vải lót',
    supplier: 'Công ty Vải VN',
    quantity: 100, unit: 'm',
    receivedDate: '2024-01-13',
    status: 'failed', priority: 'high',
    qcResult: {
      result: 'failed',
      notes: 'Màu sắc lệch so với mẫu chuẩn. Bao bì một số cuộn bị ẩm. Không đủ điều kiện nhập kho.',
      checkedItems: ['visual', 'color', 'packaging'],
      inspectedAt: '13/01/2024 10:15'
    }
  }
]

const QC_CHECKLIST = [
  { id: 'visual',    label: 'Kiểm tra ngoại quan' },
  { id: 'color',     label: 'Kiểm tra màu sắc' },
  { id: 'dimension', label: 'Kiểm tra kích thước' },
  { id: 'weight',    label: 'Kiểm tra trọng lượng' },
  { id: 'packaging', label: 'Kiểm tra bao bì' },
  { id: 'quantity',  label: 'Kiểm tra số lượng' },
  { id: 'document',  label: 'Kiểm tra chứng từ' }
]

const STATUS_CONFIG: Record<QCStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending:  { label: 'Chờ QC',        color: 'bg-amber-100 text-amber-700',    icon: Clock },
  checking: { label: 'Đang kiểm tra', color: 'bg-blue-100 text-blue-700',      icon: Eye },
  passed:   { label: 'Đạt',           color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  failed:   { label: 'Không đạt',     color: 'bg-red-100 text-red-700',        icon: XCircle },
  partial:  { label: 'Đạt một phần',  color: 'bg-orange-100 text-orange-700',  icon: CheckCircle2 },
}

const RESULT_TO_STATUS: Record<string, QCStatus> = {
  passed: 'passed', failed: 'failed', partial: 'partial',
}

const RESULT_LABEL: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  passed:  { label: 'Đạt – Cho phép nhập kho',          color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  failed:  { label: 'Không đạt – Từ chối',               color: 'bg-red-100 text-red-700',         icon: XCircle },
  partial: { label: 'Đạt một phần – Nhập có điều kiện',  color: 'bg-orange-100 text-orange-700',   icon: AlertCircle },
}

// ── Main ──────────────────────────────────────────────────────
export default function ReceivingQCPage() {
  const [items, setItems]               = useState<QCItem[]>(INITIAL_ITEMS)
  const [searchQuery, setSearchQuery]   = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // inspect dialog
  const [selectedItem, setSelectedItem] = useState<QCItem | null>(null)
  const [inspectOpen, setInspectOpen]   = useState(false)
  const [checkedItems, setCheckedItems] = useState<string[]>([])
  const [qcResult, setQcResult]         = useState('')
  const [qcNotes, setQcNotes]           = useState('')
  const [resultError, setResultError]   = useState(false)

  // view detail dialog
  const [viewItem, setViewItem] = useState<QCItem | null>(null)
  const [viewOpen, setViewOpen] = useState(false)

  // ── helpers ───────────────────────────────────────────────
  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.materialCode.toLowerCase().includes(searchQuery.toLowerCase())
    return matchSearch && (statusFilter === 'all' || item.status === statusFilter)
  })

  const stats = {
    pending:  items.filter((i) => i.status === 'pending').length,
    checking: items.filter((i) => i.status === 'checking').length,
    passed:   items.filter((i) => i.status === 'passed').length,
    failed:   items.filter((i) => i.status === 'failed').length,
  }

  const openInspect = (item: QCItem) => {
    setSelectedItem(item)
    setCheckedItems([])
    setQcResult('')
    setQcNotes('')
    setResultError(false)
    setInspectOpen(true)
  }

  const openView = (item: QCItem) => {
    setViewItem(item)
    setViewOpen(true)
  }

  const handleConfirm = () => {
    if (!qcResult) { setResultError(true); return }
    if (!selectedItem) return
    const now = new Date().toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
    setItems((prev) =>
      prev.map((i) =>
        i.id === selectedItem.id
          ? { ...i, status: RESULT_TO_STATUS[qcResult], qcResult: { result: qcResult, notes: qcNotes, checkedItems, inspectedAt: now } }
          : i
      )
    )
    setInspectOpen(false)
  }

  const toggleCheck = (id: string, checked: boolean) =>
    setCheckedItems((prev) => checked ? [...prev, id] : prev.filter((i) => i !== id))

  const checkCount = checkedItems.length
  const checkTotal = QC_CHECKLIST.length

  // ── render ────────────────────────────────────────────────
  return (
    <AppShell
      title="Kiểm tra chất lượng (QC)"
      subtitle="Kiểm tra chất lượng hàng nhập kho trước khi nhập chính thức"
    >
      <div className="flex flex-col gap-6 p-6">

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Chờ QC',        value: stats.pending,  color: 'text-amber-600',   Icon: Clock },
            { label: 'Đang kiểm tra', value: stats.checking, color: 'text-blue-600',    Icon: Eye },
            { label: 'Đạt',           value: stats.passed,   color: 'text-emerald-600', Icon: CheckCircle2 },
            { label: 'Không đạt',     value: stats.failed,   color: 'text-red-600',     Icon: XCircle },
          ].map(({ label, value, color, Icon }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                  <Icon className={`size-8 ${color} opacity-80`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo mã, tên, số phiếu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="pending">Chờ QC</SelectItem>
                  <SelectItem value="checking">Đang kiểm tra</SelectItem>
                  <SelectItem value="passed">Đạt</SelectItem>
                  <SelectItem value="failed">Không đạt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Mã QC</TableHead>
                  <TableHead>Số phiếu nhập</TableHead>
                  <TableHead>Vật tư</TableHead>
                  <TableHead>Nhà cung cấp</TableHead>
                  <TableHead className="text-right">Số lượng</TableHead>
                  <TableHead>Ngày nhận</TableHead>
                  <TableHead>Ưu tiên</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const { label, color, icon: StatusIcon } = STATUS_CONFIG[item.status]
                  const canInspect = item.status === 'pending' || item.status === 'checking'
                  const canView    = ['passed', 'failed', 'partial'].includes(item.status)
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>{item.receiptNo}</TableCell>
                      <TableCell>
                        <p className="font-medium">{item.materialName}</p>
                        <p className="text-xs text-muted-foreground">{item.materialCode}</p>
                      </TableCell>
                      <TableCell>{item.supplier}</TableCell>
                      <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                      <TableCell>{item.receivedDate}</TableCell>
                      <TableCell>
                        {item.priority === 'high'
                          ? <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Cao</Badge>
                          : <Badge variant="outline" className="text-muted-foreground">Thường</Badge>
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={`gap-1 ${color}`}>
                          <StatusIcon className="size-3" />{label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canInspect && (
                          <Button size="sm" onClick={() => openInspect(item)}>
                            <FileCheck className="size-4 mr-1" />Kiểm tra
                          </Button>
                        )}
                        {canView && (
                          <Button variant="ghost" size="sm" onClick={() => openView(item)}>
                            <Eye className="size-4 mr-1" />Xem kết quả
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
      </div>

      {/* ── Inspect Dialog ── */}
      <Dialog open={inspectOpen} onOpenChange={setInspectOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Kiểm tra chất lượng – {selectedItem?.materialName}</DialogTitle>
            <DialogDescription>
              Phiếu nhập: {selectedItem?.receiptNo} | Số lượng: {selectedItem?.quantity} {selectedItem?.unit}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Checklist kiểm tra</Label>
                <span className={`text-sm font-medium ${checkCount === checkTotal ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  {checkCount}/{checkTotal} mục
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(checkCount / checkTotal) * 100}%` }} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {QC_CHECKLIST.map((check) => (
                  <div key={check.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`ins-${check.id}`}
                      checked={checkedItems.includes(check.id)}
                      onCheckedChange={(c) => toggleCheck(check.id, !!c)}
                    />
                    <label htmlFor={`ins-${check.id}`} className="text-sm cursor-pointer select-none">
                      {check.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ghi chú kiểm tra</Label>
              <Textarea placeholder="Nhập ghi chú..." rows={3} value={qcNotes} onChange={(e) => setQcNotes(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Kết quả <span className="text-destructive">*</span></Label>
              <Select value={qcResult} onValueChange={(v) => { setQcResult(v); setResultError(false) }}>
                <SelectTrigger className={resultError ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Chọn kết quả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passed">Đạt – Cho phép nhập kho</SelectItem>
                  <SelectItem value="failed">Không đạt – Từ chối</SelectItem>
                  <SelectItem value="partial">Đạt một phần – Nhập có điều kiện</SelectItem>
                </SelectContent>
              </Select>
              {resultError && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3" /> Vui lòng chọn kết quả trước khi xác nhận
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInspectOpen(false)}>Hủy</Button>
            <Button onClick={handleConfirm}>Xác nhận kết quả</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Detail Dialog ── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kết quả QC – {viewItem?.materialName}</DialogTitle>
            <DialogDescription>
              {viewItem?.receiptNo} · {viewItem?.materialCode} · Kiểm tra lúc: {viewItem?.qcResult?.inspectedAt}
            </DialogDescription>
          </DialogHeader>

          {viewItem?.qcResult ? (() => {
            const resultCfg = RESULT_LABEL[viewItem.qcResult.result]
            const ResultIcon = resultCfg?.icon ?? AlertCircle
            const tickedCount = viewItem.qcResult.checkedItems.length
            return (
              <div className="space-y-4 py-2">

                {/* Kết quả tổng thể */}
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                  viewItem.qcResult.result === 'passed' ? 'border-emerald-200 bg-emerald-50' :
                  viewItem.qcResult.result === 'failed' ? 'border-red-200 bg-red-50' :
                  'border-orange-200 bg-orange-50'
                }`}>
                  <ResultIcon className={`size-6 shrink-0 ${
                    viewItem.qcResult.result === 'passed' ? 'text-emerald-600' :
                    viewItem.qcResult.result === 'failed' ? 'text-red-600' : 'text-orange-500'
                  }`} />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Kết quả kiểm tra</p>
                    <Badge className={`${resultCfg?.color} hover:${resultCfg?.color}`}>
                      {resultCfg?.label}
                    </Badge>
                  </div>
                </div>

                {/* Checklist */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Checklist đã thực hiện</p>
                    <span className="text-xs text-muted-foreground">{tickedCount}/{QC_CHECKLIST.length} mục</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${(tickedCount / QC_CHECKLIST.length) * 100}%` }} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 pt-1">
                    {QC_CHECKLIST.map((check) => {
                      const ticked = viewItem.qcResult!.checkedItems.includes(check.id)
                      return (
                        <div key={check.id} className="flex items-center gap-2">
                          {ticked
                            ? <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                            : <XCircle className="size-4 text-muted-foreground/30 shrink-0" />
                          }
                          <span className={`text-sm ${!ticked && 'text-muted-foreground line-through'}`}>
                            {check.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Ghi chú */}
                {viewItem.qcResult.notes && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Ghi chú</p>
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 leading-relaxed italic">
                      "{viewItem.qcResult.notes}"
                    </p>
                  </div>
                )}

                {/* Thông tin vật tư */}
                <div className="grid grid-cols-2 gap-2 text-sm border-t pt-3 text-muted-foreground">
                  <div>Nhà cung cấp: <strong className="text-foreground">{viewItem.supplier}</strong></div>
                  <div>Số lượng: <strong className="text-foreground">{viewItem.quantity} {viewItem.unit}</strong></div>
                  <div>Ngày nhận: <strong className="text-foreground">{viewItem.receivedDate}</strong></div>
                  <div>Ưu tiên: <strong className="text-foreground">{viewItem.priority === 'high' ? 'Cao' : 'Thường'}</strong></div>
                </div>
              </div>
            )
          })() : (
            <p className="text-sm text-muted-foreground py-6 text-center">Chưa có kết quả QC</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}