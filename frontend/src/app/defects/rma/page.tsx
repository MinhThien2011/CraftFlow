'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { RotateCcw, Search, Eye, CheckCircle2, XCircle, Package, ClipboardCheck, Camera } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface RMAItem {
  id: string
  code: string
  customerName: string
  orderCode: string
  products: { name: string; quantity: number; reason: string }[]
  createdAt: Date
  status: 'pending_approval' | 'approved' | 'received' | 'qc_checking' | 'resolved' | 'rejected'
  qcResult?: 'refund' | 'replace' | 'repair' | 'reject'
}

const rmaItems: RMAItem[] = [
  {
    id: '1',
    code: 'RMA-2024-008',
    customerName: 'Cửa hàng Gấu Bông 123',
    orderCode: 'ORD-2024-056',
    products: [
      { name: 'Gấu bông Teddy Size L', quantity: 2, reason: 'Đường may bị bung' },
      { name: 'Thỏ Handmade', quantity: 1, reason: 'Màu sắc không đúng' }
    ],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: 'pending_approval'
  },
  {
    id: '2',
    code: 'RMA-2024-009',
    customerName: 'Shop Đồ Chơi Online',
    orderCode: 'ORD-2024-062',
    products: [
      { name: 'Gấu bông Mini', quantity: 5, reason: 'Bông nhồi không đều' }
    ],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    status: 'approved'
  },
  {
    id: '3',
    code: 'RMA-2024-007',
    customerName: 'Siêu thị ABC',
    orderCode: 'ORD-2024-048',
    products: [
      { name: 'Túi đeo chéo Handmade', quantity: 3, reason: 'Dây đeo bị lỗi' }
    ],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    status: 'qc_checking'
  }
]

const statusConfig = {
  pending_approval: { label: 'Chờ phê duyệt', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Đã duyệt', color: 'bg-blue-100 text-blue-700' },
  received: { label: 'Đã nhận hàng', color: 'bg-indigo-100 text-indigo-700' },
  qc_checking: { label: 'Đang kiểm tra QC', color: 'bg-purple-100 text-purple-700' },
  resolved: { label: 'Đã xử lý', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-700' }
}

export default function RMAPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [qcDecision, setQcDecision] = useState('')
  const [qcNote, setQcNote] = useState('')

  const filteredItems = rmaItems.filter((item) =>
    item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AppShell 
      title="Hàng trả từ khách (RMA)" 
      subtitle="Xử lý yêu cầu trả hàng và kiểm tra chất lượng"
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-100 p-3">
                  <RotateCcw className="size-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chờ duyệt</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3">
                  <Package className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chờ nhận hàng</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-purple-100 p-3">
                  <ClipboardCheck className="size-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đang kiểm QC</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-emerald-100 p-3">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đã xử lý tháng này</p>
                  <p className="text-2xl font-bold">15</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RMA Table with Tabs */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-semibold">Danh sách RMA</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">Tất cả</TabsTrigger>
                <TabsTrigger value="pending">Chờ duyệt</TabsTrigger>
                <TabsTrigger value="qc">Đang QC</TabsTrigger>
                <TabsTrigger value="resolved">Đã xử lý</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã RMA</TableHead>
                        <TableHead>Khách hàng</TableHead>
                        <TableHead>Mã đơn hàng</TableHead>
                        <TableHead>Sản phẩm trả</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Ngày tạo</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.code}</TableCell>
                          <TableCell>{item.customerName}</TableCell>
                          <TableCell className="text-muted-foreground">{item.orderCode}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {item.products.map((p, i) => (
                                <p key={i} className="text-sm">
                                  • {p.name} × {p.quantity}
                                </p>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig[item.status].color}>
                              {statusConfig[item.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(item.createdAt, 'dd/MM/yyyy', { locale: vi })}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8">
                                    <Eye className="size-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[700px]">
                                  <DialogHeader>
                                    <DialogTitle>Chi tiết RMA {item.code}</DialogTitle>
                                    <DialogDescription>
                                      Khách hàng: {item.customerName} | Đơn hàng: {item.orderCode}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    {/* Product List */}
                                    <div>
                                      <Label className="text-muted-foreground">Sản phẩm trả lại</Label>
                                      <div className="mt-2 rounded-lg border divide-y">
                                        {item.products.map((p, i) => (
                                          <div key={i} className="p-3 flex justify-between items-start">
                                            <div>
                                              <p className="font-medium">{p.name}</p>
                                              <p className="text-sm text-muted-foreground">Lý do: {p.reason}</p>
                                            </div>
                                            <Badge variant="secondary">{p.quantity} sản phẩm</Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* QC Decision Section - Only show for qc_checking status */}
                                    {item.status === 'qc_checking' && (
                                      <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                                        <h4 className="font-medium">Kết quả kiểm tra QC</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <Label>Quyết định xử lý</Label>
                                            <Select value={qcDecision} onValueChange={setQcDecision}>
                                              <SelectTrigger>
                                                <SelectValue placeholder="Chọn phương án" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="refund">Hoàn tiền</SelectItem>
                                                <SelectItem value="replace">Đổi hàng mới</SelectItem>
                                                <SelectItem value="repair">Sửa chữa</SelectItem>
                                                <SelectItem value="reject">Từ chối (lỗi của KH)</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className="space-y-2">
                                            <Label>Chụp ảnh bằng chứng</Label>
                                            <Button variant="outline" className="w-full">
                                              <Camera className="size-4 mr-2" />
                                              Chụp ảnh
                                            </Button>
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Ghi chú QC</Label>
                                          <Textarea 
                                            placeholder="Mô tả chi tiết tình trạng sản phẩm..."
                                            value={qcNote}
                                            onChange={(e) => setQcNote(e.target.value)}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <DialogFooter className="gap-2">
                                    {item.status === 'pending_approval' && (
                                      <>
                                        <Button variant="outline" className="text-red-600">
                                          <XCircle className="mr-2 size-4" />
                                          Từ chối RMA
                                        </Button>
                                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                                          <CheckCircle2 className="mr-2 size-4" />
                                          Phê duyệt RMA
                                        </Button>
                                      </>
                                    )}
                                    {item.status === 'qc_checking' && (
                                      <Button className="bg-primary">
                                        Xác nhận kết quả QC
                                      </Button>
                                    )}
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              {item.status === 'pending_approval' && (
                                <>
                                  <Button variant="ghost" size="icon" className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                                    <CheckCircle2 className="size-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                                    <XCircle className="size-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="pending">
                <p className="text-muted-foreground text-center py-8">
                  Hiển thị các RMA đang chờ phê duyệt
                </p>
              </TabsContent>

              <TabsContent value="qc">
                <p className="text-muted-foreground text-center py-8">
                  Hiển thị các RMA đang trong quá trình kiểm tra QC
                </p>
              </TabsContent>

              <TabsContent value="resolved">
                <p className="text-muted-foreground text-center py-8">
                  Hiển thị các RMA đã xử lý xong
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
