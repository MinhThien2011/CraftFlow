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
import { Search, RefreshCcw } from "lucide-react"

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
            <div className="space-y-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-3 md:flex-row">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo mã/tên vật liệu, sản phẩm..." className="pl-9" />
                            </div>
                            <div className="flex gap-2">
                                <Button variant={type === "all" ? "default" : "outline"} onClick={() => setType("all")}>Tất cả</Button>
                                <Button variant={type === "material" ? "default" : "outline"} onClick={() => setType("material")}>Nguyên liệu</Button>
                                <Button variant={type === "product" ? "default" : "outline"} onClick={() => setType("product")}>Thành phẩm</Button>
                                <Button variant="outline" onClick={fetchOverview} className="gap-2"><RefreshCcw className="size-4" />Tải lại</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    <Card className="lg:col-span-4">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Danh mục theo FIFO</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 max-h-[70vh] overflow-auto">
                            {loadingOverview ? (
                                <div className="text-sm text-muted-foreground py-4">Đang tải...</div>
                            ) : groupedOverview.length === 0 ? (
                                <div className="text-sm text-muted-foreground py-4">Chưa có dữ liệu batch. Có thể seed hiện tại chưa tạo batch giao dịch.</div>
                            ) : groupedOverview.map((row) => {
                                const key = getFifoItemKey(row)
                                const active = key === selectedKey
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setSelectedKey(key)}
                                        className={`w-full rounded-lg border p-3 text-left ${active ? "border-blue-300 bg-blue-50" : "border-border hover:bg-muted/40"}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="font-semibold">{row.itemName}</div>
                                                <div className="text-xs text-muted-foreground">{row.itemCode}</div>
                                            </div>
                                            <Badge variant="outline">{row.itemType === "material" ? "Nguyên liệu" : "Thành phẩm"}</Badge>
                                        </div>
                                        <div className="mt-2 text-xs text-muted-foreground">
                                            {row.summary.batchCount} batch • Còn {row.summary.totalRemaining} {row.unit}
                                        </div>
                                    </button>
                                )
                            })}
                        </CardContent>
                    </Card>

                    <div className="space-y-4 lg:col-span-8">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Chi tiết luân chuyển</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {!selected ? (
                                    <div className="text-sm text-muted-foreground py-4">Chọn một item để xem lịch sử.</div>
                                ) : loadingDetail ? (
                                    <div className="text-sm text-muted-foreground py-4">Đang tải chi tiết...</div>
                                ) : !detail ? (
                                    <div className="text-sm text-muted-foreground py-4">Không có dữ liệu chi tiết.</div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-2 md:grid-cols-5 text-xs">
                                            <div className="rounded-md border p-2"><div className="text-muted-foreground">Mã hàng</div><div className="font-semibold">{detail.itemCode}</div></div>
                                            <div className="rounded-md border p-2"><div className="text-muted-foreground">Tổng batch</div><div className="font-semibold">{detail.summary.batchCount}</div></div>
                                            <div className="rounded-md border p-2"><div className="text-muted-foreground">Batch còn hàng</div><div className="font-semibold">{detail.summary.activeBatchCount}</div></div>
                                            <div className="rounded-md border p-2"><div className="text-muted-foreground">Đã nhập</div><div className="font-semibold">{detail.summary.totalReceived} {detail.unit}</div></div>
                                            <div className="rounded-md border p-2"><div className="text-muted-foreground">Còn lại</div><div className="font-semibold">{detail.summary.totalRemaining} {detail.unit}</div></div>
                                        </div>

                                        <div className="rounded-lg border overflow-hidden">
                                            <div className="bg-muted px-3 py-2 text-sm font-medium">Batch hiện có</div>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Batch</TableHead>
                                                        <TableHead>Nhập ngày</TableHead>
                                                        <TableHead>Tồn</TableHead>
                                                        <TableHead>Vị trí</TableHead>
                                                        <TableHead>Đơn nguồn</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {detail.batches.map((b) => (
                                                        <TableRow key={b.batchId}>
                                                            <TableCell className="font-medium">{b.batchNumber}</TableCell>
                                                            <TableCell>{format(new Date(b.receivedDate), "dd/MM/yyyy HH:mm")}</TableCell>
                                                            <TableCell>{b.quantityRemaining}/{b.quantityReceived} {detail.unit}</TableCell>
                                                            <TableCell>{b.currentLocation?.shelfCode || "-"}</TableCell>
                                                            <TableCell>{b.source.purchaseOrderCode || b.source.importSlipNumber || b.source.productionOrderCode || "-"}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        <div className="rounded-lg border overflow-hidden">
                                            <div className="bg-muted px-3 py-2 text-sm font-medium">Lịch sử giao dịch</div>
                                            <div className="max-h-[360px] overflow-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Thời gian</TableHead>
                                                            <TableHead>Nghiệp vụ</TableHead>
                                                            <TableHead>Batch</TableHead>
                                                            <TableHead>Biến động</TableHead>
                                                            <TableHead>Đơn liên quan</TableHead>
                                                            <TableHead>Vị trí</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {detail.transactions.map((tx) => (
                                                            <TableRow key={tx.transactionId}>
                                                                <TableCell>{format(new Date(tx.createdAt), "dd/MM/yyyy HH:mm")}</TableCell>
                                                                <TableCell>{tx.type}</TableCell>
                                                                <TableCell>{tx.batchNumber || "-"}</TableCell>
                                                                <TableCell className={tx.signedQuantity < 0 ? "text-red-600 font-medium" : "text-emerald-700 font-medium"}>
                                                                    {tx.signedQuantity > 0 ? `+${tx.signedQuantity}` : tx.signedQuantity} {detail.unit}
                                                                </TableCell>
                                                                <TableCell>{tx.orderRef || tx.productionOrderCode || tx.purchaseOrderCode || tx.requisitionCode || "-"}</TableCell>
                                                                <TableCell>{tx.location || "-"}</TableCell>
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
