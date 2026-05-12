'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Search, Upload, FileText, Camera, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

import { withPermission } from '@/components/guards/permission-guard'

// ============================================================
// TYPES
// ============================================================
interface ReceivingItem {
  id: string
  materialCode: string
  materialName: string
  unit: string
  poQuantity: number
  receivedQuantity: number
  location: string
}

// errors cho từng field header + từng dòng vật tư
interface FormErrors {
  supplier?: string
  warehouse?: string
  receiptType?: string
  items?: string // lỗi chung (chưa có dòng nào)
  rows?: Record<string, {
    materialCode?: string
    materialName?: string
    unit?: string
    receivedQuantity?: string
    location?: string
  }>
}

// ============================================================
// MOCK PO DATA — thay bằng API call thực tế sau
// ============================================================
const MOCK_PO: Record<string, {
  supplier: string
  supplierValue: string
  items: Omit<ReceivingItem, 'id' | 'receivedQuantity' | 'location'>[]
}> = {
  'PO-2024-001': {
    supplier: 'Công ty Len Việt Nam',
    supplierValue: 'ncc1',
    items: [
      { materialCode: 'LEN-001', materialName: 'Len cotton cao cấp', unit: 'cuộn', poQuantity: 200 },
      { materialCode: 'LEN-002', materialName: 'Len acrylic', unit: 'cuộn', poQuantity: 150 },
    ],
  },
  'PO-2024-002': {
    supplier: 'Công ty TNHH ABC',
    supplierValue: 'ncc2',
    items: [
      { materialCode: 'MAT-001', materialName: 'Mắt thú nhồi 8mm', unit: 'chiếc', poQuantity: 500 },
      { materialCode: 'MUI-001', materialName: 'Mũi thú nhồi bông', unit: 'chiếc', poQuantity: 300 },
    ],
  },
  'PO-2024-003': {
    supplier: 'Nhà cung cấp XYZ',
    supplierValue: 'ncc3',
    items: [
      { materialCode: 'BON-001', materialName: 'Bông nhồi tiêu chuẩn', unit: 'kg', poQuantity: 100 },
    ],
  },
}

// ============================================================
// SMALL HELPER: hiển thị lỗi dưới field
// ============================================================
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1 text-xs text-destructive mt-1">
      <AlertCircle className="size-3 shrink-0" />
      {message}
    </p>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================
