"use client"

import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { materialApi } from "@/api/material.api"
import { productApi } from "@/api/product.api"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { ArrowUpRight, ArrowDownLeft, Loader2, Package } from "lucide-react"
import { Button } from "../ui/button"

interface TransactionHistoryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    itemId: string
    itemName: string
    itemType: 'material' | 'product'
}

export function TransactionHistoryDialog({
    open,
    onOpenChange,
    itemId,
    itemName,
    itemType
}: TransactionHistoryDialogProps) {
    const [page, setPage] = useState(1)
    const [limit] = useState(10)

    const { data, isLoading, isError } = useQuery({
        queryKey: ['history', itemType, itemId, { page, limit }],
        queryFn: () => itemType === 'material' 
            ? materialApi.getHistory(itemId, { page, limit })
            : productApi.getHistory(itemId, { page, limit }),
        enabled: open && !!itemId
    })

    const history = data?.data?.history || []
    const pagination = data?.data?.pagination || {}

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent size="3xl" className="max-h-[80vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="size-5 text-blue-600" />
                        Lịch sử lưu kho & di chuyển: {itemName}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-auto p-6">
                    {isLoading ? (
                        <div className="flex h-40 items-center justify-center">
                            <Loader2 className="size-8 animate-spin text-primary" />
                        </div>
                    ) : isError ? (
                        <div className="flex h-40 items-center justify-center text-destructive font-medium">
                            Lỗi khi tải lịch sử giao dịch.
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex h-40 items-center justify-center text-muted-foreground italic">
                            Chưa có lịch sử giao dịch nào.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ngày giờ</TableHead>
                                    <TableHead>Loại giao dịch</TableHead>
                                    <TableHead>Số lượng</TableHead>
                                    <TableHead>Số lô</TableHead>
                                    <TableHead>Ghi chú / Tham chiếu</TableHead>
                                    <TableHead>Người thực hiện</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((tx: any) => (
                                    <TableRow key={tx._id}>
                                        <TableCell className="text-xs whitespace-nowrap">
                                            {tx.createdAt ? format(new Date(tx.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                {tx.quantity > 0 ? (
                                                    <ArrowDownLeft className="size-3.5 text-emerald-500" />
                                                ) : (
                                                    <ArrowUpRight className="size-3.5 text-blue-500" />
                                                )}
                                                <span className="text-xs font-medium">{tx.type}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={tx.quantity > 0 ? "text-emerald-600 font-bold" : "text-blue-600 font-bold"}>
                                                {tx.quantity > 0 ? '+' : ''}{tx.quantity.toLocaleString()}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-xs font-mono">
                                            {tx.batch?.batchNumber || '-'}
                                        </TableCell>
                                        <TableCell className="text-xs max-w-[200px] truncate" title={tx.note || tx.orderRef}>
                                            {tx.note || tx.orderRef || '-'}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {tx.performedBy?.fullName || tx.performedBy?.username || 'System'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {pagination.pages > 1 && (
                    <div className="p-4 border-t flex justify-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={page === 1} 
                            onClick={() => setPage(p => p - 1)}
                        >
                            Trước
                        </Button>
                        <span className="flex items-center px-4 text-sm font-medium">
                            Trang {page} / {pagination.pages}
                        </span>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={page === pagination.pages} 
                            onClick={() => setPage(p => p + 1)}
                        >
                            Sau
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
