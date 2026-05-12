'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PackagePlus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  MoreVertical,
  Calendar,
  User,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { purchaseOrderApi, PurchaseOrder } from '@/api/purchaseOrder.api'
import { useAuth } from "@/features/auth/hooks/use-auth"
import { toast } from 'sonner'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const CustomPagination = ({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) => {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t p-4 bg-background rounded-b-xl">
      <p className="text-sm text-muted-foreground">
        Hiển thị {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} / {total}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => onChange(p)}>{p}</Button>
        ))}
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function PurchaseOrdersPage() {
  const { role, isAdmin } = useAuth()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [adminNote, setAdminNote] = useState("")

  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter])

  const fetchOrders = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await purchaseOrderApi.getAll({
        status: statusFilter === 'all' ? undefined : statusFilter
      })

      const res: any = response;
      if (res.success || res.status === 'success') {
        setOrders(Array.isArray(res.data) ? res.data : (res.data?.items || []))
      }
    } catch (error: any) {
      toast.error("Không thể tải danh sách yêu cầu mua hàng")
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setIsSubmitting(true)
    try {
      await purchaseOrderApi.updateStatus(id, newStatus, adminNote)
      toast.success(`Đã ${newStatus === 'approved' ? 'duyệt' : 'từ chối'} yêu cầu thành công`)
      setIsDetailsOpen(false)
      setAdminNote("")
      fetchOrders()
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể cập nhật trạng thái")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Chờ duyệt</Badge>
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Đã duyệt</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Từ chối</Badge>
      case 'completed':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Hoàn thành</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-500">Cao</Badge>
      case 'medium':
        return <Badge className="bg-amber-500">Trung bình</Badge>
      case 'low':
        return <Badge className="bg-blue-500">Thấp</Badge>
      default:
        return <Badge>{priority}</Badge>
    }
  }

  const filteredOrders = (orders || []).filter(order =>
    order.orderReason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (order as any).orderCode?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const paginatedOrders = filteredOrders.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  return (
    <AppShell
      title="Yêu cầu mua hàng"
      subtitle="Quản lý các yêu cầu mua nguyên vật liệu từ bộ phận sản xuất"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm yêu cầu..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
                <SelectItem value="approved">Đã duyệt</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chờ duyệt</p>
                <p className="text-xl font-bold">{orders.filter(o => o.status === 'pending').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đã duyệt</p>
                <p className="text-xl font-bold">{orders.filter(o => o.status === 'approved').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <PackagePlus className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hoàn thành</p>
                <p className="text-xl font-bold">{orders.filter(o => o.status === 'completed').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Từ chối</p>
                <p className="text-xl font-bold">{orders.filter(o => o.status === 'rejected').length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Mã yêu cầu</TableHead>
                  <TableHead>Lý do / Nội dung</TableHead>
                  <TableHead>Độ ưu tiên</TableHead>
                  <TableHead>Tổng tiền</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right pr-6">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="h-12 text-center"><Spinner /></TableCell>
                    </TableRow>
                  ))
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      Không tìm thấy yêu cầu mua hàng nào
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOrders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell className="pl-6 font-medium">
                        {(order as any).orderCode || order._id.slice(-6).toUpperCase()}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {order.orderReason}
                      </TableCell>
                      <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        <CurrencyDisplay value={order.totalBaseCost} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(order.createdAt), 'dd/MM/yyyy', { locale: vi })}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedOrder(order)
                              setIsDetailsOpen(true)
                            }}>
                              <Eye className="mr-2 h-4 w-4" /> Chi tiết
                            </DropdownMenuItem>
                            {order.status === 'pending' && (
                              <DropdownMenuItem className="text-destructive">
                                <XCircle className="mr-2 h-4 w-4" /> Hủy yêu cầu
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <CustomPagination page={page} total={filteredOrders.length} pageSize={ITEMS_PER_PAGE} onChange={setPage} />
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent size="3xl">
          <DialogHeader>
            <DialogTitle>Chi tiết yêu cầu mua hàng</DialogTitle>
            <DialogDescription>
              Mã: {(selectedOrder as any)?.orderCode || selectedOrder?._id.slice(-6).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Người tạo</p>
                  <p className="font-medium flex items-center gap-2">
                    <User className="h-3 w-3" />
                    {(selectedOrder.creator as any)?.username || (selectedOrder.creator as any)?.fullName || "Production Manager"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Ngày tạo</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(selectedOrder.createdAt), 'HH:mm dd/MM/yyyy', { locale: vi })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Độ ưu tiên</p>
                  {getPriorityBadge(selectedOrder.priority)}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Trạng thái</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Lý do mua hàng</p>
                <p className="text-sm bg-background p-3 rounded border border-border italic">
                  "{selectedOrder.orderReason}"
                </p>
              </div>

              {selectedOrder.adminNotes && (
                <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> Ghi chú từ Admin
                  </p>
                  <p className="text-sm text-amber-700">{selectedOrder.adminNotes}</p>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm font-semibold">Danh sách vật tư</p>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="h-9 text-xs">Mã</TableHead>
                        <TableHead className="h-9 text-xs">Tên vật tư</TableHead>
                        <TableHead className="h-9 text-xs text-right">Số lượng</TableHead>
                        <TableHead className="h-9 text-xs text-right">Đơn giá</TableHead>
                        <TableHead className="h-9 text-xs text-right">Thành tiền</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.purchaseOrderItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs">{item.materialCode}</TableCell>
                          <TableCell className="text-xs font-medium">{(item.material as any)?.name || "Vật tư"}</TableCell>
                          <TableCell className="text-xs text-right font-medium">
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            <CurrencyDisplay value={item.priceAtTimePurchase} />
                          </TableCell>
                          <TableCell className="text-xs text-right font-bold text-primary">
                            <CurrencyDisplay value={item.totalPriceAtTimePurchase} />
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-bold">
                        <TableCell colSpan={4} className="text-right py-3 uppercase text-xs tracking-wider">Tổng cộng</TableCell>
                        <TableCell className="text-right py-3 text-primary text-base">
                          <CurrencyDisplay value={selectedOrder.totalBaseCost} />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {isAdmin && selectedOrder.status === 'pending' && (
                <div className="space-y-2 pt-4 border-t border-border">
                  <Label htmlFor="admin-note">Ghi chú phê duyệt/từ chối</Label>
                  <Textarea
                    id="admin-note"
                    placeholder="Nhập ghi chú phản hồi..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-2">
            <Button variant="outline" onClick={() => {
              setIsDetailsOpen(false)
              setAdminNote("")
            }}>
              Đóng
            </Button>

            {isAdmin && selectedOrder?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleUpdateStatus(selectedOrder._id, 'rejected')}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Spinner className="mr-2" /> : <XCircle className="mr-2 h-4 w-4" />}
                  Từ chối
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleUpdateStatus(selectedOrder._id, 'approved')}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Spinner className="mr-2" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Phê duyệt
                </Button>
              </>
            )}

            {!isAdmin && selectedOrder?.status === 'pending' && (
              <Button className="bg-primary text-white">Chỉnh sửa</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}

// Re-using components from ui
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from '@radix-ui/react-label'