function CreateReceivingPage() {
  const router = useRouter()

  // --- form state (thêm vào so với bản gốc) ---
  const [supplier, setSupplier] = useState('')
  const [warehouse, setWarehouse] = useState('main')
  const [receiptType, setReceiptType] = useState('po')
  const [poNumber, setPoNumber] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false) // đã bấm Gửi duyệt chưa
  const [draftSaved, setDraftSaved] = useState(false)

  // --- PO modal ---
  const [poModalOpen, setPoModalOpen] = useState(false)
  const [poQuery, setPoQuery] = useState('')

  // --- items (giữ nguyên như bản gốc) ---
  const [items, setItems] = useState<ReceivingItem[]>([])

  // --- attachments (thay mock cứng bằng state thực) ---
  const [attachments, setAttachments] = useState<{ name: string; type: 'pdf' | 'image' }[]>([])

  // ── Validation ──────────────────────────────────────────
  const validate = (): FormErrors => {
    const errs: FormErrors = {}

    if (!supplier) errs.supplier = 'Vui lòng chọn nhà cung cấp'
    if (!warehouse) errs.warehouse = 'Vui lòng chọn kho nhập'
    if (!receiptType) errs.receiptType = 'Vui lòng chọn loại nhập'
    if (items.length === 0) errs.items = 'Vui lòng thêm ít nhất 1 vật tư'

    const rows: FormErrors['rows'] = {}
    items.forEach((item) => {
      const rowErr: Record<string, string> = {}
      if (!item.materialCode.trim()) rowErr.materialCode = 'Bắt buộc'
      if (!item.materialName.trim()) rowErr.materialName = 'Bắt buộc'
      if (!item.unit.trim()) rowErr.unit = 'Bắt buộc'
      if (!item.receivedQuantity || item.receivedQuantity <= 0) rowErr.receivedQuantity = 'Phải > 0'
      if (!item.location) rowErr.location = 'Chọn vị trí'
      if (Object.keys(rowErr).length) rows[item.id] = rowErr
    })
    if (Object.keys(rows).length) errs.rows = rows

    return errs
  }

  const rowErr = (id: string, field: string) => errors.rows?.[id]?.[field as keyof NonNullable<FormErrors['rows']>[string]]

  // ── Actions ─────────────────────────────────────────────
  const handleSubmit = () => {
    const errs = validate()
    setErrors(errs)
    setSubmitted(true)
    if (Object.keys(errs).length === 0) {
      // TODO: gọi API tạo phiếu
      router.push('/receiving')
    }
  }

  const handleSaveDraft = () => {
    setDraftSaved(true)
    setTimeout(() => setDraftSaved(false), 2500)
    // TODO: gọi API lưu nháp
  }

  // ── PO Search ───────────────────────────────────────────
  const poResults = Object.entries(MOCK_PO).filter(
    ([key, val]) =>
      !poQuery ||
      key.toLowerCase().includes(poQuery.toLowerCase()) ||
      val.supplier.toLowerCase().includes(poQuery.toLowerCase())
  )

  const handleSelectPO = (poKey: string) => {
    const po = MOCK_PO[poKey]
    if (!po) return
    setPoNumber(poKey)
    setSupplier(po.supplierValue)
    setItems(
      po.items.map((item, idx) => ({
        id: (Date.now() + idx).toString(),
        ...item,
        receivedQuantity: item.poQuantity, // mặc định = SL PO
        location: '',
      }))
    )
    setPoModalOpen(false)
    setPoQuery('')
    // re-validate nếu đã submit rồi
    if (submitted) setErrors(validate())
  }

  // ── Items ────────────────────────────────────────────────
  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      materialCode: '', materialName: '', unit: '',
      poQuantity: 0, receivedQuantity: 0, location: ''
    }])
  }

  const removeItem = (id: string) => setItems(items.filter((i) => i.id !== id))

  const updateItem = (id: string, field: keyof ReceivingItem, value: string | number) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)))
  }

  // ── Attachments ──────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newFiles = Array.from(files).map((f) => ({
      name: f.name,
      type: (f.name.endsWith('.pdf') ? 'pdf' : 'image') as 'pdf' | 'image',
    }))
    setAttachments((prev) => [...prev, ...newFiles])
    e.target.value = '' // reset để có thể upload lại cùng file
  }

  const removeAttachment = (idx: number) =>
    setAttachments((prev) => prev.filter((_, i) => i !== idx))

  // ────────────────────────────────────────────────────────
  return (
    <AppShell title="Tạo phiếu nhập kho" subtitle="Nhập thông tin phiếu nhập kho mới">
      <div className="flex flex-col gap-6 p-6">

        {/* ── Header ── (giữ nguyên layout, thêm toast nháp) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/receiving">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {draftSaved && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="size-4" /> Đã lưu nháp
              </span>
            )}
            <Button variant="outline" onClick={handleSaveDraft}>Lưu nháp</Button>
            <Button onClick={handleSubmit}>Gửi duyệt</Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">

          {/* ── Thông tin chung ── (layout giữ nguyên, thêm state + validation) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Thông tin chung</CardTitle>
              <CardDescription>Thông tin cơ bản của phiếu nhập</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="receiptNo">Số phiếu nhập</Label>
                  <Input id="receiptNo" value="PN-2024-00125" disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiptDate">Ngày nhập</Label>
                  <Input id="receiptDate" type="date" defaultValue="2024-01-15" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* PO — thêm nút mở modal */}
                <div className="space-y-2">
                  <Label htmlFor="poNumber">Số PO liên kết</Label>
                  <div className="flex gap-2">
                    <Input
                      id="poNumber"
                      placeholder="Nhập số PO..."
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPoModalOpen(true)}
                      title="Tìm PO"
                    >
                      <Search className="size-4" />
                    </Button>
                  </div>
                  {poNumber && (
                    <p className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="size-3" /> PO đã được liên kết
                    </p>
                  )}
                </div>

                {/* Nhà cung cấp — thêm state + validation */}
                <div className="space-y-2">
                  <Label htmlFor="supplier">
                    Nhà cung cấp <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={supplier}
                    onValueChange={(v) => {
                      setSupplier(v)
                      if (submitted) setErrors((prev) => ({ ...prev, supplier: undefined }))
                    }}
                  >
                    <SelectTrigger className={errors.supplier ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Chọn nhà cung cấp" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ncc1">Công ty Len Việt Nam</SelectItem>
                      <SelectItem value="ncc2">Công ty TNHH ABC</SelectItem>
                      <SelectItem value="ncc3">Nhà cung cấp XYZ</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.supplier} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Kho nhập — thêm validation */}
                <div className="space-y-2">
                  <Label htmlFor="warehouse">
                    Kho nhập <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={warehouse}
                    onValueChange={(v) => {
                      setWarehouse(v)
                      if (submitted) setErrors((prev) => ({ ...prev, warehouse: undefined }))
                    }}
                  >
                    <SelectTrigger className={errors.warehouse ? 'border-destructive' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">Kho chính - NVL</SelectItem>
                      <SelectItem value="sub">Kho phụ</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.warehouse} />
                </div>

                {/* Loại nhập — thêm validation */}
                <div className="space-y-2">
                  <Label htmlFor="type">
                    Loại nhập <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={receiptType}
                    onValueChange={(v) => {
                      setReceiptType(v)
                      if (submitted) setErrors((prev) => ({ ...prev, receiptType: undefined }))
                    }}
                  >
                    <SelectTrigger className={errors.receiptType ? 'border-destructive' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="po">Nhập theo PO</SelectItem>
                      <SelectItem value="return">Nhập trả lại</SelectItem>
                      <SelectItem value="transfer">Chuyển kho</SelectItem>
                      <SelectItem value="other">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.receiptType} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Ghi chú</Label>
                <Textarea id="notes" placeholder="Nhập ghi chú..." rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* ── Tài liệu đính kèm ── (thêm upload thực + xoá) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tài liệu đính kèm</CardTitle>
              <CardDescription>Invoice, phiếu giao hàng, hình ảnh</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center gap-2">
                <Upload className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Kéo thả hoặc click để upload</p>
                <p className="text-xs text-muted-foreground">PDF, JPG, PNG (max 10MB)</p>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                />
              </label>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30 group">
                      {file.type === 'pdf'
                        ? <FileText className="size-4 text-blue-500 shrink-0" />
                        : <Camera className="size-4 text-green-500 shrink-0" />
                      }
                      <span className="text-sm flex-1 truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeAttachment(idx)}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Danh sách vật tư ── (layout giữ nguyên, thêm validation từng dòng) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Danh sách vật tư nhập</CardTitle>
                <CardDescription>Thêm các vật tư cần nhập kho</CardDescription>
              </div>
              <Button onClick={addItem} size="sm">
                <Plus className="size-4 mr-2" />
                Thêm dòng
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Lỗi chung khi chưa có dòng nào */}
            {errors.items && items.length === 0 && (
              <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="size-4 shrink-0" />
                {errors.items}
              </div>
            )}

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Mã vật tư <span className="text-destructive">*</span></TableHead>
                    <TableHead>Tên vật tư <span className="text-destructive">*</span></TableHead>
                    <TableHead>ĐVT <span className="text-destructive">*</span></TableHead>
                    <TableHead className="text-right">SL theo PO</TableHead>
                    <TableHead className="text-right">SL thực nhận <span className="text-destructive">*</span></TableHead>
                    <TableHead>Vị trí kho <span className="text-destructive">*</span></TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                        Chưa có vật tư. Tìm PO để tự điền hoặc thêm thủ công.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow
                        key={item.id}
                        className={errors.rows?.[item.id] ? 'bg-destructive/5' : ''}
                      >
                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>

                        <TableCell>
                          <Input
                            value={item.materialCode}
                            onChange={(e) => updateItem(item.id, 'materialCode', e.target.value)}
                            className={`w-28 ${rowErr(item.id, 'materialCode') ? 'border-destructive' : ''}`}
                            placeholder="Mã VT"
                          />
                          <FieldError message={rowErr(item.id, 'materialCode')} />
                        </TableCell>

                        <TableCell>
                          <Input
                            value={item.materialName}
                            onChange={(e) => updateItem(item.id, 'materialName', e.target.value)}
                            className={rowErr(item.id, 'materialName') ? 'border-destructive' : ''}
                            placeholder="Tên vật tư"
                          />
                          <FieldError message={rowErr(item.id, 'materialName')} />
                        </TableCell>

                        <TableCell>
                          <Input
                            value={item.unit}
                            onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                            className={`w-20 ${rowErr(item.id, 'unit') ? 'border-destructive' : ''}`}
                            placeholder="ĐVT"
                          />
                          <FieldError message={rowErr(item.id, 'unit')} />
                        </TableCell>

                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={item.poQuantity || ''}
                            onChange={(e) => updateItem(item.id, 'poQuantity', parseInt(e.target.value) || 0)}
                            className="w-24 text-right"
                            placeholder="0"
                          />
                        </TableCell>

                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={item.receivedQuantity || ''}
                            onChange={(e) => updateItem(item.id, 'receivedQuantity', parseInt(e.target.value) || 0)}
                            className={`w-24 text-right ${rowErr(item.id, 'receivedQuantity') ? 'border-destructive' : ''}`}
                            placeholder="0"
                          />
                          <FieldError message={rowErr(item.id, 'receivedQuantity')} />
                        </TableCell>

                        <TableCell>
                          <Select
                            value={item.location}
                            onValueChange={(value) => updateItem(item.id, 'location', value)}
                          >
                            <SelectTrigger className={`w-28 ${rowErr(item.id, 'location') ? 'border-destructive' : ''}`}>
                              <SelectValue placeholder="Chọn" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A-01-01">A-01-01</SelectItem>
                              <SelectItem value="A-01-02">A-01-02</SelectItem>
                              <SelectItem value="A-02-01">A-02-01</SelectItem>
                              <SelectItem value="B-01-01">B-01-01</SelectItem>
                            </SelectContent>
                          </Select>
                          <FieldError message={rowErr(item.id, 'location')} />
                        </TableCell>

                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Summary — giữ nguyên */}
            {items.length > 0 && (
              <div className="flex justify-end mt-4 pt-4 border-t">
                <div className="text-right space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Tổng số dòng: <span className="font-medium text-foreground">{items.length}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tổng SL nhập:{' '}
                    <span className="font-medium text-foreground">
                      {items.reduce((sum, item) => sum + item.receivedQuantity, 0)}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── PO Search Modal ── */}
      <Dialog open={poModalOpen} onOpenChange={setPoModalOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Tìm kiếm PO</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Nhập số PO hoặc tên nhà cung cấp..."
                value={poQuery}
                onChange={(e) => setPoQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {poResults.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  Không tìm thấy PO phù hợp
                </p>
              ) : (
                poResults.map(([key, po]) => (
                  <button
                    key={key}
                    onClick={() => handleSelectPO(key)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{key}</span>
                      <Badge variant="secondary">{po.items.length} vật tư</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{po.supplier}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {po.items.map((i) => i.materialName).join(' · ')}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}

export default withPermission(CreateReceivingPage, ['admin', 'kho_manager'])
