"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { vi } from "date-fns/locale"

import {
    ChevronLeft,
    CalendarDays,
    Clock,
    Package,
    User,
    FileText,
    Factory,
    Loader2
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { productionApi, type ProductionOrder } from "@/api/production.api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Cấu hình màu sắc trạng thái
const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
        case 'pending': return { label: 'Chờ xử lý', color: 'bg-gray-100 text-gray-700 border-gray-200' }
        case 'in_progress': return { label: 'Đang sản xuất', color: 'bg-blue-100 text-blue-700 border-blue-200' }
        case 'completed': return { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
        case 'paused': return { label: 'Tạm dừng', color: 'bg-amber-100 text-amber-700 border-amber-200' }
        case 'waiting_material': return { label: 'Chờ nguyên liệu', color: 'bg-orange-100 text-orange-700 border-orange-200' }
        case 'cancelled': return { label: 'Đã hủy', color: 'bg-red-100 text-red-700 border-red-200' }
        default: return { label: status || 'Chưa xác định', color: 'bg-gray-100 text-gray-700 border-gray-200' }
    }
}

const getPriorityConfig = (priority: string) => {
    switch (priority?.toLowerCase()) {
        case 'urgent': return { label: 'Khẩn cấp', color: 'text-red-700 bg-red-50 border-red-200' }
        case 'high': return { label: 'Cao', color: 'text-orange-700 bg-orange-50 border-orange-200' }
        case 'normal': return { label: 'Bình thường', color: 'text-blue-700 bg-blue-50 border-blue-200' }
        case 'low': return { label: 'Thấp', color: 'text-gray-700 bg-gray-50 border-gray-200' }
        default: return { label: priority || 'Bình thường', color: 'text-gray-700 bg-gray-50 border-gray-200' }
    }
}

const formatDate = (dateString?: string) => {
    if (!dateString) return "---"
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: vi })
}

