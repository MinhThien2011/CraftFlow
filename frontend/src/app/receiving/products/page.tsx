'use client'

import { useState } from 'react'
import { Search, CheckCircle2, XCircle, Clock, Eye, FileCheck, AlertCircle } from 'lucide-react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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

// ── Main ──────────────────────────────────────────────────────
export default function ReceivingProductsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [searchQuery, setSearchQuery] = useState("")

  // Trạng thái cho việc xem chi tiết Slip
  const [selectedSlip, setSelectedSlip] = useState<Slip | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Gọi API lấy phiếu nhập thành phẩm (truyền type = import)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['slips', 'import-products', { page, limit, search: searchQuery }],
    queryFn: () => slipApi.getSlips({ type: 'import', page, limit, search: searchQuery })
  })

  // Mutation cập nhật trạng thái nhập kho
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, items }: { id: string, status: string, items: any[] }) =>
      slipApi.updateSlipStatus(id, { status, items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slips', 'import-products'] })
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
      queryClient.invalidateQueries({ queryKey: ['slips', 'import-products'] })
      toast.success("Đã lưu thay đổi thông tin phiếu thành công")
      setIsDialogOpen(false)
      setSelectedSlip(null)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Lỗi khi lưu thay đổi thông tin phiếu")
    }
  })

  // Trích xuất dữ liệu
  const responseData = data?.data?.data || data?.data || data;
  const slips: Slip[] = responseData?.slips?.filter((s: Slip) => s.items.some(i => i.product)) || [];
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
    <AppShell
      title="Phiếu nhập thành phẩm"
      subtitle="Quản lý và kiểm tra chất lượng thành phẩm nhập kho"
    >
      <div className="flex flex-col gap-6 p-6">
        {/* Stats Summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chờ xử lý</p>
                <p className="text-xl font-bold">{slips.filter(s => s.status === 'pending').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đã nhận hàng</p>
                <p className="text-xl font-bold">{slips.filter(s => s.status === 'received').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đã vào kho</p>
                <p className="text-xl font-bold">{slips.filter(s => s.status === 'in_stock' || s.status === 'verified').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đã hủy</p>
                <p className="text-xl font-bold">{slips.filter(s => s.status === 'cancelled').length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo mã, số phiếu..."
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
                  <TableHead className="pl-6">Số phiếu nhập</TableHead>
                  <TableHead>Lý do nhập</TableHead>
                  <TableHead>Sản phẩm chính</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right pr-6">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="h-32 text-center">Đang tải...</TableCell></TableRow>
                ) : slips.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Không tìm thấy phiếu nhập nào</TableCell></TableRow>
                ) : (
                  slips.map((slip) => (
                    <TableRow key={slip._id}>
                      <TableCell className="pl-6 font-medium">{slip.slipNumber}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{slip.reason}</TableCell>
                      <TableCell>
                        <p className="font-medium">{slip.items[0]?.itemName}</p>
                        <p className="text-xs text-muted-foreground">{slip.items[0]?.itemCode} x {slip.items[0]?.quantity.requested}</p>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        <CurrencyDisplay value={slip.totalAmount} />
                      </TableCell>
                      <TableCell>{format(new Date(slip.date), 'dd/MM/yyyy', { locale: vi })}</TableCell>
                      <TableCell>
                        <Badge className={`gap-1 ${statusConfig[slip.status]?.color}`}>
                          {statusConfig[slip.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSlip(slip)
                            setIsDialogOpen(true)
                          }}
                        >
                          <Eye className="size-4 mr-1" /> Chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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