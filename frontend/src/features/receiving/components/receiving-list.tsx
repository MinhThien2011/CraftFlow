'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { 
  PackagePlus, 
  Search, 
  Eye, 
  Check, 
  X, 
  QrCode, 
  FileSignature, 
  Truck, 
  AlertCircle 
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'

import { useReceivingSlips, useUpdateSlipStatus } from '../hooks/use-receiving'
import { ReceivingStatus } from '../types'

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  received: 'bg-blue-100 text-blue-700',
  inspected: 'bg-emerald-100 text-emerald-700',
  in_stock: 'bg-emerald-500 text-white',
  completed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700'
}

const statusLabels: Record<string, string> = {
  pending: 'Chờ xử lý',
  received: 'Đã nhận hàng',
  inspected: 'Đã kiểm tra',
  in_stock: 'Đã vào kho',
  completed: 'Hoàn tất',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy'
}

interface ReceivingListProps {
  onShowQR: (slip: any) => void
  onOpenScanner: () => void
}

export function ReceivingList({ onShowQR, onOpenScanner }: ReceivingListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<ReceivingStatus | 'all'>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch } = useReceivingSlips({
    page,
    limit: 10,
    type: 'import',
    status: activeTab === 'all' ? undefined : activeTab,
    search: searchTerm
  })

  const updateStatusMutation = useUpdateSlipStatus()

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-destructive gap-4">
        <AlertCircle className="size-12" />
        <p>Không thể tải danh sách phiếu nhập kho.</p>
        <Button variant="outline" onClick={() => refetch()}>Thử lại</Button>
      </div>
    )
  }

  const slips = data?.data?.slips || []

  return (
    <div className="space-y-6">
      {/* Summary Stats (Can be extracted further if needed) */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="rounded-lg bg-primary/10 p-3"><PackagePlus className="size-5 text-primary" /></div>
          <div><p className="text-sm text-muted-foreground">Tổng phiếu</p><p className="text-2xl font-bold">{data?.data?.pagination?.total || 0}</p></div>
        </CardContent></Card>
        {/* Other stat cards... */}
      </div>

      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <CardHeader className="pb-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <TabsList>
                  <TabsTrigger value="all">Tất cả</TabsTrigger>
                  <TabsTrigger value="pending">Chờ xử lý</TabsTrigger>
                  <TabsTrigger value="inspected">Đã kiểm tra</TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      placeholder="Tìm mã phiếu..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="pl-9 w-64" 
                    />
                  </div>
                  <Button onClick={onOpenScanner} variant="outline"><QrCode className="mr-2 size-4" />Quét QR</Button>
                  <Link href="/receiving/create"><Button><PackagePlus className="mr-2 size-4" />Tạo phiếu nhập</Button></Link>
                </div>
              </div>
            </CardHeader>

            <div className="p-6 pt-4">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã phiếu</TableHead>
                        <TableHead>Lý do</TableHead>
                        <TableHead>Người giao/nhận</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Thời gian</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slips.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Không tìm thấy phiếu nào</TableCell></TableRow>
                      ) : (
                        slips.map((slip) => (
                          <TableRow key={slip._id}>
                            <TableCell className="font-medium">{slip.slipNumber}</TableCell>
                            <TableCell>{slip.reason}</TableCell>
                            <TableCell>{slip.personName || 'N/A'}</TableCell>
                            <TableCell><Badge className={statusColors[slip.status]}>{statusLabels[slip.status]}</Badge></TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(slip.date), 'HH:mm dd/MM', { locale: vi })}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="size-8"><Eye className="size-4" /></Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-xl">
                                    <DialogHeader>
                                      <DialogTitle>Chi tiết phiếu {slip.slipNumber}</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><Label className="text-muted-foreground">Lý do</Label><p className="font-medium">{slip.reason}</p></div>
                                        <div><Label className="text-muted-foreground">Trạng thái</Label><Badge className={statusColors[slip.status]}>{statusLabels[slip.status]}</Badge></div>
                                      </div>
                                      <div>
                                        <Label className="text-muted-foreground">Danh sách vật tư</Label>
                                        <div className="mt-2 rounded-lg border divide-y max-h-60 overflow-y-auto">
                                          {slip.items.map((item, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 text-sm">
                                              <div><p className="font-medium">{item.itemName}</p><p className="text-xs text-muted-foreground">{item.quantity.actual} {item.unit}</p></div>
                                              <p className="font-medium">{(item.amount).toLocaleString()} đ</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    {slip.status === 'pending' && (
                                      <DialogFooter>
                                        <Button 
                                          className="bg-emerald-600 hover:bg-emerald-700"
                                          onClick={() => updateStatusMutation.mutate({ id: slip._id, status: 'received' })}
                                          disabled={updateStatusMutation.isPending}
                                        >
                                          <Check className="mr-2 size-4" /> Xác nhận đã nhận hàng
                                        </Button>
                                      </DialogFooter>
                                    )}
                                  </DialogContent>
                                </Dialog>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="size-8" 
                                  onClick={() => onShowQR(slip)}
                                ><QrCode className="size-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
