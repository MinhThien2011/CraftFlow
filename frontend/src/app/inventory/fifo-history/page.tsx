"use client"

import React, { useEffect, useMemo, useState } from "react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { batchApi, FifoItemHistory, WarehouseFifoOverviewItem } from "@/api/batch.api"
import { toast } from "sonner"
import { format } from "date-fns"
import { 
    Search, 
    RefreshCcw, 
    Layers, 
    Activity, 
    FileCode, 
    TrendingUp, 
    ArrowUpRight, 
    ArrowDownLeft, 
    FileText, 
    MapPin, 
    AlertCircle, 
    Boxes, 
    FileSpreadsheet,
    User,
    Inbox,
    ClipboardList,
    Package
} from "lucide-react"

const getFifoItemKey = (item: Pick<WarehouseFifoOverviewItem, "itemType" | "itemId">) => `${item.itemType}:${item.itemId}`

const groupOverviewItems = (rows: WarehouseFifoOverviewItem[]): WarehouseFifoOverviewItem[] => {
    const grouped = new Map<string, WarehouseFifoOverviewItem>()
    for (const row of rows) {
        const key = getFifoItemKey(row)
        const existing = grouped.get(key)
        if (!existing) {
            grouped.set(key, { ...row, summary: { ...row.summary } })
            continue
        }
        existing.summary.batchCount += row.summary.batchCount
        existing.summary.activeBatchCount += row.summary.activeBatchCount
        existing.summary.totalReceived += row.summary.totalReceived
        existing.summary.totalRemaining += row.summary.totalRemaining
        existing.summary.transactionCount += row.summary.transactionCount
    }
    return Array.from(grouped.values())
}

