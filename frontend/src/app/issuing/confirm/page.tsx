'use client'

import { useState } from 'react'
import { Search, CheckCircle2, UserCheck, Package, PenTool, AlertTriangle } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { Checkbox } from '@/components/ui/checkbox'

const confirmItems = [
  {
    id: 'PX-2024-00089',
    pickListNo: 'PL-2024-001',
    department: 'Xưởng sản xuất A',
    productionOrder: 'LSX-2024-001',
    pickedBy: 'Nguyễn Văn A',
    pickedAt: '2024-01-15 11:30',
    totalItems: 4,
    totalQuantity: 300,
    status: 'waiting_confirm',
    warehouseConfirm: true,
    receiverConfirm: false
  },
  {
    id: 'PX-2024-00086',
    pickListNo: 'PL-2024-003',
    department: 'Xưởng đóng gói',
    productionOrder: 'LSX-2024-005',
    pickedBy: 'Trần Văn B',
    pickedAt: '2024-01-15 10:00',
    totalItems: 6,
    totalQuantity: 450,
    status: 'waiting_confirm',
    warehouseConfirm: false,
    receiverConfirm: false
  },
  {
    id: 'PX-2024-00085',
    pickListNo: 'PL-2024-004',
    department: 'Xưởng sản xuất B',
    productionOrder: 'LSX-2024-006',
    pickedBy: 'Lê Thị C',
    pickedAt: '2024-01-14 16:30',
    totalItems: 3,
    totalQuantity: 150,
    status: 'completed',
    warehouseConfirm: true,
    receiverConfirm: true
  }
]

export default function DualConfirmPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<(typeof confirmItems)[0] | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [signatureConfirmed, setSignatureConfirmed] = useState(false)

  const filteredItems = confirmItems.filter(
    (item) =>
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.department.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingCount = confirmItems.filter((i) => i.status === 'waiting_confirm').length

  return (
    <AppShell
      title="Dual Confirmation"
      subtitle="Xác nhận hai bên (Kho và Người nhận) khi giao hàng"
    >
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-end">
          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200">
            <AlertTriangle className="size-3" />
            {pendingCount} chờ xác nhận
          </Badge>
        </div>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <UserCheck className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Quy trình Dual Confirmation</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Mỗi phiếu xuất kho cần được xác nhận bởi cả Thủ kho (người giao) và Người nhận hàng
                  (Production). Cả hai bên đều phải ký xác nhận bằng chữ ký điện tử.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo số phiếu, bộ phận..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Số phiếu xuất</TableHead>
                  <TableHead>Pick List</TableHead>
                  <TableHead>Lệnh SX</TableHead>
                  <TableHead>Bộ phận nhận</TableHead>
                  <TableHead className="text-right">Số lượng</TableHead>
                  <TableHead>Người lấy hàng</TableHead>
                  <TableHead className="text-center">Kho xác nhận</TableHead>
                  <TableHead className="text-center">Người nhận XN</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id}</TableCell>
                    <TableCell>{item.pickListNo}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.productionOrder}</Badge>
                    </TableCell>
                    <TableCell>{item.department}</TableCell>
                    <TableCell className="text-right">
                      {item.totalItems} dòng / {item.totalQuantity} SP
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarFallback className="text-xs">
                            {item.pickedBy
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{item.pickedBy}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.warehouseConfirm ? (
                        <CheckCircle2 className="size-5 text-emerald-500 mx-auto" />
                      ) : (
                        <div className="size-5 rounded-full border-2 border-muted-foreground/30 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.receiverConfirm ? (
                        <CheckCircle2 className="size-5 text-emerald-500 mx-auto" />
                      ) : (
                        <div className="size-5 rounded-full border-2 border-muted-foreground/30 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.status === 'waiting_confirm' ? (
                        <Dialog
                          open={confirmDialogOpen && selectedItem?.id === item.id}
                          onOpenChange={setConfirmDialogOpen}
                        >
                          <DialogTrigger asChild>
                            <Button size="sm" onClick={() => setSelectedItem(item)}>
                              <PenTool className="size-4 mr-1" />
                              Xác nhận
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Xác nhận giao nhận hàng</DialogTitle>
                              <DialogDescription>
                                Phiếu xuất: {item.id} | {item.department}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              {/* Summary */}
                              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Lệnh sản xuất:</span>
                                  <span className="font-medium">{item.productionOrder}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Tổng số lượng:</span>
                                  <span className="font-medium">{item.totalQuantity}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Người lấy hàng:</span>
                                  <span className="font-medium">{item.pickedBy}</span>
                                </div>
                              </div>

                              {/* Confirmation Status */}
                              <div className="space-y-3">
                                <div
                                  className={`flex items-center justify-between p-3 rounded-lg border ${
                                    item.warehouseConfirm
                                      ? 'bg-emerald-50 border-emerald-200'
                                      : 'bg-background'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <Package className="size-5 text-primary" />
                                    <div>
                                      <p className="font-medium text-sm">Thủ kho xác nhận</p>
                                      <p className="text-xs text-muted-foreground">
                                        Xác nhận đã giao đúng số lượng
                                      </p>
                                    </div>
                                  </div>
                                  {item.warehouseConfirm ? (
                                    <CheckCircle2 className="size-5 text-emerald-500" />
                                  ) : (
                                    <Button size="sm" variant="outline">
                                      Ký xác nhận
                                    </Button>
                                  )}
                                </div>

                                <div
                                  className={`flex items-center justify-between p-3 rounded-lg border ${
                                    item.receiverConfirm
                                      ? 'bg-emerald-50 border-emerald-200'
                                      : 'bg-background'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <UserCheck className="size-5 text-blue-500" />
                                    <div>
                                      <p className="font-medium text-sm">Người nhận xác nhận</p>
                                      <p className="text-xs text-muted-foreground">
                                        Xác nhận đã nhận đúng số lượng
                                      </p>
                                    </div>
                                  </div>
                                  {item.receiverConfirm ? (
                                    <CheckCircle2 className="size-5 text-emerald-500" />
                                  ) : (
                                    <Button size="sm" variant="outline">
                                      Ký xác nhận
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Signature */}
                              <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
                                <Checkbox
                                  id="signature"
                                  checked={signatureConfirmed}
                                  onCheckedChange={(checked) =>
                                    setSignatureConfirmed(checked as boolean)
                                  }
                                />
                                <label
                                  htmlFor="signature"
                                  className="text-sm cursor-pointer flex items-center gap-2"
                                >
                                  <PenTool className="size-4 text-primary" />
                                  Ký xác nhận bằng chữ ký điện tử của tôi
                                </label>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                                Đóng
                              </Button>
                              <Button
                                onClick={() => setConfirmDialogOpen(false)}
                                disabled={!signatureConfirmed}
                              >
                                Xác nhận giao nhận
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700">Hoàn thành</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
