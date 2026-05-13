"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, PackagePlus } from "lucide-react"
import { slipApi, Slip } from "@/api/slip.api"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { CurrencyDisplay } from "@/components/ui/currency-display"
import { SlipDetailDialog } from "@/components/shared/slip-detail-dialog"
import { toast } from "sonner"

const statusConfig: Record<string, { label: string, color: string }> = {
  pending: { label: "Đang chờ", color: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
  received: { label: "Đã nhận hàng", color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  inspected: { label: "Đã kiểm tra", color: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
  inspecting: { label: "Đang kiểm kê", color: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
  in_stock: { label: "Đã vào kho - Chưa xác minh", color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
  completed: { label: "Đã hoàn tất", color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
  verified: { label: "Đã vào kho - Đã xác minh", color: "bg-teal-100 text-teal-700 hover:bg-teal-200" },
  cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-700 hover:bg-red-200" },
}

export default function ReceivingPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [searchQuery, setSearchQuery] = useState("")

  // Trạng thái cho việc xem chi tiết Slip
  const [selectedSlip, setSelectedSlip] = useState<Slip | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Gọi API lấy phiếu nhập (truyền type = import)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['slips', 'import', { page, limit, search: searchQuery }],
    queryFn: () => slipApi.getSlips({ type: 'import', page, limit, search: searchQuery })
  })

  // Mutation cập nhật trạng thái nhập kho
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, items }: { id: string, status: string, items: any[] }) =>
      slipApi.updateSlipStatus(id, { status, items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slips', 'import'] })
      toast.success("Đã cập nhật trạng thái nhập kho thành công")
      setIsDialogOpen(false)
      setSelectedSlip(null)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Lỗi khi cập nhật trạng thái nhập kho")
    }
  })

  // Mutation cập nhật thông tin chi tiết (Manager)
  const updateDetailsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<Slip> }) =>
      slipApi.updateSlipDetails(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slips', 'import-materials'] })
      toast.success("Đã lưu thay đổi thông tin phiếu thành công")
      setIsDialogOpen(false)
      setSelectedSlip(null)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Lỗi khi lưu thay đổi thông tin phiếu")
    }
  })

  // Trích xuất dữ liệu an toàn bao phủ mọi case cấu hình Axios Interceptor
  const responseData = data?.data?.data || data?.data || data;
  const slips: Slip[] = responseData?.slips || [];
  const pagination = responseData?.pagination || {};
  const totalPages = pagination?.totalPages || pagination?.pages || 1;

  const handleStatusUpdate = (status: string, items: any[]) => {
    if (!selectedSlip) return
    updateStatusMutation.mutate({
      id: selectedSlip._id,
      status,
      items
    })
  }

  const handleSave = (info: any, items: any[]) => {
    if (!selectedSlip) return
    updateDetailsMutation.mutate({
      id: selectedSlip._id,
      data: {
        ...info,
        items: items.map(item => ({
          ...item,
          quantity: {
            ...item.quantity,
            actual: item.quantity.actual
          }
        }))
      }
    })
  }

  return (
    <AppShell title="Phiếu nhập vật liệu" subtitle="Quản lý danh sách phiếu nhập vật liệu">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Danh sách phiếu nhập vật liệu</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Theo dõi và quản lý các phiếu nhập vật tư vào kho
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo mã phiếu, người giao..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold py-4">Mã phiếu</TableHead>
                  <TableHead className="font-bold">Ngày lập</TableHead>
                  <TableHead className="font-bold text-center">Số mặt hàng</TableHead>
                  <TableHead className="font-bold">Lý do</TableHead>
                  <TableHead className="text-center font-bold">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><div className="h-10 bg-muted animate-pulse rounded" /></TableCell>
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-destructive font-medium">
                      Đã xảy ra lỗi khi tải dữ liệu: {(error as Error)?.message || "Vui lòng thử lại sau"}
                    </TableCell>
                  </TableRow>
                ) : slips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <PackagePlus className="h-10 w-10 text-muted-foreground/50 mb-2" />
                        <p>Không tìm thấy phiếu nhập kho nào</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  slips.map((slip) => {
                    const status = statusConfig[slip.status] || { label: slip.status, color: "bg-gray-100 text-gray-700" };
                    return (
                      <TableRow
                        key={slip._id}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => { setSelectedSlip(slip); setIsDialogOpen(true); }}
                      >
                        <TableCell className="font-medium text-primary py-4">{slip.slipNumber}</TableCell>
                        <TableCell>{slip.date ? format(new Date(slip.date), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A'}</TableCell>
                        <TableCell className="text-center font-medium">{slip.items?.length || 0}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground" title={slip.reason}>{slip.reason}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${status.color} border-0 shadow-none hover:${status.color}`}>
                            {status.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
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
          </CardContent>
        </Card>

        {/* Slip Details Dialog */}
        <SlipDetailDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          slip={selectedSlip}
          type="import"
          statusConfig={statusConfig}
          onSave={handleSave}
          onStatusUpdate={handleStatusUpdate}
          isUpdating={updateStatusMutation.isPending || updateDetailsMutation.isPending}
        />
      </div>
    </AppShell>
  )
}
