'use client'

import { useState } from 'react'
import { Search, Filter, CheckCircle2, XCircle, Clock, AlertTriangle, Eye, FileCheck } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogTrigger
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

const qcItems = [
  {
    id: 'QC-001',
    receiptNo: 'PN-2024-00123',
    materialCode: 'LEN-001',
    materialName: 'Len cotton cao cấp',
    supplier: 'Công ty Len Việt Nam',
    quantity: 200,
    unit: 'cuộn',
    receivedDate: '2024-01-15',
    status: 'pending',
    priority: 'high'
  },
  {
    id: 'QC-002',
    receiptNo: 'PN-2024-00124',
    materialCode: 'PKN-003',
    materialName: 'Phụ kiện nút áo',
    supplier: 'Công ty TNHH ABC',
    quantity: 500,
    unit: 'bộ',
    receivedDate: '2024-01-15',
    status: 'checking',
    priority: 'normal'
  },
  {
    id: 'QC-003',
    receiptNo: 'PN-2024-00120',
    materialCode: 'LEN-002',
    materialName: 'Len acrylic',
    supplier: 'Nhà cung cấp XYZ',
    quantity: 150,
    unit: 'cuộn',
    receivedDate: '2024-01-14',
    status: 'passed',
    priority: 'normal'
  },
  {
    id: 'QC-004',
    receiptNo: 'PN-2024-00118',
    materialCode: 'VAI-001',
    materialName: 'Vải lót',
    supplier: 'Công ty Vải VN',
    quantity: 100,
    unit: 'm',
    receivedDate: '2024-01-13',
    status: 'failed',
    priority: 'high',
    failReason: 'Không đạt tiêu chuẩn màu sắc'
  }
]

const qcChecklist = [
  { id: 'visual', label: 'Kiểm tra ngoại quan' },
  { id: 'color', label: 'Kiểm tra màu sắc' },
  { id: 'dimension', label: 'Kiểm tra kích thước' },
  { id: 'weight', label: 'Kiểm tra trọng lượng' },
  { id: 'packaging', label: 'Kiểm tra bao bì' },
  { id: 'quantity', label: 'Kiểm tra số lượng' },
  { id: 'document', label: 'Kiểm tra chứng từ' }
]

const statusConfig = {
  pending: { label: 'Chờ QC', color: 'bg-amber-100 text-amber-700', icon: Clock },
  checking: { label: 'Đang kiểm tra', color: 'bg-blue-100 text-blue-700', icon: Eye },
  passed: { label: 'Đạt', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  failed: { label: 'Không đạt', color: 'bg-red-100 text-red-700', icon: XCircle }
}

export default function ReceivingQCPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedItem, setSelectedItem] = useState<(typeof qcItems)[0] | null>(null)
  const [qcDialogOpen, setQcDialogOpen] = useState(false)
  const [checkedItems, setCheckedItems] = useState<string[]>([])

  const filteredItems = qcItems.filter((item) => {
    const matchesSearch =
      item.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.materialCode.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    pending: qcItems.filter((i) => i.status === 'pending').length,
    checking: qcItems.filter((i) => i.status === 'checking').length,
    passed: qcItems.filter((i) => i.status === 'passed').length,
    failed: qcItems.filter((i) => i.status === 'failed').length
  }

  return (
    <AppShell
      title="Kiểm tra chất lượng (QC)"
      subtitle="Kiểm tra chất lượng hàng nhập kho trước khi nhập chính thức"
    >
      <div className="flex flex-col gap-6 p-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Chờ QC</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                </div>
                <Clock className="size-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đang kiểm tra</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.checking}</p>
                </div>
                <Eye className="size-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đạt</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.passed}</p>
                </div>
                <CheckCircle2 className="size-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Không đạt</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                </div>
                <XCircle className="size-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="pending">Chờ QC</SelectItem>
                    <SelectItem value="checking">Đang kiểm tra</SelectItem>
                    <SelectItem value="passed">Đạt</SelectItem>
                    <SelectItem value="failed">Không đạt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const StatusIcon = statusConfig[item.status as keyof typeof statusConfig].icon
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>{item.receiptNo}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.materialName}</p>
                          <p className="text-xs text-muted-foreground">{item.materialCode}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.supplier}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell>{item.receivedDate}</TableCell>
                      <TableCell>
                        <Badge
                          className={`gap-1 ${statusConfig[item.status as keyof typeof statusConfig].color}`}
                        >
                          <StatusIcon className="size-3" />
                          {statusConfig[item.status as keyof typeof statusConfig].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.status === 'pending' || item.status === 'checking' ? (
                          <Dialog open={qcDialogOpen && selectedItem?.id === item.id} onOpenChange={setQcDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => setSelectedItem(item)}
                              >
                                <FileCheck className="size-4 mr-1" />
                                Kiểm tra
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Kiểm tra chất lượng - {item.materialName}</DialogTitle>
                                <DialogDescription>
                                  Phiếu nhập: {item.receiptNo} | Số lượng: {item.quantity} {item.unit}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-3">
                                  <Label className="font-medium">Checklist kiểm tra</Label>
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    {qcChecklist.map((check) => (
                                      <div key={check.id} className="flex items-center gap-2">
                                        <Checkbox
                                          id={check.id}
                                          checked={checkedItems.includes(check.id)}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setCheckedItems([...checkedItems, check.id])
                                            } else {
                                              setCheckedItems(checkedItems.filter((i) => i !== check.id))
                                            }
                                          }}
                                        />
                                        <label htmlFor={check.id} className="text-sm cursor-pointer">
                                          {check.label}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="qcNotes">Ghi chú kiểm tra</Label>
                                  <Textarea
                                    id="qcNotes"
                                    placeholder="Nhập ghi chú kết quả kiểm tra..."
                                    rows={3}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="qcResult">Kết quả</Label>
                                  <Select>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Chọn kết quả" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="passed">Đạt - Cho phép nhập kho</SelectItem>
                                      <SelectItem value="failed">Không đạt - Từ chối</SelectItem>
                                      <SelectItem value="partial">Đạt một phần - Nhập có điều kiện</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setQcDialogOpen(false)}>
                                  Hủy
                                </Button>
                                <Button onClick={() => setQcDialogOpen(false)}>
                                  Xác nhận kết quả
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <Button variant="ghost" size="sm">
                            <Eye className="size-4 mr-1" />
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
      </div>
    </AppShell>
  )
}
