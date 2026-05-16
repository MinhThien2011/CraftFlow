"use client"

import React, { useState } from "react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Search,
    History,
    MapPin,
    Package,
    Clock,
    User,
    ArrowUpRight,
    ArrowDownLeft,
    AlertCircle,
    Loader2,
    Calendar,
    Box,
    Layers,
    Navigation,
    QrCode
} from "lucide-react"
import { batchApi, BatchTraceResult } from "@/api/batch.api"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { QRScanner } from "@/features/receiving/components/qr-scanner"

export default function TraceabilityPage() {
    const [batchNumber, setBatchNumber] = useState("")
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<BatchTraceResult | null>(null)
    const [isScannerOpen, setIsScannerOpen] = useState(false)

    const handleSearch = async (value: string = batchNumber) => {
        const searchVal = value.trim()
        if (!searchVal) {
            toast.error("Vui lòng nhập số lô")
            return
        }

        setLoading(true)
        try {
            const res = await batchApi.traceBatch(searchVal)
            if (res.success && res.data) {
                setData(res.data)
            } else {
                toast.error(res.message || "Không tìm thấy thông tin lô hàng")
                setData(null)
            }
        } catch (error: any) {
            toast.error(error.message || "Đã có lỗi xảy ra")
            setData(null)
        } finally {
            setLoading(false)
        }
    }

    const handleScanSuccess = (decodedText: string) => {
        setBatchNumber(decodedText)
        setIsScannerOpen(false)
        handleSearch(decodedText)
    }

    return (
        <AppShell title="Truy xuất nguồn gốc" subtitle="Tra cứu lịch sử và vị trí chính xác của lô hàng">
            <div className="space-y-6">
                {/* Search Bar */}
                <Card className="bg-primary/5 border-primary/20 shadow-sm">
                    <CardContent className="pt-6">
                        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <Input
                                    placeholder="Nhập số lô (Batch Number)..."
                                    className="pl-10 h-11 bg-white"
                                    value={batchNumber}
                                    onChange={(e) => setBatchNumber(e.target.value)}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                className="h-11"
                                onClick={() => setIsScannerOpen(true)}
                            >
                                <QrCode className="size-4 mr-2" />
                                Quét mã
                            </Button>
                            <Button type="submit" size="lg" disabled={loading} className="px-8 h-11">
                                {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Search className="size-4 mr-2" />}
                                Tra cứu
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <QRScanner
                    open={isScannerOpen}
                    onOpenChange={setIsScannerOpen}
                    onScanSuccess={handleScanSuccess}
                />

                {data ? (
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Summary & Item Info */}
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="overflow-hidden border-emerald-100 shadow-sm">
                                <div className="h-2 bg-emerald-500" />
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-xl">Thông tin lô hàng</CardTitle>
                                            <CardDescription className="font-mono mt-1">{data.batch.batchNumber}</CardDescription>
                                        </div>
                                        <Badge variant={data.batch.isExhausted ? "secondary" : "default"} className={cn(
                                            "px-3 py-1",
                                            !data.batch.isExhausted && "bg-emerald-500 hover:bg-emerald-600"
                                        )}>
                                            {data.batch.isExhausted ? "Đã hết hàng" : "Còn hàng"}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <Package className="size-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-semibold">Mặt hàng</p>
                                            <p className="font-bold">{(data.batch.material?.name || data.batch.product?.name)}</p>
                                            <p className="text-xs font-mono">{(data.batch.material?.code || data.batch.product?.code)}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground uppercase">Tồn kho</p>
                                            <p className="text-lg font-bold text-emerald-600">
                                                {data.batch.quantityRemaining.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{data.batch.unit}</span>
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground uppercase">Tổng nhập</p>
                                            <p className="text-lg font-bold">
                                                {data.batch.quantityReceived.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{data.batch.unit}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-2 space-y-3 border-t">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="size-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Ngày nhập:</span>
                                            <span className="font-medium">{format(new Date(data.batch.receivedDate), 'dd/MM/yyyy', { locale: vi })}</span>
                                        </div>
                                        {data.batch.expirationDate && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <AlertCircle className="size-4 text-amber-500" />
                                                <span className="text-muted-foreground">Hạn dùng:</span>
                                                <span className="font-medium">{format(new Date(data.batch.expirationDate), 'dd/MM/yyyy', { locale: vi })}</span>
                                            </div>
                                        )}
                                        {data.batch.relatedImportSlip && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <History className="size-4 text-muted-foreground" />
                                                <span className="text-muted-foreground">Phiếu nhập:</span>
                                                <span className="font-medium text-blue-600 hover:underline cursor-pointer">{data.batch.relatedImportSlip.slipNumber}</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Current Location Detailed */}
                            <Card className="border-blue-100 shadow-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <MapPin className="size-5 text-blue-600" />
                                        Vị trí lưu trữ hiện tại
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {data.batch.shelf ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
                                                <span className="text-sm font-bold text-blue-700">Mã kệ: {data.batch.shelf.shelfCode}</span>
                                                <Badge variant="outline" className="bg-white text-blue-600 border-blue-200">
                                                    Khu {data.batch.shelf.warehouseSection}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                                                    <Box className="size-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-[10px] uppercase text-muted-foreground">Dãy (Aisle)</p>
                                                        <p className="text-sm font-bold">{data.batch.shelf.aisle || "N/A"}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                                                    <Layers className="size-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-[10px] uppercase text-muted-foreground">Tầng (Level)</p>
                                                        <p className="text-sm font-bold">{data.batch.shelf.level || "N/A"}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                                                    <Navigation className="size-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-[10px] uppercase text-muted-foreground">Ô kệ (Bin)</p>
                                                        <p className="text-sm font-bold">{data.batch.shelf.bin || "N/A"}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                                                    <MapPin className="size-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-[10px] uppercase text-muted-foreground">Vùng (Zone)</p>
                                                        <p className="text-sm font-bold">{data.batch.shelf.zone || "N/A"}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 text-center text-sm">
                                            <AlertCircle className="size-8 mx-auto mb-2 text-amber-500 opacity-50" />
                                            Lô hàng này chưa được gán vị trí kệ xác định.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Movement History (Audit Trail) */}
                        <div className="lg:col-span-2">
                            <Card className="h-full shadow-sm">
                                <CardHeader className="border-b pb-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-xl">Nhật ký biến động lô hàng</CardTitle>
                                            <CardDescription>Mọi thay đổi về vị trí và số lượng đều được lưu vết</CardDescription>
                                        </div>
                                        <History className="size-6 text-muted-foreground opacity-30" />
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="max-h-[600px] overflow-auto">
                                        <Table>
                                            <TableHeader className="bg-muted/30 sticky top-0 z-10">
                                                <TableRow>
                                                    <TableHead className="w-[180px]">Thời gian</TableHead>
                                                    <TableHead>Hành động</TableHead>
                                                    <TableHead className="text-right">Biến động</TableHead>
                                                    <TableHead className="text-right">Tồn sau</TableHead>
                                                    <TableHead>Người thực hiện</TableHead>
                                                    <TableHead>Vị trí / Ghi chú</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data.history.map((tx) => (
                                                    <TableRow key={tx._id} className="hover:bg-muted/20 transition-colors">
                                                        <TableCell className="text-xs font-medium whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <span>{format(new Date(tx.createdAt), 'dd/MM/yyyy', { locale: vi })}</span>
                                                                <span className="text-muted-foreground font-normal">{format(new Date(tx.createdAt), 'HH:mm:ss')}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={cn(
                                                                "font-medium text-[10px] uppercase",
                                                                tx.quantity > 0 ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-blue-700 bg-blue-50 border-blue-100"
                                                            )}>
                                                                {tx.type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className={cn(
                                                                "font-bold font-mono",
                                                                tx.quantity > 0 ? "text-emerald-600" : "text-blue-600"
                                                            )}>
                                                                {tx.quantity > 0 ? '+' : ''}{tx.quantity.toLocaleString()}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-sm font-medium">
                                                            {tx.afterStock?.toLocaleString() || "N/A"}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <User className="size-3 text-muted-foreground" />
                                                                <span className="text-xs">{tx.performedBy?.fullName || tx.performedBy?.username || "Hệ thống"}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="max-w-[200px]">
                                                            <div className="flex flex-col gap-0.5">
                                                                {tx.location && (
                                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600">
                                                                        <MapPin className="size-2.5" />
                                                                        {tx.location}
                                                                    </div>
                                                                )}
                                                                <p className="text-[10px] text-muted-foreground truncate" title={tx.note}>
                                                                    {tx.note || "-"}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {data.history.length === 0 && (
                                        <div className="py-20 text-center text-muted-foreground">
                                            <Clock className="size-12 mx-auto mb-3 opacity-20" />
                                            <p>Chưa có dữ liệu biến động cho lô hàng này.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : !loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="size-24 rounded-full bg-muted flex items-center justify-center mb-6">
                            <Search className="size-10 text-muted-foreground opacity-20" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Bắt đầu truy xuất nguồn gốc</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            Nhập số lô (Batch Number) từ hóa đơn, nhãn hàng hoặc quét mã QR để tra cứu thông tin chi tiết về vị trí và lịch sử biến động.
                        </p>
                    </div>
                )}
            </div>
        </AppShell>
    )
}
