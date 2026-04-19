'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { Clipboard, Plus, Search, Play, Pause, CheckCircle2, AlertTriangle, FileSignature, Calculator } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
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
  status: 'draft' | 'in_progress' | 'completed' | 'approved'
}

interface StocktakeItem {
  id: string
  itemCode: string
  itemName: string
  location: string
  systemQty: number
  countedQty: number | null
  unit: string
  discrepancy: number | null
  note: string
}

const stocktakeSessions: StocktakeSession[] = [
  {
    id: '1',
    code: 'KK-2024-015',
    type: 'cycle',
    zone: 'A - Nguyên liệu',
    totalItems: 25,
    countedItems: 20,
    discrepancies: 3,
    createdBy: 'Nguyễn Văn Kho',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    status: 'in_progress'
  },
  {
    id: '2',
    code: 'KK-2024-014',
    type: 'physical',
    zone: 'Toàn kho',
    totalItems: 150,
    countedItems: 150,
    discrepancies: 8,
    createdBy: 'Trần Thị Kho',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    status: 'completed'
  }
]

const stocktakeItems: StocktakeItem[] = [
  { id: '1', itemCode: 'NVL-001', itemName: 'Len cotton cao cấp', location: 'A1-01', systemQty: 250, countedQty: 248, unit: 'cuộn', discrepancy: -2, note: '' },
  { id: '2', itemCode: 'NVL-002', itemName: 'Len acrylic', location: 'A1-02', systemQty: 180, countedQty: 180, unit: 'cuộn', discrepancy: 0, note: '' },
  { id: '3', itemCode: 'NVL-003', itemName: 'Bông gòn nhồi', location: 'A2-01', systemQty: 50, countedQty: 45, unit: 'kg', discrepancy: -5, note: 'Cần kiểm tra lại' },
  { id: '4', itemCode: 'PK-001', itemName: 'Mắt thú nhồi bông 8mm', location: 'B1-01', systemQty: 500, countedQty: null, unit: 'hộp', discrepancy: null, note: '' },
  { id: '5', itemCode: 'PK-002', itemName: 'Mũi thú nhồi bông', location: 'B1-02', systemQty: 200, countedQty: null, unit: 'cái', discrepancy: null, note: '' }
]

const statusConfig = {
  draft: { label: 'Nháp', color: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'Đang kiểm', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Hoàn thành', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Đã duyệt', color: 'bg-emerald-100 text-emerald-700' }
}

