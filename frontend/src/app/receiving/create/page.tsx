'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Search, Upload, FileText, Camera } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface ReceivingItem {
  id: string
  materialCode: string
  materialName: string
  unit: string
  poQuantity: number
  receivedQuantity: number
  location: string
}

export default function CreateReceivingPage() {
  const router = useRouter()
  const [items, setItems] = useState<ReceivingItem[]>([
    {
      id: '1',
      materialCode: 'LEN-001',
      materialName: 'Len cotton cao cấp',
      unit: 'cuộn',
      poQuantity: 200,
      receivedQuantity: 200,
      location: 'A-01-01'
    },
    {
      id: '2',
      materialCode: 'LEN-002',
      materialName: 'Len acrylic',
      unit: 'cuộn',
      poQuantity: 150,
      receivedQuantity: 150,
      location: 'A-01-02'
    }
  ])

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        materialCode: '',
        materialName: '',
        unit: '',
        poQuantity: 0,
        receivedQuantity: 0,
        location: ''
      }
    ])
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, field: keyof ReceivingItem, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  return (
    <AppShell title="Tạo phiếu nhập kho" subtitle="Nhập thông tin phiếu nhập kho mới">
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/receiving">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Lưu nháp</Button>
            <Button>Gửi duyệt</Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Thông tin chung */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Thông tin chung</CardTitle>
              <CardDescription>Thông tin cơ bản của phiếu nhập</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="receiptNo">Số phiếu nhập</Label>
                  <Input id="receiptNo" value="PN-2024-00125" disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiptDate">Ngày nhập</Label>
                  <Input id="receiptDate" type="date" defaultValue="2024-01-15" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="poNumber">Số PO liên kết</Label>
                  <div className="flex gap-2">
                    <Input id="poNumber" placeholder="Nhập số PO..." />
                    <Button variant="outline" size="icon">
                      <Search className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Nhà cung cấp</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn nhà cung cấp" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ncc1">Công ty Len Việt Nam</SelectItem>
                      <SelectItem value="ncc2">Công ty TNHH ABC</SelectItem>
                      <SelectItem value="ncc3">Nhà cung cấp XYZ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="warehouse">Kho nhập</Label>
                  <Select defaultValue="main">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">Kho chính - NVL</SelectItem>
                      <SelectItem value="sub">Kho phụ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Loại nhập</Label>
                  <Select defaultValue="po">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="po">Nhập theo PO</SelectItem>
                      <SelectItem value="return">Nhập trả lại</SelectItem>
                      <SelectItem value="transfer">Chuyển kho</SelectItem>
                      <SelectItem value="other">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Ghi chú</Label>
                <Textarea id="notes" placeholder="Nhập ghi chú..." rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* Tài liệu đính kèm */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tài liệu đính kèm</CardTitle>
              <CardDescription>Invoice, phiếu giao hàng, hình ảnh</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="size-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Kéo thả hoặc click để upload
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, JPG, PNG (max 10MB)
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30">
                  <FileText className="size-4 text-blue-500" />
                  <span className="text-sm flex-1 truncate">Invoice-001.pdf</span>
                  <Button variant="ghost" size="icon" className="size-6">
                    <Trash2 className="size-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30">
                  <Camera className="size-4 text-green-500" />
                  <span className="text-sm flex-1 truncate">delivery-photo.jpg</span>
                  <Button variant="ghost" size="icon" className="size-6">
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Danh sách vật tư */}
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
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Mã vật tư</TableHead>
                    <TableHead>Tên vật tư</TableHead>
                    <TableHead>ĐVT</TableHead>
                    <TableHead className="text-right">SL theo PO</TableHead>
                    <TableHead className="text-right">SL thực nhận</TableHead>
                    <TableHead>Vị trí kho</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          value={item.materialCode}
                          onChange={(e) => updateItem(item.id, 'materialCode', e.target.value)}
                          className="w-28"
                          placeholder="Mã VT"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.materialName}
                          onChange={(e) => updateItem(item.id, 'materialName', e.target.value)}
                          placeholder="Tên vật tư"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.unit}
                          onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                          className="w-20"
                          placeholder="ĐVT"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={item.poQuantity}
                          onChange={(e) => updateItem(item.id, 'poQuantity', parseInt(e.target.value))}
                          className="w-24 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={item.receivedQuantity}
                          onChange={(e) =>
                            updateItem(item.id, 'receivedQuantity', parseInt(e.target.value))
                          }
                          className="w-24 text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.location}
                          onValueChange={(value) => updateItem(item.id, 'location', value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue placeholder="Chọn" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A-01-01">A-01-01</SelectItem>
                            <SelectItem value="A-01-02">A-01-02</SelectItem>
                            <SelectItem value="A-02-01">A-02-01</SelectItem>
                            <SelectItem value="B-01-01">B-01-01</SelectItem>
                          </SelectContent>
                        </Select>
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
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
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
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
