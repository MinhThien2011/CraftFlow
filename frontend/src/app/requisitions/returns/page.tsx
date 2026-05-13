"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Eye, Check, X, Loader2, Clock, Undo2 } from "lucide-react"
import { requisitionApi } from "@/api/requisition.api"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/features/auth/hooks/use-auth"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

export default function ReturnRequisitionsPage() {
  const queryClient = useQueryClient()
  const { isKhoManager } = useAuth()
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const [selectedReq, setSelectedReq] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['requisitions', 'returns', { page, limit, search: searchQuery, status: activeTab }],
    queryFn: () => requisitionApi.getRequisitions({ 
        page, 
        limit, 
        search: searchQuery, 
        status: activeTab === 'all' ? undefined : activeTab,
        type: 'return'
    })
  })

  const approveReturnMutation = useMutation({
    mutationFn: (id: string) => requisitionApi.updateStatus(id, { status: 'return_approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
      toast.success("Đã duyệt yêu cầu hoàn trả")
      setIsDialogOpen(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Lỗi khi duyệt yêu cầu")
    }
  })

  const responseData = data?.data?.data || data?.data || data;
  const requisitions: any[] = responseData?.requisitions || [];
  const pagination = responseData?.pagination || {};
  const totalPages = pagination?.totalPages || pagination?.pages || 1;

  return (
    <AppShell title="Hoàn trả vật liệu" subtitle="Quản lý danh sách các yêu cầu hoàn trả vật tư về kho">
      <div className="space-y-6">
        <Card>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <CardHeader className="pb-0 border-b">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Tìm theo mã yêu cầu..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>

              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="pl-6 py-4">Mã yêu cầu</TableHead>
                    <TableHead>Lệnh sản xuất</TableHead>
                    <TableHead>Người trả</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-center">Số mặt hàng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right pr-6">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground"><Loader2 className="size-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : requisitions.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Không tìm thấy yêu cầu nào</TableCell></TableRow>
                  ) : requisitions.map((req) => (
                    <TableRow key={req._id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setSelectedReq(req); setIsDialogOpen(true); }}>
                      <TableCell className="pl-6 font-medium text-primary">{req.requisitionCode}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{req.productionOrder?.orderCode || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>{req.createdBy?.fullName || req.createdBy?.username}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(req.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </TableCell>
                      <TableCell className="text-center">{req.items?.length || 0}</TableCell>
                      <TableCell>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedReq(req); setIsDialogOpen(true); }}>
                          <Eye className="size-4 mr-1" /> Chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {pagination && totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
                  <p className="text-sm text-muted-foreground">
                    Trang <span className="font-medium">{pagination.page}</span> / {totalPages} • Tổng <span className="font-medium">{pagination.total}</span> mục
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Trước</Button>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Sau</Button>
                  </div>
                </div>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Chi tiết yêu cầu hoàn trả {selectedReq?.requisitionCode}</DialogTitle>
          </DialogHeader>

          {selectedReq && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                <div>
                  <p className="text-muted-foreground">Lệnh sản xuất:</p>
                  <p className="font-medium">{selectedReq.productionOrder?.orderCode || 'N/A'}</p>
                </div>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vật liệu</TableHead>
                      <TableHead className="text-right">Số lượng trả</TableHead>
                      <TableHead>Đơn vị</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReq.items.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <p className="font-medium">{item.material?.name}</p>
                          <p className="text-xs text-muted-foreground">{item.material?.code}</p>
                        </TableCell>
                        <TableCell className="text-right font-bold text-orange-600">{item.requestedQuantity}</TableCell>
                        <TableCell>{item.material?.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Đóng</Button>
                {selectedReq.status === 'return_pending' && isKhoManager && (
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => approveReturnMutation.mutate(selectedReq._id)} disabled={approveReturnMutation.isPending}>
                    {approveReturnMutation.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
                    Duyệt hoàn trả & Tạo phiếu nhập
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