export default function StocktakePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<StocktakeSession | null>(null)

  return (
    <AppShell 
      title="Kiểm kê Kho" 
      subtitle="Cycle Count và Physical Count"
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3">
                  <Play className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đang kiểm kê</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-100 p-3">
                  <Clipboard className="size-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chờ duyệt</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-red-100 p-3">
                  <AlertTriangle className="size-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chênh lệch phát hiện</p>
                  <p className="text-2xl font-bold">11</p>
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
                  <p className="text-sm text-muted-foreground">Đã duyệt tháng này</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stocktake Sessions Table */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-semibold">Phiên kiểm kê</CardTitle>
              <div className="flex gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="size-4 mr-2" />
                      Tạo phiên kiểm kê
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tạo phiên kiểm kê mới</DialogTitle>
                      <DialogDescription>
                        Chọn loại kiểm kê và khu vực cần kiểm
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Loại kiểm kê</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn loại kiểm kê" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cycle">Cycle Count (Kiểm định kỳ)</SelectItem>
                            <SelectItem value="physical">Physical Count (Kiểm toàn bộ)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Khu vực kiểm kê</Label>
                        <Select>
                          <SelectTrigger>
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
                      </div>
                      <div className="space-y-2">
                        <Label>Ghi chú</Label>
                        <Textarea placeholder="Ghi chú cho phiên kiểm kê..." />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
                      <Button>Tạo phiên kiểm kê</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
                    <TableHead>Tiến độ</TableHead>
                    <TableHead>Chênh lệch</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocktakeSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.code}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {session.type === 'cycle' ? 'Cycle Count' : 'Physical Count'}
                        </Badge>
                      </TableCell>
                      <TableCell>{session.zone}</TableCell>
                      <TableCell>
                        <div className="space-y-1 w-32">
                          <div className="flex justify-between text-xs">
                            <span>{session.countedItems}/{session.totalItems}</span>
                            <span>{Math.round((session.countedItems / session.totalItems) * 100)}%</span>
                          </div>
                          <Progress value={(session.countedItems / session.totalItems) * 100} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        {session.discrepancies > 0 ? (
                          <Badge variant="destructive">{session.discrepancies} items</Badge>
                        ) : (
                          <Badge variant="secondary">0</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[session.status].color}>
                          {statusConfig[session.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedSession(session)}
                              >
                                {session.status === 'in_progress' ? (
                                  <>
                                    <Play className="size-4 mr-1" />
                                    Tiếp tục
                                  </>
                                ) : (
                                  'Xem chi tiết'
                                )}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Chi tiết kiểm kê {session.code}</DialogTitle>
                                <DialogDescription>
                                  {session.zone} | {session.type === 'cycle' ? 'Cycle Count' : 'Physical Count'}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Mã SP</TableHead>
                                      <TableHead>Tên sản phẩm</TableHead>
                                      <TableHead>Vị trí</TableHead>
                                      <TableHead className="text-right">SL Hệ thống</TableHead>
                                      <TableHead className="text-right">SL Thực tế</TableHead>
                                      <TableHead className="text-right">Chênh lệch</TableHead>
                                      <TableHead>Ghi chú</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {stocktakeItems.map((item) => (
                                      <TableRow key={item.id} className={item.discrepancy && item.discrepancy !== 0 ? 'bg-red-50' : ''}>
                                        <TableCell className="font-medium">{item.itemCode}</TableCell>
                                        <TableCell>{item.itemName}</TableCell>
                                        <TableCell>{item.location}</TableCell>
                                        <TableCell className="text-right">{item.systemQty} {item.unit}</TableCell>
                                        <TableCell className="text-right">
                                          {item.countedQty !== null ? (
                                            <span>{item.countedQty} {item.unit}</span>
                                          ) : (
                                            <Input type="number" className="w-20 h-8" placeholder="0" />
                                          )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {item.discrepancy !== null && item.discrepancy !== 0 ? (
                                            <span className={item.discrepancy < 0 ? 'text-red-600 font-medium' : 'text-emerald-600 font-medium'}>
                                              {item.discrepancy > 0 ? '+' : ''}{item.discrepancy}
                                            </span>
                                          ) : item.discrepancy === 0 ? (
                                            <CheckCircle2 className="size-4 text-emerald-600 inline" />
                                          ) : (
                                            '-'
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {item.note || <Input className="w-32 h-8" placeholder="Ghi chú..." />}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                              <DialogFooter className="gap-2">
                                {session.status === 'in_progress' && (
                                  <>
                                    <Button variant="outline">
                                      <Pause className="size-4 mr-2" />
                                      Tạm dừng
                                    </Button>
                                    <Button>
                                      <CheckCircle2 className="size-4 mr-2" />
                                      Hoàn thành kiểm kê
                                    </Button>
                                  </>
                                )}
                                {session.status === 'completed' && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button className="bg-emerald-600 hover:bg-emerald-700">
                                        <Calculator className="size-4 mr-2" />
                                        Điều chỉnh & Duyệt
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Điều chỉnh chênh lệch</DialogTitle>
                                        <DialogDescription>
                                          Xác nhận điều chỉnh {session.discrepancies} mặt hàng có chênh lệch
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                          <Label>Lý do điều chỉnh</Label>
                                          <Textarea placeholder="Nhập lý do điều chỉnh chênh lệch..." />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Chữ ký xác nhận</Label>
                                          <Button variant="outline" className="w-full">
                                            <FileSignature className="size-4 mr-2" />
                                            Ký xác nhận điều chỉnh
                                          </Button>
                                        </div>
                                      </div>
                                      <DialogFooter>
                                        <Button variant="outline">Hủy</Button>
                                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                                          Xác nhận điều chỉnh
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                )}
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
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
    </AppShell>
  )
}
