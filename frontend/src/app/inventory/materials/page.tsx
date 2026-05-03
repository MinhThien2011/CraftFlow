'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import {
  Search, Download, Plus, Edit2, Eye, MapPin,
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2, X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { inventoryItems as initialItems } from '@/lib/warehouse-mock-data'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

// ── Types ─────────────────────────────────────────────────────
type StockStatus = 'normal' | 'low' | 'critical' | 'overstock'

interface InventoryItem {
  id: string
  code: string
  name: string
  category: string
  currentStock: number
  minStock: number
  maxStock: number
  unit: string
  location: string
  status: StockStatus
  lastUpdated: Date
}

// ── Mock lịch sử nhập/xuất cho modal xem ─────────────────────
const MOCK_HISTORY: Record<string, { type: 'in' | 'out'; qty: number; note: string; date: string }[]> = {
  default: [
    { type: 'in',  qty: 100, note: 'Nhập theo PO-2024-001', date: '15/03/2024 08:00' },
    { type: 'out', qty: 30,  note: 'Xuất theo LSX-2024-001', date: '14/03/2024 14:30' },
    { type: 'in',  qty: 50,  note: 'Nhập theo PO-2024-002', date: '10/03/2024 09:15' },
    { type: 'out', qty: 20,  note: 'Xuất theo LSX-2024-002', date: '08/03/2024 11:00' },
  ]
}

// ── Constants ─────────────────────────────────────────────────
const STATUS_COLOR: Record<StockStatus, string> = {
  normal:    'bg-emerald-100 text-emerald-700',
  low:       'bg-amber-100 text-amber-700',
  critical:  'bg-red-100 text-red-700',
  overstock: 'bg-blue-100 text-blue-700',
}
const STATUS_LABEL: Record<StockStatus, string> = {
  normal:    'Bình thường',
  low:       'Sắp hết',
  critical:  'Nguy hiểm',
  overstock: 'Tồn dư',
}

// tính status tự động dựa trên tồn kho
function calcStatus(current: number, min: number, max: number): StockStatus {
  if (current <= min * 0.5) return 'critical'
  if (current <= min)       return 'low'
  if (current >= max)       return 'overstock'
  return 'normal'
}

