'use client'

import { useState } from 'react'
import { Search, Check, X, Eye, Clock, FileText, PenTool } from 'lucide-react'
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

const pendingReceipts = [
  {
    id: 'PN-2024-00125',
    poNumber: 'PO-2024-001',
    supplier: 'Công ty Len Việt Nam',
    totalItems: 5,
    totalQuantity: 850,
    createdBy: 'Nguyễn Văn A',
    createdAt: '2024-01-15 09:30',
    qcStatus: 'passed',
    amount: '45,000,000 VND'
  },
  {
    id: 'PN-2024-00124',
    poNumber: 'PO-2024-002',
    supplier: 'Công ty TNHH ABC',
    totalItems: 3,
    totalQuantity: 500,
    createdBy: 'Trần Văn B',
    createdAt: '2024-01-15 08:15',
    qcStatus: 'passed',
    amount: '12,500,000 VND'
  },
  {
    id: 'PN-2024-00123',
    poNumber: 'PO-2024-003',
    supplier: 'Nhà cung cấp XYZ',
    totalItems: 8,
    totalQuantity: 1200,
    createdBy: 'Lê Thị C',
    createdAt: '2024-01-14 16:45',
    qcStatus: 'pending',
    amount: '78,000,000 VND'
  }
]

export default function ReceivingPendingPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState<(typeof pendingReceipts)[0] | null>(null)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [signatureConfirmed, setSignatureConfirmed] = useState(false)

  const filteredReceipts = pendingReceipts.filter(
    (receipt) =>
      receipt.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.poNumber.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <AppShell
      title="Phiếu nhập chờ duyệt"
      subtitle="Duyệt các phiếu nhập kho đã qua QC"
    >
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-end">
          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200">
            <Clock className="size-3" />
            {pendingReceipts.length} phiếu chờ duyệt
          </Badge>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo số phiếu, PO, nhà cung cấp..."
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
                  <TableHead>Số phiếu nhập</TableHead>
                  <TableHead>Số PO</TableHead>
                  <TableHead>Nhà cung cấp</TableHead>
                  <TableHead className="text-right">Số dòng</TableHead>
                  <TableHead className="text-right">Tổng SL</TableHead>
                  <TableHead className="text-right">Giá trị</TableHead>
                  <TableHead>QC</TableHead>
                  <TableHead>Người tạo</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.id}</TableCell>
                    <TableCell>{receipt.poNumber}</TableCell>
                    <TableCell>{receipt.supplier}</TableCell>
                    <TableCell className="text-right">{receipt.totalItems}</TableCell>
                    <TableCell className="text-right">{receipt.totalQuantity}</TableCell>
                    <TableCell className="text-right font-medium">{receipt.amount}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          receipt.qcStatus === 'passed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }
                      >
                        {receipt.qcStatus === 'passed' ? 'Đã QC' : 'Chờ QC'}
                      </Badge>
                    </TableCell>
                    <TableCell>{receipt.createdBy}</TableCell>
                    <TableCell>{receipt.createdAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8">
                          <Eye className="size-4" />
                        </Button>
                        
                        {/* Approve Dialog */}
                        <Dialog open={approveDialogOpen && selectedReceipt?.id === receipt.id} onOpenChange={setApproveDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => setSelectedReceipt(receipt)}
                              disabled={receipt.qcStatus !== 'passed'}
                            >
                              <Check className="size-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Duyệt phiếu nhập kho</DialogTitle>
                              <DialogDescription>
                                Xác nhận duyệt phiếu nhập {receipt.id}?
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Nhà cung cấp:</span>
                                  <span className="font-medium">{receipt.supplier}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Tổng số lượng:</span>
                                  <span className="font-medium">{receipt.totalQuantity}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Giá trị:</span>
                                  <span className="font-medium">{receipt.amount}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
                                <Checkbox
                                  id="signature"
                                  checked={signatureConfirmed}
                                  onCheckedChange={(checked) => setSignatureConfirmed(checked as boolean)}
                                />
                                <label htmlFor="signature" className="text-sm cursor-pointer flex items-center gap-2">
                                  <PenTool className="size-4 text-primary" />
                                  Ký xác nhận bằng chữ ký điện tử
                                </label>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                                Hủy
                              </Button>
                              <Button
                                onClick={() => setApproveDialogOpen(false)}
                                disabled={!signatureConfirmed}
                              >
                                <Check className="size-4 mr-2" />
                                Duyệt phiếu
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {/* Reject Dialog */}
                        <Dialog open={rejectDialogOpen && selectedReceipt?.id === receipt.id} onOpenChange={setRejectDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setSelectedReceipt(receipt)}
                            >
                              <X className="size-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Từ chối phiếu nhập kho</DialogTitle>
                              <DialogDescription>
                                Vui lòng nhập lý do từ chối phiếu {receipt.id}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="rejectReason">Lý do từ chối</Label>
                                <Textarea
                                  id="rejectReason"
                                  placeholder="Nhập lý do từ chối..."
                                  rows={4}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                                Hủy
                              </Button>
                              <Button variant="destructive" onClick={() => setRejectDialogOpen(false)}>
                                <X className="size-4 mr-2" />
                                Từ chối
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
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