const formatTxType = (type: string) => {
    const upper = type.toUpperCase()
    if (upper.includes("RECEIVE") || upper.includes("IMPORT") || upper === "IN") {
        return { label: "Nhập kho", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50" }
    }
    if (upper.includes("ISSUE") || upper.includes("EXPORT") || upper === "OUT") {
        return { label: "Xuất kho", className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50" }
    }
    if (upper.includes("TRANSFER")) {
        return { label: "Điều chuyển", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50" }
    }
    if (upper.includes("SHRINKAGE") || upper.includes("LOSS") || upper.includes("ADJUST")) {
        return { label: "Hao hụt/Điều chỉnh", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50" }
    }
    return { label: type, className: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800" }
}

export default function WarehouseFifoHistoryPage() {
    const [search, setSearch] = useState("")
    const [type, setType] = useState<"all" | "material" | "product">("all")
    const [loadingOverview, setLoadingOverview] = useState(false)
    const [overview, setOverview] = useState<WarehouseFifoOverviewItem[]>([])
    const [selectedKey, setSelectedKey] = useState("")
    const [loadingDetail, setLoadingDetail] = useState(false)
    const [detail, setDetail] = useState<FifoItemHistory | null>(null)

    const fetchOverview = async () => {
        try {
            setLoadingOverview(true)
            const res = await batchApi.getWarehouseFifoOverview({ search: search.trim(), type })
            const rows = res?.data || []
            setOverview(rows)
            const groupedRows = groupOverviewItems(rows)
            if (!groupedRows.length) {
                setSelectedKey("")
                setDetail(null)
                return
            }
            if (!groupedRows.some((x) => getFifoItemKey(x) === selectedKey)) {
                setSelectedKey(getFifoItemKey(groupedRows[0]))
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Không tải được tổng quan FIFO kho")
        } finally {
            setLoadingOverview(false)
        }
    }

    const fetchDetail = async (item: WarehouseFifoOverviewItem) => {
        try {
            setLoadingDetail(true)
            const res = await batchApi.getItemFifoHistory({ itemType: item.itemType, itemId: item.itemId })
            setDetail(res?.data || null)
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Không tải được lịch sử FIFO chi tiết")
            setDetail(null)
        } finally {
            setLoadingDetail(false)
        }
    }

    useEffect(() => {
        fetchOverview()
    }, [type])

    useEffect(() => {
        const t = setTimeout(() => {
            fetchOverview()
        }, 300)
        return () => clearTimeout(t)
    }, [search])

    const groupedOverview = useMemo(() => groupOverviewItems(overview), [overview])
    const selected = useMemo(
        () => groupedOverview.find((item) => getFifoItemKey(item) === selectedKey) || null,
        [groupedOverview, selectedKey]
    )

    useEffect(() => {
        if (selected) fetchDetail(selected)
    }, [selected?.itemId, selected?.itemType])

    return (
        <AppShell title="Lịch sử FIFO kho" subtitle="Theo dõi toàn bộ luồng batch, tồn hiện tại và lịch sử nhập/xuất toàn kho">
            <div className="space-y-3">
                {/* Search & Filter Bar */}
                <Card className="border-slate-100 shadow-sm dark:border-slate-900 overflow-hidden">
                    <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input 
                                    value={search} 
                                    onChange={(e) => setSearch(e.target.value)} 
                                    placeholder="Tìm theo mã/tên vật liệu, sản phẩm..." 
                                    className="pl-9 h-10 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500 rounded-lg text-sm font-medium" 
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button 
                                    variant={type === "all" ? "default" : "outline"} 
                                    onClick={() => setType("all")}
                                    className={`h-10 text-xs font-bold px-4 rounded-lg transition-all duration-200 ${type === "all" ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" : ""}`}
                                >
                                    Tất cả
                                </Button>
                                <Button 
                                    variant={type === "material" ? "default" : "outline"} 
                                    onClick={() => setType("material")}
                                    className={`h-10 text-xs font-bold px-4 rounded-lg transition-all duration-200 ${type === "material" ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" : ""}`}
                                >
                                    Nguyên liệu
                                </Button>
                                <Button 
                                    variant={type === "product" ? "default" : "outline"} 
                                    onClick={() => setType("product")}
                                    className={`h-10 text-xs font-bold px-4 rounded-lg transition-all duration-200 ${type === "product" ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" : ""}`}
                                >
                                    Thành phẩm
                                </Button>
                                <Button 
                                    variant="outline" 
                                    onClick={fetchOverview} 
                                    className="h-10 text-xs font-bold px-4 rounded-lg gap-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                                >
                                    <RefreshCcw className="size-3.5" />
                                    Tải lại
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Content Grid */}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                    {/* Left Sidebar Pane: Danh mục */}
                    <Card className="lg:col-span-4 border-slate-100 shadow-sm dark:border-slate-900 flex flex-col rounded-xl overflow-hidden">
                        <CardHeader className="py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
                            <CardTitle className="text-base font-bold flex items-center justify-between text-slate-800 dark:text-slate-100 tracking-tight">
                                <span className="flex items-center gap-2">
                                    <span className="h-4 w-1 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                                    Danh mục theo FIFO
                                </span>
                                <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 px-2 py-0.5 rounded-full text-xs font-extrabold border border-indigo-100/80 dark:border-indigo-900/30 shadow-xs">
                                    {groupedOverview.length}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        
                        <CardContent className="p-2 space-y-1.5 max-h-[70vh] overflow-y-auto bg-slate-50/30 dark:bg-slate-900/10 flex-1">
                            {loadingOverview ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <RefreshCcw className="size-6 text-indigo-500 animate-spin" />
                                    <span className="mt-2 text-xs text-muted-foreground font-medium">Đang tải danh mục...</span>
                                </div>
                            ) : groupedOverview.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                                    <Inbox className="size-8 stroke-[1.5]" />
                                    <span className="mt-2 text-xs text-muted-foreground font-medium max-w-[200px]">
                                        Chưa có dữ liệu batch. Giao dịch kho chưa phát sinh.
                                    </span>
                                </div>
                            ) : groupedOverview.map((row) => {
                                const key = getFifoItemKey(row)
                                const active = key === selectedKey
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setSelectedKey(key)}
                                        className={`relative w-full rounded-xl border p-2.5 sm:p-3 text-left transition-all duration-300 group flex flex-col ${
                                            active 
                                                ? "border-indigo-200 bg-indigo-50/40 dark:border-indigo-900/50 dark:bg-indigo-950/20 shadow-sm ring-1 ring-indigo-500/10" 
                                                : "border-slate-100 bg-white hover:bg-slate-50/60 dark:border-slate-900 dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-800"
                                        }`}
                                    >
                                        {/* Left Active Accent Strip */}
                                        {active && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 dark:bg-indigo-400 rounded-l-xl" />
                                        )}
                                        
                                        <div className="flex items-start justify-between gap-2 w-full">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base leading-snug group-hover:text-indigo-600 transition-colors duration-200 truncate">
                                                    {row.itemName}
                                                </div>
                                                <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 font-semibold tracking-wide">
                                                    {row.itemCode}
                                                </div>
                                            </div>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold border shrink-0 ${
                                                row.itemType === "material" 
                                                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50" 
                                                    : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50"
                                            }`}>
                                                {row.itemType === "material" ? "Nguyên liệu" : "Thành phẩm"}
                                            </span>
                                        </div>
                                        
                                        {/* Stats Row */}
                                        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-1.5 text-xs w-full">
                                            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-bold">
                                                <Layers className="size-3 text-slate-400" />
                                                {row.summary.batchCount} batch
                                            </span>
                                            <span className={`inline-flex items-center gap-1 font-extrabold ${
                                                row.summary.totalRemaining > 0 
                                                    ? "text-indigo-600 dark:text-indigo-400" 
                                                    : "text-slate-400 dark:text-slate-600"
                                            }`}>
                                                {row.summary.totalRemaining > 0 ? (
                                                    <>
                                                        Tồn: {row.summary.totalRemaining.toLocaleString("vi-VN")} {row.unit}
                                                    </>
                                                ) : (
                                                    "Hết hàng"
                                                )}
                                            </span>
                                        </div>
                                    </button>
                                )
                            })}
                        </CardContent>
                    </Card>

                    {/* Right Pane: Chi tiết luân chuyển */}
                    <div className="space-y-3 lg:col-span-8">
                        <Card className="border-slate-100 shadow-sm dark:border-slate-900 rounded-xl overflow-hidden">
                            <CardHeader className="py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100 tracking-tight">
                                    <span className="h-4 w-1 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
                                    <span>Chi tiết luân chuyển FIFO</span>
                                    {selected && (
                                        <span className="ml-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[11px] font-extrabold border border-emerald-100/80 dark:border-emerald-900/30">
                                            {selected.itemName}
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            
                            <CardContent className="p-3 sm:p-4">
                                {!selected ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="rounded-full bg-slate-50 dark:bg-slate-900 p-4 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                                            <Inbox className="size-10 stroke-[1.5]" />
                                        </div>
                                        <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">Chưa chọn danh mục</h3>
                                        <p className="mt-1.5 text-xs text-muted-foreground max-w-xs">
                                            Vui lòng chọn một danh mục bên trái để kiểm tra chi tiết luân chuyển các lô hàng theo nguyên tắc FIFO.
                                        </p>
                                    </div>
                                ) : loadingDetail ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <RefreshCcw className="size-8 text-indigo-500 animate-spin" />
                                        <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">Đang tải chi tiết</h3>
                                        <p className="mt-1.5 text-xs text-muted-foreground">
                                            Hệ thống đang đồng bộ dữ liệu batch và lịch sử giao dịch...
                                        </p>
                                    </div>
                                ) : !detail ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="rounded-full bg-slate-50 dark:bg-slate-900 p-4 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                                            <AlertCircle className="size-10 stroke-[1.5]" />
                                        </div>
                                        <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">Không có dữ liệu chi tiết</h3>
                                        <p className="mt-1.5 text-xs text-muted-foreground">
                                            Không tìm thấy thông tin lô hàng của danh mục này.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Bento Grid Metrics */}
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                                            {/* Item Code Card */}
                                            <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/30 to-white p-2.5 sm:p-3 shadow-xs dark:border-blue-900/30 dark:from-blue-950/20 dark:to-slate-950 flex flex-col justify-between min-h-[90px]">
                                                <div className="absolute right-2 top-2 text-blue-500/10 dark:text-blue-400/10 pointer-events-none">
                                                    <FileCode className="size-10" />
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Mã hàng</span>
                                                    <div className="mt-1 font-mono text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate" title={detail.itemCode}>
                                                        {detail.itemCode}
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate w-full">
                                                    {detail.itemType === "material" ? "Nguyên liệu" : "Thành phẩm"}
                                                </div>
                                            </div>

                                            {/* Total Batches Card */}
                                            <div className="relative overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50/50 to-white p-2.5 sm:p-3 shadow-xs dark:border-slate-800/30 dark:from-slate-900/20 dark:to-slate-950 flex flex-col justify-between min-h-[90px]">
                                                <div className="absolute right-2 top-2 text-slate-500/10 dark:text-slate-400/10 pointer-events-none">
                                                    <Layers className="size-10" />
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tổng batch</span>
                                                    <div className="mt-1 text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100">
                                                        {detail.summary.batchCount}
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                                                    Đã đăng ký
                                                </div>
                                            </div>

                                            {/* Active Batches Card */}
                                            <div className="relative overflow-hidden rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/30 to-white p-2.5 sm:p-3 shadow-xs dark:border-amber-900/30 dark:from-amber-950/20 dark:to-slate-950 flex flex-col justify-between min-h-[90px]">
                                                <div className="absolute right-2 top-2 text-amber-500/10 dark:text-amber-400/10 pointer-events-none">
                                                    <Activity className="size-10" />
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Batch hoạt động</span>
                                                    <div className="mt-1 text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">
                                                        {detail.summary.activeBatchCount} <span className="text-xs font-normal text-muted-foreground">/ {detail.summary.batchCount}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                                                    Còn hàng tồn
                                                </div>
                                            </div>

                                            {/* Total Received Card */}
                                            <div className="relative overflow-hidden rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/30 to-white p-2.5 sm:p-3 shadow-xs dark:border-emerald-900/30 dark:from-emerald-950/20 dark:to-slate-950 flex flex-col justify-between min-h-[90px]">
                                                <div className="absolute right-2 top-2 text-emerald-500/10 dark:text-emerald-400/10 pointer-events-none">
                                                    <ArrowDownLeft className="size-10" />
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Đã nhập</span>
                                                    <div className="mt-1 text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 truncate">
                                                        {detail.summary.totalReceived.toLocaleString("vi-VN")} <span className="text-[10px] font-semibold text-muted-foreground">{detail.unit}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                                                    Lũy kế lịch sử
                                                </div>
                                            </div>

                                            {/* Remaining Stock Card */}
                                            <div className="relative overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/30 to-white p-2.5 sm:p-3 shadow-xs dark:border-indigo-900/30 dark:from-indigo-950/20 dark:to-slate-950 flex flex-col justify-between min-h-[90px]">
                                                <div className="absolute right-2 top-2 text-indigo-500/10 dark:text-indigo-400/10 pointer-events-none">
                                                    <TrendingUp className="size-10" />
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Còn lại</span>
                                                    <div className="mt-1 text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400 truncate">
                                                        {detail.summary.totalRemaining.toLocaleString("vi-VN")} <span className="text-[10px] font-semibold text-muted-foreground">{detail.unit}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-[11px] font-bold text-indigo-500 dark:text-indigo-400 truncate">
                                                    Tồn thực tế
                                                </div>
                                            </div>
                                        </div>

                                        {/* Table 1: Batch hiện có */}
                                        <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xs">
                                            <div className="bg-slate-100/70 dark:bg-slate-900/60 px-4 py-2 text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                                                <Layers className="size-3.5 text-slate-500" />
                                                <span>Các lô hàng (Batch) hiện có trong kho</span>
                                                <Badge variant="secondary" className="ml-auto font-mono text-[11px] bg-slate-200 dark:bg-slate-800 font-bold px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-300">
                                                    {detail.batches.length} lô
                                                </Badge>
                                            </div>
                                            
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader className="bg-slate-50/50 dark:bg-slate-900/30">
                                                        <TableRow className="border-b border-slate-100 dark:border-slate-800 hover:bg-transparent">
                                                            <TableHead className="font-bold text-slate-855 dark:text-slate-100 text-xs py-2">Mã Lô (Batch)</TableHead>
                                                            <TableHead className="font-bold text-slate-855 dark:text-slate-100 text-xs py-2">Nhập ngày</TableHead>
                                                            <TableHead className="font-bold text-slate-855 dark:text-slate-100 text-xs py-2">Số lượng tồn</TableHead>
                                                            <TableHead className="font-bold text-slate-855 dark:text-slate-100 text-xs py-2">Vị trí (Kệ)</TableHead>
                                                            <TableHead className="font-bold text-slate-855 dark:text-slate-100 text-xs py-2">Đơn nguồn</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {detail.batches.length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                                                                    Không có batch nào còn hàng trong kho.
                                                                </TableCell>
                                                            </TableRow>
                                                        ) : detail.batches.map((b) => (
                                                            <TableRow key={b.batchId} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/30 dark:hover:bg-slate-900/10">
                                                                {/* Batch Number */}
                                                                <TableCell className="py-2.5 font-medium">
                                                                    <span className="font-mono bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-1 rounded-md text-xs font-bold tracking-wider transition-colors duration-200 border border-slate-200/50 dark:border-slate-700/50">
                                                                        {b.batchNumber}
                                                                    </span>
                                                                </TableCell>
                                                                
                                                                {/* Date */}
                                                                <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                                                                    {format(new Date(b.receivedDate), "dd/MM/yyyy HH:mm")}
                                                                </TableCell>
                                                                
                                                                {/* Stock Quantity + Utilization Progress Bar */}
                                                                <TableCell className="py-2.5">
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-baseline gap-1">
                                                                            <span>{b.quantityRemaining.toLocaleString("vi-VN")}</span>
                                                                            <span className="text-[10px] font-medium text-slate-400">/ {b.quantityReceived.toLocaleString("vi-VN")} {detail.unit}</span>
                                                                        </div>
                                                                        {b.quantityReceived > 0 && (
                                                                            <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/20 dark:border-slate-800/20">
                                                                                <div 
                                                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                                                        b.quantityRemaining === 0 
                                                                                            ? "bg-slate-300 dark:bg-slate-700" 
                                                                                            : b.quantityRemaining / b.quantityReceived < 0.2 
                                                                                                ? "bg-rose-500 animate-pulse" 
                                                                                                : b.quantityRemaining / b.quantityReceived < 0.5 
                                                                                                    ? "bg-amber-500" 
                                                                                                    : "bg-emerald-500"
                                                                                    }`}
                                                                                    style={{ width: `${(b.quantityRemaining / b.quantityReceived) * 100}%` }}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                
                                                                {/* Location Shelf */}
                                                                <TableCell className="py-2.5">
                                                                    {b.currentLocation?.shelfCode ? (
                                                                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50 px-2 py-0.5 rounded text-xs font-extrabold shadow-2xs">
                                                                            <MapPin className="size-3 text-amber-600 dark:text-amber-500" />
                                                                            {b.currentLocation.shelfCode}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded font-medium">
                                                                            Chưa gán vị trí
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                                
                                                                {/* Source Document */}
                                                                <TableCell className="py-2.5">
                                                                    {b.source.importSlipNumber || b.source.purchaseOrderCode || b.source.productionOrderCode ? (
                                                                        <div className="flex flex-col gap-1">
                                                                            {b.source.importSlipNumber && (
                                                                                <span className="inline-flex items-center gap-1 self-start bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/50 px-2 py-0.5 rounded text-[11px] font-extrabold">
                                                                                    <FileSpreadsheet className="size-3 text-sky-500" />
                                                                                    PNK: {b.source.importSlipNumber}
                                                                                </span>
                                                                            )}
                                                                            {b.source.purchaseOrderCode && (
                                                                                <span className="inline-flex items-center gap-1 self-start bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50 px-2 py-0.5 rounded text-[11px] font-extrabold">
                                                                                    <FileText className="size-3 text-indigo-500" />
                                                                                    PO: {b.source.purchaseOrderCode}
                                                                                </span>
                                                                            )}
                                                                            {b.source.productionOrderCode && (
                                                                                <span className="inline-flex items-center gap-1 self-start bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50 px-2 py-0.5 rounded text-[11px] font-extrabold">
                                                                                    <Boxes className="size-3 text-purple-500" />
                                                                                    LSX: {b.source.productionOrderCode}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-xs text-slate-400 font-medium">-</span>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>

                                        {/* Table 2: Lịch sử giao dịch */}
                                        <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xs">
                                            <div className="bg-slate-100/70 dark:bg-slate-900/60 px-4 py-2 text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                                                <Activity className="size-3.5 text-slate-500" />
                                                <span>Lịch sử giao dịch & Biến động FIFO</span>
                                                <Badge variant="secondary" className="ml-auto font-mono text-[11px] bg-slate-200 dark:bg-slate-800 font-bold px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-300">
                                                    {detail.transactions.length} Giao dịch
                                                </Badge>
                                            </div>
                                            
                                            <div className="max-h-[380px] overflow-y-auto">
                                                <Table>
                                                    <TableHeader className="bg-slate-50/50 dark:bg-slate-900/30 sticky top-0 z-10">
                                                        <TableRow className="border-b border-slate-100 dark:border-slate-800 hover:bg-transparent">
                                                            <TableHead className="font-bold text-slate-855 dark:text-slate-100 text-xs py-2 bg-slate-50 dark:bg-slate-900">Thời gian</TableHead>
                                                            <TableHead className="font-bold text-slate-855 dark:text-slate-100 text-xs py-2 bg-slate-50 dark:bg-slate-900">Nghiệp vụ</TableHead>
                                                            <TableHead className="font-bold text-slate-855 dark:text-slate-100 text-xs py-2 bg-slate-50 dark:bg-slate-900">Mã Lô (Batch)</TableHead>
                                                            <TableHead className="font-bold text-slate-855 dark:text-slate-100 text-xs py-2 bg-slate-50 dark:bg-slate-900">Biến động</TableHead>
                                                            <TableHead className="font-bold text-slate-855 dark:text-slate-100 text-xs py-2 bg-slate-50 dark:bg-slate-900">Đơn liên quan</TableHead>
                                                            <TableHead className="font-bold text-slate-855 dark:text-slate-100 text-xs py-2 bg-slate-50 dark:bg-slate-900">Vị trí</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {detail.transactions.length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                                                                    Chưa phát sinh giao dịch nào cho sản phẩm/nguyên liệu này.
                                                                </TableCell>
                                                            </TableRow>
                                                        ) : detail.transactions.map((tx) => (
                                                            <TableRow key={tx.transactionId} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/30 dark:hover:bg-slate-900/10">
                                                                {/* Time */}
                                                                <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                                                                    {format(new Date(tx.createdAt), "dd/MM/yyyy HH:mm")}
                                                                </TableCell>
                                                                
                                                                {/* Tx Type Badge + Operator Name */}
                                                                <TableCell className="py-2.5">
                                                                    {(() => {
                                                                        const typeInfo = formatTxType(tx.type)
                                                                        return (
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <span className={`inline-flex self-start items-center px-2 py-0.5 rounded text-[11px] font-extrabold border shadow-2xs ${typeInfo.className}`}>
                                                                                    {typeInfo.label}
                                                                                </span>
                                                                                {tx.performedBy?.name && (
                                                                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1 mt-1 select-none">
                                                                                        <User className="size-2.5" />
                                                                                        {tx.performedBy.name}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    })()}
                                                                </TableCell>
                                                                
                                                                {/* Batch Number */}
                                                                <TableCell className="py-2.5">
                                                                    {tx.batchNumber ? (
                                                                        <span className="font-mono bg-slate-50 dark:bg-slate-900/80 text-slate-800 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200/40 dark:border-slate-800 text-xs font-bold tracking-wider">
                                                                            {tx.batchNumber}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs text-slate-400 font-medium">-</span>
                                                                    )}
                                                                </TableCell>
                                                                
                                                                {/* Signed Quantity Change */}
                                                                <TableCell className="py-2.5">
                                                                    <span className={`inline-flex items-center gap-0.5 font-black text-sm sm:text-base ${
                                                                        tx.signedQuantity > 0 
                                                                            ? "text-emerald-600 dark:text-emerald-400" 
                                                                            : tx.signedQuantity < 0 
                                                                                ? "text-rose-600 dark:text-rose-400" 
                                                                                : "text-slate-500"
                                                                    }`}>
                                                                        {tx.signedQuantity > 0 ? (
                                                                            <>
                                                                                <ArrowUpRight className="size-3.5 stroke-[3] text-emerald-500" />
                                                                                +{tx.signedQuantity.toLocaleString("vi-VN")}
                                                                            </>
                                                                        ) : tx.signedQuantity < 0 ? (
                                                                            <>
                                                                                <ArrowDownLeft className="size-3.5 stroke-[3] text-rose-500" />
                                                                                {tx.signedQuantity.toLocaleString("vi-VN")}
                                                                            </>
                                                                        ) : (
                                                                            tx.signedQuantity.toLocaleString("vi-VN")
                                                                        )}{" "}
                                                                        <span className="text-[10px] font-normal text-muted-foreground ml-0.5 font-sans">{detail.unit}</span>
                                                                    </span>
                                                                </TableCell>
                                                                
                                                                {/* Related Order Documents & Note */}
                                                                <TableCell className="py-2.5">
                                                                    <div className="flex flex-col gap-1">
                                                                        {tx.orderRef || tx.purchaseOrderCode || tx.productionOrderCode || tx.requisitionCode ? (
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {(tx.orderRef || tx.purchaseOrderCode) && (
                                                                                    <span className="inline-flex items-center gap-1 self-start bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50 px-2 py-0.5 rounded text-[11px] font-extrabold">
                                                                                        <FileText className="size-3 text-indigo-500" />
                                                                                        PO: {tx.orderRef || tx.purchaseOrderCode}
                                                                                    </span>
                                                                                )}
                                                                                {tx.productionOrderCode && (
                                                                                    <span className="inline-flex items-center gap-1 self-start bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50 px-2 py-0.5 rounded text-[11px] font-extrabold">
                                                                                        <Boxes className="size-3 text-purple-500" />
                                                                                        LSX: {tx.productionOrderCode}
                                                                                    </span>
                                                                                )}
                                                                                {tx.requisitionCode && (
                                                                                    <span className="inline-flex items-center gap-1 self-start bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50 px-2 py-0.5 rounded text-[11px] font-extrabold">
                                                                                        <ClipboardList className="size-3 text-amber-500" />
                                                                                        YC: {tx.requisitionCode}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-xs text-slate-400 font-medium">-</span>
                                                                        )}
                                                                        
                                                                        {/* Inline Business Reason Note */}
                                                                        {tx.note && (
                                                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium italic mt-0.5 max-w-[150px] truncate" title={tx.note}>
                                                                                "{tx.note}"
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                
                                                                {/* Location Shelf */}
                                                                <TableCell className="py-2.5">
                                                                    {tx.location ? (
                                                                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50 px-2 py-0.5 rounded text-xs font-extrabold shadow-2xs">
                                                                            <MapPin className="size-3 text-amber-600" />
                                                                            {tx.location}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs text-slate-400 font-medium">-</span>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppShell>
    )
}