// xuất CSV
function exportCSV(items: InventoryItem[]) {
  const headers = ['Mã NVL', 'Tên', 'Danh mục', 'Tồn kho', 'ĐVT', 'Tối thiểu', 'Tối đa', 'Vị trí', 'Trạng thái']
  const rows = items.map((i) => [
    i.code, i.name, i.category, i.currentStock, i.unit,
    i.minStock, i.maxStock, i.location, STATUS_LABEL[i.status]
  ])
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `ton-kho-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
}

// ── Field error helper ─────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-xs text-destructive flex items-center gap-1 mt-1"><AlertCircle className="size-3" />{msg}</p>
}

// ── Main ──────────────────────────────────────────────────────
export default function InventoryMaterialsPage() {
  const [items, setItems]               = useState<InventoryItem[]>(initialItems as InventoryItem[])
  const [searchTerm, setSearchTerm]     = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // view modal
  const [viewItem, setViewItem]   = useState<InventoryItem | null>(null)
  const [viewOpen, setViewOpen]   = useState(false)

  // edit modal
  const [editItem, setEditItem]   = useState<InventoryItem | null>(null)
  const [editOpen, setEditOpen]   = useState(false)
  const [editDraft, setEditDraft] = useState<Partial<InventoryItem>>({})
  const [editSaved, setEditSaved] = useState(false)

  // add modal
  const [addOpen, setAddOpen]     = useState(false)
  const [addDraft, setAddDraft]   = useState({ code: '', name: '', category: '', unit: '', minStock: '', maxStock: '', location: '' })
  const [addErrors, setAddErrors] = useState<Record<string, string>>({})
  const [addSaved, setAddSaved]   = useState(false)

  const categories = [...new Set(items.map((i) => i.category))]

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCat    = categoryFilter === 'all' || item.category === categoryFilter
    const matchStatus = statusFilter   === 'all' || item.status   === statusFilter
    return matchSearch && matchCat && matchStatus
  })

  const stats = {
    total:    items.length,
    normal:   items.filter((i) => i.status === 'normal').length,
    low:      items.filter((i) => i.status === 'low').length,
    critical: items.filter((i) => i.status === 'critical').length,
  }

  // ── Open modals ───────────────────────────────────────────
  const openView = (item: InventoryItem) => { setViewItem(item); setViewOpen(true) }

  const openEdit = (item: InventoryItem) => {
    setEditItem(item)
    setEditDraft({ ...item })
    setEditSaved(false)
    setEditOpen(true)
  }

  const openAdd = () => {
    setAddDraft({ code: '', name: '', category: '', unit: '', minStock: '', maxStock: '', location: '' })
    setAddErrors({})
    setAddSaved(false)
    setAddOpen(true)
  }

  // ── Save edit ─────────────────────────────────────────────
  const handleSaveEdit = () => {
    if (!editItem) return
    setItems((prev) => prev.map((i) => {
      if (i.id !== editItem.id) return i
      const updated = { ...i, ...editDraft } as InventoryItem
      updated.status = calcStatus(updated.currentStock, updated.minStock, updated.maxStock)
      return updated
    }))
    setEditSaved(true)
  }

  // ── Save add ──────────────────────────────────────────────
  const validateAdd = () => {
    const errs: Record<string, string> = {}
    if (!addDraft.code.trim())     errs.code     = 'Bắt buộc'
    if (!addDraft.name.trim())     errs.name     = 'Bắt buộc'
    if (!addDraft.category.trim()) errs.category = 'Bắt buộc'
    if (!addDraft.unit.trim())     errs.unit     = 'Bắt buộc'
    if (!addDraft.location.trim()) errs.location = 'Bắt buộc'
    if (!addDraft.minStock)        errs.minStock = 'Bắt buộc'
    if (!addDraft.maxStock)        errs.maxStock = 'Bắt buộc'
    return errs
  }

  const handleSaveAdd = () => {
    const errs = validateAdd()
    if (Object.keys(errs).length) { setAddErrors(errs); return }

    const min = Number(addDraft.minStock)
    const max = Number(addDraft.maxStock)
    const newItem: InventoryItem = {
      id:           Date.now().toString(),
      code:         addDraft.code,
      name:         addDraft.name,
      category:     addDraft.category,
      unit:         addDraft.unit,
      currentStock: 0,
      minStock:     min,
      maxStock:     max,
      location:     addDraft.location,
      status:       calcStatus(0, min, max),
      lastUpdated:  new Date(),
    }
    setItems((prev) => [newItem, ...prev])
    setAddSaved(true)
  }

  // ── Stock progress ─────────────────────────────────────────
  const stockPct = (item: InventoryItem) =>
    Math.min(100, Math.round((item.currentStock / item.maxStock) * 100))

  const progressColor = (status: StockStatus) => {
    if (status === 'critical')  return 'bg-red-500'
    if (status === 'low')       return 'bg-amber-500'
    if (status === 'overstock') return 'bg-blue-500'
    return 'bg-emerald-500'
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <AppShell title="Tồn kho nguyên vật liệu" subtitle="Quản lý tồn kho realtime">
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Tổng mặt hàng', value: stats.total,    color: 'text-foreground',   bg: 'bg-primary/10',  Icon: MapPin },
            { label: 'Bình thường',   value: stats.normal,   color: 'text-emerald-600',  bg: 'bg-emerald-100', Icon: CheckCircle2 },
            { label: 'Sắp hết',       value: stats.low,      color: 'text-amber-600',    bg: 'bg-amber-100',   Icon: AlertCircle },
            { label: 'Nguy hiểm',     value: stats.critical, color: 'text-red-600',      bg: 'bg-red-100',     Icon: AlertCircle },
          ].map(({ label, value, color, bg, Icon }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                  <div className={`rounded-lg ${bg} p-3`}>
                    <Icon className={`size-5 ${color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-semibold">Danh sách nguyên vật liệu</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)}>
                  <Download className="mr-2 size-4" /> Xuất Excel
                </Button>
                <Button size="sm" onClick={openAdd}>
                  <Plus className="mr-2 size-4" /> Thêm mới
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col gap-4 mb-6 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo mã hoặc tên..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Danh mục" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả danh mục</SelectItem>
                  {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="normal">Bình thường</SelectItem>
                  <SelectItem value="low">Sắp hết</SelectItem>
                  <SelectItem value="critical">Nguy hiểm</SelectItem>
                  <SelectItem value="overstock">Tồn dư</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã NVL</TableHead>
                    <TableHead>Tên nguyên vật liệu</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead className="text-center">Tồn kho</TableHead>
                    <TableHead className="w-32">Mức tồn</TableHead>
                    <TableHead className="text-center">Tối thiểu</TableHead>
                    <TableHead className="text-center">Tối đa</TableHead>
                    <TableHead>Vị trí</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Cập nhật</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-10 text-muted-foreground text-sm">
                        Không tìm thấy nguyên vật liệu nào
                      </TableCell>
                    </TableRow>
                  ) : filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                      <TableCell className="text-center font-medium">
                        {item.currentStock} {item.unit}
                      </TableCell>
                      {/* Progress bar tồn kho */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${progressColor(item.status)}`}
                              style={{ width: `${stockPct(item)}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground text-right">{stockPct(item)}%</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{item.minStock}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{item.maxStock}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground" />{item.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLOR[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(item.lastUpdated, 'HH:mm dd/MM', { locale: vi })}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openView(item)}>
                            <Eye className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(item)}>
                            <Edit2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── View Modal ── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewItem?.name}</DialogTitle>
            <DialogDescription>{viewItem?.code} · {viewItem?.category} · {viewItem?.location}</DialogDescription>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4 py-2">

              {/* Progress tồn kho */}
              <div className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Mức tồn kho</span>
                  <Badge className={STATUS_COLOR[viewItem.status]}>{STATUS_LABEL[viewItem.status]}</Badge>
                </div>
                <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progressColor(viewItem.status)}`}
                    style={{ width: `${stockPct(viewItem)}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Tối thiểu: <strong className="text-foreground">{viewItem.minStock}</strong></span>
                  <span className="font-bold text-foreground text-base">{viewItem.currentStock} {viewItem.unit}</span>
                  <span>Tối đa: <strong className="text-foreground">{viewItem.maxStock}</strong></span>
                </div>
              </div>

              {/* Thông tin */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Mã NVL',    value: viewItem.code },
                  { label: 'Danh mục',  value: viewItem.category },
                  { label: 'Đơn vị',    value: viewItem.unit },
                  { label: 'Vị trí kho', value: viewItem.location },
                  { label: 'Cập nhật', value: format(viewItem.lastUpdated, 'HH:mm dd/MM/yyyy', { locale: vi }) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-muted-foreground">{label}</p>
                    <p className="font-medium">{value}</p>
                  </div>
                ))}
              </div>

              {/* Lịch sử nhập/xuất */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Lịch sử nhập / xuất gần đây</p>
                <div className="rounded-lg border divide-y max-h-44 overflow-y-auto">
                  {(MOCK_HISTORY[viewItem.id] ?? MOCK_HISTORY.default).map((h, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-3 py-2.5">
                      <div className={`p-1.5 rounded-full ${h.type === 'in' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        {h.type === 'in'
                          ? <TrendingUp className="size-3 text-emerald-600" />
                          : <TrendingDown className="size-3 text-red-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{h.note}</p>
                        <p className="text-xs text-muted-foreground">{h.date}</p>
                      </div>
                      <span className={`text-sm font-semibold ${h.type === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {h.type === 'in' ? '+' : '-'}{h.qty}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Đóng</Button>
            {viewItem && (
              <Button onClick={() => { setViewOpen(false); openEdit(viewItem) }}>
                <Edit2 className="size-4 mr-2" /> Chỉnh sửa
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Modal ── */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditSaved(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa nguyên vật liệu</DialogTitle>
            <DialogDescription>{editItem?.code} – {editItem?.name}</DialogDescription>
          </DialogHeader>
          {editSaved && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle2 className="size-4 shrink-0" /> Đã lưu thay đổi thành công
            </div>
          )}
          {editDraft && (
            <div className="grid gap-4 py-2">
              {[
                { id: 'name',     label: 'Tên NVL',       type: 'text',   key: 'name' },
                { id: 'unit',     label: 'Đơn vị tính',   type: 'text',   key: 'unit' },
                { id: 'minStock', label: 'Tồn tối thiểu', type: 'number', key: 'minStock' },
                { id: 'maxStock', label: 'Tồn tối đa',    type: 'number', key: 'maxStock' },
                { id: 'location', label: 'Vị trí kho',    type: 'text',   key: 'location' },
              ].map(({ id, label, type, key }) => (
                <div key={id} className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor={id} className="text-right text-sm">{label}</Label>
                  <Input
                    id={id}
                    type={type}
                    className="col-span-3"
                    value={(editDraft as any)[key] ?? ''}
                    onChange={(e) => setEditDraft((prev) => ({
                      ...prev,
                      [key]: type === 'number' ? Number(e.target.value) : e.target.value
                    }))}
                  />
                </div>
              ))}
              {/* Danh mục */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-sm">Danh mục</Label>
                <Select
                  value={(editDraft as any).category ?? ''}
                  onValueChange={(v) => setEditDraft((prev) => ({ ...prev, category: v }))}
                >
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            {editSaved
              ? <Button variant="outline" onClick={() => setEditOpen(false)}>Đóng</Button>
              : <>
                  <Button variant="outline" onClick={() => setEditOpen(false)}>Hủy</Button>
                  <Button onClick={handleSaveEdit}>Lưu thay đổi</Button>
                </>
            }
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Modal ── */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setAddSaved(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm nguyên vật liệu mới</DialogTitle>
            <DialogDescription>Nhập thông tin nguyên vật liệu cần thêm vào kho</DialogDescription>
          </DialogHeader>
          {addSaved && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle2 className="size-4 shrink-0" /> Đã thêm vào danh sách thành công
            </div>
          )}
          {!addSaved && (
            <div className="grid gap-3 py-2">
              {[
                { id: 'code',     label: 'Mã NVL',         placeholder: 'NVL-XXX', type: 'text' },
                { id: 'name',     label: 'Tên NVL',         placeholder: 'Tên nguyên vật liệu', type: 'text' },
                { id: 'unit',     label: 'Đơn vị tính',    placeholder: 'cuộn, kg, cái...', type: 'text' },
                { id: 'minStock', label: 'Tồn tối thiểu',  placeholder: '0', type: 'number' },
                { id: 'maxStock', label: 'Tồn tối đa',     placeholder: '0', type: 'number' },
                { id: 'location', label: 'Vị trí kho',     placeholder: 'A1-01', type: 'text' },
              ].map(({ id, label, placeholder, type }) => (
                <div key={id} className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor={id} className="text-right text-sm pt-2">{label}</Label>
                  <div className="col-span-3">
                    <Input
                      id={id}
                      type={type}
                      placeholder={placeholder}
                      value={(addDraft as any)[id]}
                      onChange={(e) => {
                        setAddDraft((prev) => ({ ...prev, [id]: e.target.value }))
                        setAddErrors((prev) => ({ ...prev, [id]: '' }))
                      }}
                      className={addErrors[id] ? 'border-destructive' : ''}
                    />
                    <FieldError msg={addErrors[id]} />
                  </div>
                </div>
              ))}
              {/* Danh mục */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right text-sm pt-2">Danh mục</Label>
                <div className="col-span-3">
                  <Select
                    value={addDraft.category}
                    onValueChange={(v) => { setAddDraft((prev) => ({ ...prev, category: v })); setAddErrors((prev) => ({ ...prev, category: '' })) }}
                  >
                    <SelectTrigger className={addErrors.category ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FieldError msg={addErrors.category} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {addSaved
              ? <Button variant="outline" onClick={() => setAddOpen(false)}>Đóng</Button>
              : <>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>Hủy</Button>
                  <Button onClick={handleSaveAdd}>Thêm vào kho</Button>
                </>
            }
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}