export default function AdminProductionOrderDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [order, setOrder] = useState<ProductionOrder | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchOrderDetails = async () => {
            setIsLoading(true)
            try {
                const res: any = await productionApi.getOrderById(id)
                if (res.success || res.status === 'success') {
                    setOrder(res.data?.order || res.data)
                } else {
                    throw new Error(res.message)
                }
            } catch (error: any) {
                toast.error(error.message || "Không thể tải chi tiết đơn sản xuất")
                router.push("/production")
            } finally {
                setIsLoading(false)
            }
        }

        if (id) fetchOrderDetails()
    }, [id, router])

    if (isLoading) {
        return (
            <AppShell title="Chi tiết Đơn sản xuất" subtitle="Đang tải dữ liệu...">
                <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p>Đang lấy thông tin đơn sản xuất...</p>
                </div>
            </AppShell>
        )
    }

    if (!order) return null

    const statusConfig = getStatusConfig(order.status)
    const priorityConfig = getPriorityConfig(order.priority)
    const creatorName = order.createdBy?.fullName || order.createdBy?.username || "Hệ thống"

    const totalQuantity = order.products?.reduce((sum: number, p: any) => sum + p.quantity, 0) || 0
    const totalCompleted = order.assignments?.reduce((sum: number, a: any) => sum + (a.completedQuantity || 0), 0) || 0
    const overallProgress = totalQuantity > 0 ? Math.min(100, Math.round((totalCompleted / totalQuantity) * 100)) : 0

    return (
        <AppShell title="Chi tiết Đơn sản xuất" subtitle={`Mã đơn: #${order.orderCode || order._id}`}>
            <div className="space-y-6 max-w-7xl mx-auto">

                {/* Top Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                        variant="ghost"
                        onClick={() => router.push("/production")}
                        className="w-fit pl-0 hover:bg-transparent hover:text-primary"
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Quay lại danh sách
                    </Button>

                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className={cn("px-3 py-1 text-sm border font-medium", statusConfig.color)}>
                            Trạng thái: {statusConfig.label}
                        </Badge>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">

                    {/* Cột trái - Thông tin chung */}
                    <Card className="lg:col-span-1 shadow-sm border-none bg-card h-fit">
                        <CardHeader className="pb-4 border-b border-border/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Factory className="h-5 w-5 text-primary" /> Thông tin chung
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2"><FileText className="h-4 w-4" /> Mã đơn sản xuất</p>
                                    <p className="font-mono font-medium text-base">{order.orderCode}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2"><Clock className="h-4 w-4" /> Mức độ ưu tiên</p>
                                    <Badge variant="outline" className={cn("font-medium border", priorityConfig.color)}>
                                        {priorityConfig.label}
                                    </Badge>
                                </div>

                                <div>
                                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Ngày tạo</p>
                                    <p className="font-medium">{formatDate(order.createdAt)}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Hạn hoàn thành (Deadline)</p>
                                    <p className="font-medium text-destructive">{formatDate(order.deadline)}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2"><User className="h-4 w-4" /> Người tạo đơn</p>
                                    <p className="font-medium">{creatorName}</p>
                                </div>
                            </div>

                            {order.notes && (
                                <div className="pt-4 border-t border-border/50">
                                    <p className="text-sm text-muted-foreground mb-2">Ghi chú:</p>
                                    <div className="p-3 bg-muted/40 rounded-lg text-sm text-foreground italic border border-border/30">
                                        {order.notes}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Cột phải - Danh sách SP & Phân công */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Products Table */}
                        <Card className="shadow-sm border-none bg-card">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Package className="h-5 w-5 text-primary" /> Sản phẩm yêu cầu
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/40">
                                        <TableRow>
                                            <TableHead className="pl-6">Sản phẩm</TableHead>
                                            <TableHead className="text-center w-32">Số lượng cần</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {order.products?.map((item: any, idx: number) => {
                                            const p = item.product || {}
                                            return (
                                                <TableRow key={item._id || `${p._id || 'prod'}-${idx}`}>
                                                    <TableCell className="pl-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 shrink-0 rounded-md bg-muted flex items-center justify-center overflow-hidden border">
                                                                {p.productImage ? (
                                                                    <img src={p.productImage} alt={p.name} className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <Package className="h-5 w-5 text-muted-foreground/50" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">{p.name || item.productName || 'Sản phẩm không xác định'}</p>
                                                                <p className="text-xs text-muted-foreground font-mono">{p.code || item.productCode || '---'}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-base">{item.quantity}</TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Assignments Table */}
                        <Card className="shadow-sm border-none bg-card">
                            <CardHeader className="pb-4 border-b border-border/50">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <User className="h-5 w-5 text-primary" /> Tiến độ & Phân công
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                {/* Overall Progress */}
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <p className="text-sm font-semibold text-muted-foreground">Tiến độ tổng thể</p>
                                        <div className="text-right">
                                            <span className="font-bold text-lg text-primary">{totalCompleted}</span>
                                            <span className="text-muted-foreground text-sm"> / {totalQuantity}</span>
                                            <span className="ml-2 font-bold text-[#4A9C6B]">{overallProgress}%</span>
                                        </div>
                                    </div>
                                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#4A9C6B] transition-all duration-500"
                                            style={{ width: `${overallProgress}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-sm font-semibold text-muted-foreground">Chi tiết nhân sự</p>
                                    {order.assignments && order.assignments.length > 0 ? (
                                        <div className="space-y-3">
                                            {order.assignments.map((assign: any, idx: number) => {
                                                const assignProgress = assign.assignedQuantity > 0
                                                    ? Math.round((assign.completedQuantity / assign.assignedQuantity) * 100)
                                                    : 0;
                                                return (
                                                    <div key={idx} className="p-4 rounded-xl border border-border bg-muted/20">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                                    <User className="h-5 w-5 text-primary" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold text-card-foreground">
                                                                        {assign.staff?.fullName || assign.staff?.username || "Không xác định"}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Sản phẩm: {assign.product?.name || order.products?.find((p: any) => (p.product?._id || p.product) === (assign.product?._id || assign.product))?.productName || "Sản phẩm"}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <Badge variant="outline" className="capitalize bg-card">
                                                                {assign.status?.replace('_', ' ') || 'pending'}
                                                            </Badge>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-muted-foreground">Tiến độ: <span className="font-medium text-foreground">{assign.completedQuantity} / {assign.assignedQuantity}</span></span>
                                                                <span className="font-medium">{assignProgress}%</span>
                                                            </div>
                                                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary transition-all duration-500"
                                                                    style={{ width: `${assignProgress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-xl bg-muted/10">
                                            <User className="h-10 w-10 text-muted-foreground/30 mb-2" />
                                            <p className="text-muted-foreground text-sm">Chưa có phân công nhân sự nào cho đơn hàng này.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </div>
        </AppShell>
    )
}