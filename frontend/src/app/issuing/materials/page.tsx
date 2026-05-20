"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Eye, Truck, CheckCircle2, Clock, Loader2 } from "lucide-react"
import { slipApi, Slip } from "@/api/slip.api"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { CurrencyDisplay } from "@/components/ui/currency-display"
import { SlipDetailDialog } from "@/components/shared/slip-detail-dialog"
import { toast } from "sonner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/features/auth/hooks/use-auth"

const EXPORT_STATUS_CONFIG: Record<string, { label: string, color: string }> = {
  pending: { label: "Chờ xử lý", color: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
  received: { label: "Đang soạn hàng", color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  inspecting: { label: "Đang kiểm kê", color: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" },
  completed: { label: "Đã xuất kho", color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
  verified: { label: "Đã xác thực", color: "bg-teal-100 text-teal-700 hover:bg-teal-200" },
  cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-700 hover:bg-red-200" },
}

function EvidenceStatusBadge({ status }: { status: Slip["status"] }) {
  if (status !== "completed") return null

  return (
        <Badge className="w-fit border-0 bg-amber-100 text-amber-700 hover:bg-amber-200">
      Chưa cập nhật chứng từ
        </Badge>
  )
}

function MaterialIssuingPageContent() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const focusedSlipId = searchParams.get("slipId")
  const { loading: authLoading } = useAuth()
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const [selectedSlip, setSelectedSlip] = useState<Slip | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['slips', 'export-materials', { page, limit, search: searchQuery, status: activeTab }],
    queryFn: async () => {
      try {
        const response = await slipApi.getSlips({
          type: 'export',
          category: 'material',
          page,
          limit,
          search: searchQuery,
          status: activeTab === 'all' ? undefined : activeTab
        });
        return response;
      } catch (err) {
        throw err;
      }
    },
    staleTime: 5000,
    refetchOnMount: true,
    enabled: !authLoading
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, items }: { id: string, status: string, items: any[] }) =>
      slipApi.updateSlipStatus(id, { status, items }),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['slips'] })
      toast.success("Cập nhật trạng thái thành công")
      setIsDialogOpen(false)
      if (variables.status === 'received') {
        router.push(`/issuing/pick-list?slipId=${variables.id}`)
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Lỗi khi cập nhật trạng thái")
    }
  })

  const updateDetailsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<Slip> }) =>
      slipApi.updateSlipDetails(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slips'] })
      toast.success("Đã lưu thông tin phiếu")
      setIsDialogOpen(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Lỗi khi lưu thông tin")
    }
  })

  const responseData = data?.data?.data || data?.data || data;
  const slips: Slip[] = responseData?.slips || [];
  const pagination = responseData?.pagination || {};
  const totalPages = pagination?.totalPages || pagination?.pages || 1;

  useEffect(() => {
    if (!focusedSlipId || slips.length === 0) return
    const focusedSlip = slips.find((slip) => slip._id === focusedSlipId)
    if (!focusedSlip) return
    setSelectedSlip(focusedSlip)
    setIsDialogOpen(true)
  }, [focusedSlipId, slips])

  return (
    <AppShell title="Xuất kho vật liệu" subtitle="Quản lý phiếu xuất vật tư cho sản xuất">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đang soạn hàng</p>
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
                <p className="text-sm text-muted-foreground">Đã hoàn tất</p>
                <p className="text-xl font-bold">{slips.filter(s => s.status === 'completed' || s.status === 'verified').length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <CardHeader className="pb-0 border-b">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <TabsList>
                    <TabsTrigger value="all">Tất cả</TabsTrigger>
                    <TabsTrigger value="pending">Chờ xử lý</TabsTrigger>
                    <TabsTrigger value="received">Đang soạn</TabsTrigger>
                    <TabsTrigger value="completed">Đã hoàn tất</TabsTrigger>
                  </TabsList>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Tìm theo mã phiếu..."
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
                    <TableHead className="pl-6 py-4">Mã phiếu</TableHead>
                    <TableHead>Người nhận</TableHead>
                    <TableHead>Vật tư chính</TableHead>
                    <TableHead>Ngày lập</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-center pr-6">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="size-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : isError ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-red-500">
                        <div className="flex flex-col items-center gap-2">
                          <p>Lỗi tải dữ liệu: {(error as any)?.message || 'Vui lòng thử lại'}</p>
                          <Button variant="outline" size="sm" onClick={() => refetch()}>Thử lại</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : slips.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Không tìm thấy phiếu nào</TableCell></TableRow>
                  ) : slips.map((slip) => (
                    <TableRow key={slip._id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setSelectedSlip(slip); setIsDialogOpen(true); }}>
                      <TableCell className="pl-6 font-medium text-primary">{slip.slipNumber}</TableCell>
                      <TableCell>{slip.personName || 'N/A'}</TableCell>
                      <TableCell>
                        <p className="font-medium text-sm line-clamp-1">{slip.items[0]?.itemName || 'N/A'}</p>
                        {slip.items.length > 1 && <p className="text-xs text-muted-foreground">+{slip.items.length - 1} mục khác</p>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {slip.date ? format(new Date(slip.date), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge className={`${EXPORT_STATUS_CONFIG[slip.status]?.color} w-fit border-0`}>
                            {EXPORT_STATUS_CONFIG[slip.status]?.label}
                          </Badge>
                          <EvidenceStatusBadge status={slip.status} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center pr-6">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedSlip(slip); setIsDialogOpen(true); }}>
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

        <SlipDetailDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          slip={selectedSlip}
          type="export"
          statusConfig={EXPORT_STATUS_CONFIG}
          onSave={(info, items) => updateDetailsMutation.mutate({ id: selectedSlip!._id, data: { ...info, items } })}
          onStatusUpdate={(status, items) => updateStatusMutation.mutate({ id: selectedSlip!._id, status, items })}
          isUpdating={updateStatusMutation.isPending || updateDetailsMutation.isPending}
        />
      </div>
    </AppShell>
  )
}

export default function MaterialIssuingPage() {
  return (
    <Suspense fallback={null}>
      <MaterialIssuingPageContent />
    </Suspense>
  )
}

