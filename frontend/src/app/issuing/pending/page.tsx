'use client'

import { useState } from 'react'
import { Search, Check, X, Eye, Clock, PenTool } from 'lucide-react'
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

const pendingIssues = [
  {
    id: 'PX-2024-00089',
    requisitionNo: 'REQ-2024-0045',
    department: 'Xưởng sản xuất A',
    totalItems: 5,
    totalQuantity: 120,
    requestedBy: 'Nguyễn Văn A',
    requestedAt: '2024-01-15 10:30',
    priority: 'high',
    productionOrder: 'LSX-2024-001'
  },
  {
    id: 'PX-2024-00088',
    requisitionNo: 'REQ-2024-0044',
    department: 'Xưởng sản xuất B',
    totalItems: 3,
    totalQuantity: 80,
    requestedBy: 'Trần Văn B',
    requestedAt: '2024-01-15 09:15',
    priority: 'normal',
    productionOrder: 'LSX-2024-002'
  },
  {
    id: 'PX-2024-00087',
    requisitionNo: 'REQ-2024-0043',
    department: 'Xưởng đóng gói',
    totalItems: 8,
    totalQuantity: 500,
    requestedBy: 'Lê Thị C',
    requestedAt: '2024-01-14 16:45',
    priority: 'normal',
    productionOrder: 'LSX-2024-003'
  }
]

export default function IssuingPendingPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIssue, setSelectedIssue] = useState<(typeof pendingIssues)[0] | null>(null)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [signatureConfirmed, setSignatureConfirmed] = useState(false)

  const filteredIssues = pendingIssues.filter(
    (issue) =>
      issue.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.requisitionNo.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <AppShell
      title="Phiếu xuất chờ duyệt"
      subtitle="Duyệt các phiếu xuất kho trước khi thực hiện xuất"
    >
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-end">
          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200">
            <Clock className="size-3" />
            {pendingIssues.length} phiếu chờ duyệt
          </Badge>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo số phiếu, bộ phận, requisition..."
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
                  <TableHead>Số Requisition</TableHead>
                  <TableHead>Lệnh sản xuất</TableHead>
                  <TableHead>Bộ phận</TableHead>
                  <TableHead className="text-right">Số dòng</TableHead>
                  <TableHead className="text-right">Tổng SL</TableHead>
                  <TableHead>Độ ưu tiên</TableHead>
                  <TableHead>Người yêu cầu</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium">{issue.id}</TableCell>
                    <TableCell>{issue.requisitionNo}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{issue.productionOrder}</Badge>
                    </TableCell>
                    <TableCell>{issue.department}</TableCell>
                    <TableCell className="text-right">{issue.totalItems}</TableCell>
                    <TableCell className="text-right">{issue.totalQuantity}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          issue.priority === 'high'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }
                      >
                        {issue.priority === 'high' ? 'Cao' : 'Bình thường'}
                      </Badge>
                    </TableCell>
                    <TableCell>{issue.requestedBy}</TableCell>
                    <TableCell>{issue.requestedAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8">
                          <Eye className="size-4" />
                        </Button>

                        {/* Approve Dialog */}
                        <Dialog
                          open={approveDialogOpen && selectedIssue?.id === issue.id}
                          onOpenChange={setApproveDialogOpen}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => setSelectedIssue(issue)}
                            >
                              <Check className="size-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Duyệt phiếu xuất kho</DialogTitle>
                              <DialogDescription>
                                Xác nhận duyệt phiếu xuất {issue.id}?
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Bộ phận:</span>
                                  <span className="font-medium">{issue.department}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Lệnh sản xuất:</span>
                                  <span className="font-medium">{issue.productionOrder}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Tổng số lượng:</span>
                                  <span className="font-medium">{issue.totalQuantity}</span>
                                </div>
                              </div>

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
                                Duyệt và tạo Pick List
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {/* Reject Dialog */}
                        <Dialog
                          open={rejectDialogOpen && selectedIssue?.id === issue.id}
                          onOpenChange={setRejectDialogOpen}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setSelectedIssue(issue)}
                            >
                              <X className="size-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Từ chối phiếu xuất kho</DialogTitle>
                              <DialogDescription>
                                Vui lòng nhập lý do từ chối phiếu {issue.id}
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
                              <Button
                                variant="destructive"
                                onClick={() => setRejectDialogOpen(false)}
                              >
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
