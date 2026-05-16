"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Slip, SlipItem } from "@/api/slip.api"
import { useShelves, useShelfRecommendations } from "@/features/inventory/hooks/use-shelves"
import { Package, MapPin, Hash, CheckCircle2, Loader2, AlertTriangle, Sparkles, HelpCircle, Split, Trash2, Zap } from "lucide-react"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface StockingAssignmentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    slip: Slip | null
    items: SlipItem[]
    onConfirm: (assignment: any[]) => void
    isSubmitting?: boolean
}

export function StockingAssignmentDialog({
    open,
    onOpenChange,
    slip,
    items,
    onConfirm,
    isSubmitting = false
}: StockingAssignmentDialogProps) {
    const [assignments, setAssignments] = useState<any[]>([])
    const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null)

    const activeItem = activeItemIdx !== null ? assignments[activeItemIdx] : null
    const { data: recommendationsResponse, isLoading: isLoadingRecs } = useShelfRecommendations(
        activeItem?.material || activeItem?.product || '',
        activeItem?.material ? 'Material' : 'Product',
        activeItem?.actualQuantity || 0
    )
    const recommendations = recommendationsResponse?.data || []

    const { data: shelvesResponse } = useShelves({
        category: 'Material',
        status: 'Available',
        availableCapacity: 0
    })
    const shelves = shelvesResponse?.data || []

    useEffect(() => {
        if (open && items) {
            const initialAssignments = items.map((item, idx) => ({
                id: `init-${idx}`,
                originalIdx: idx,
                itemCode: item.itemCode,
                itemName: item.itemName,
                material: item.material,
                product: item.product,
                totalActualQuantity: item.quantity.actual, // Lưu lại tổng để đối soát
                actualQuantity: item.quantity.actual,
                unit: item.unit,
                batchNumber: item.batchNumber || '',
                shelf: typeof item.shelf === 'object' ? (item.shelf as any)?._id : item.shelf || '',
                isSplit: false
            }))
            setAssignments(initialAssignments)
            if (initialAssignments.length > 0) setActiveItemIdx(0)
        }
    }, [open, items])

    const handleSplitLine = (idx: number) => {
        const itemToSplit = assignments[idx]
        const newAssignments = [...assignments]

        // Đánh dấu dòng hiện tại là đã tách
        newAssignments[idx] = { ...itemToSplit, isSplit: true }

        // Thêm dòng mới kế tiếp với số lượng mặc định là 0
        const newLine = {
            ...itemToSplit,
            id: `split-${Date.now()}`,
            actualQuantity: 0,
            batchNumber: '',
            shelf: '',
            isSplit: true
        }

        newAssignments.splice(idx + 1, 0, newLine)
        setAssignments(newAssignments)
    }

    const handleRemoveSplit = (idx: number) => {
        const itemToRemove = assignments[idx]
        const newAssignments = assignments.filter((_, i) => i !== idx)

        // Kiểm tra xem còn dòng nào của mặt hàng này không
        const remainingForThisItem = newAssignments.filter(a => a.itemCode === itemToRemove.itemCode)
        if (remainingForThisItem.length === 1) {
            // Nếu chỉ còn 1 dòng, bỏ đánh dấu isSplit
            const finalIdx = newAssignments.findIndex(a => a.itemCode === itemToRemove.itemCode)
            newAssignments[finalIdx].isSplit = false
        }

        setAssignments(newAssignments)
    }

    const handleQuantityChange = (idx: number, qty: number) => {
        const newAssignments = [...assignments]
        newAssignments[idx].actualQuantity = qty
        setAssignments(newAssignments)
    }

    const handleShelfChange = (idx: number, shelfId: string) => {
        const newAssignments = [...assignments]
        newAssignments[idx].shelf = shelfId
        setAssignments(newAssignments)
    }

    const handleBatchChange = (idx: number, batch: string) => {
        const newAssignments = [...assignments]
        newAssignments[idx].batchNumber = batch
        setAssignments(newAssignments)
    }

    const handleQuickSplit = (idx: number) => {
        const item = assignments[idx]
        if (!item.material && !item.product) return

        // 1. Get best recommendations for this item
        if (!recommendations || recommendations.length === 0) {
            toast.info("Không tìm thấy đề xuất kệ phù hợp để chia nhanh.")
            return
        }

        let remainingQty = item.totalActualQuantity
        const newSplitLines: any[] = []

        // 2. Iterate through recommendations and fill them
        for (const rec of recommendations) {
            if (remainingQty <= 0) break

            const available = (rec as any).availableCapacity || (rec.maxCapacity - rec.currentLoad)
            if (available <= 0) continue

            const taken = Math.min(remainingQty, available)
            newSplitLines.push({
                ...item,
                id: `split-quick-${rec._id}-${Date.now()}`,
                actualQuantity: taken,
                batchNumber: item.batchNumber, // Copy current batch if any
                shelf: rec._id,
                isSplit: true
            })
            remainingQty -= taken
        }

        // 3. If still has remaining, add one more row or put it in the last row
        if (remainingQty > 0) {
            newSplitLines.push({
                ...item,
                id: `split-quick-rem-${Date.now()}`,
                actualQuantity: remainingQty,
                batchNumber: item.batchNumber,
                shelf: '',
                isSplit: true
            })
        }

        // 4. Update state: replace all lines of this item with new ones
        const otherItems = assignments.filter(a => a.itemCode !== item.itemCode)
        // Find position to insert
        const firstIdx = assignments.findIndex(a => a.itemCode === item.itemCode)
        const updatedAssignments = [...assignments]
        updatedAssignments.splice(firstIdx, assignments.filter(a => a.itemCode === item.itemCode).length, ...newSplitLines)

        setAssignments(updatedAssignments)
        toast.success(`Đã tự động chia mặt hàng thành ${newSplitLines.length} dòng dựa trên sức chứa.`)
    }

    const handleConfirm = () => {
        // 1. Kiểm tra gán kệ
        const unassigned = assignments.some(a => !a.shelf)
        if (unassigned) {
            toast.error("Vui lòng chọn kệ cho tất cả các dòng hàng.")
            return
        }

        // 2. Kiểm tra tổng số lượng sau khi tách dòng
        const itemCodes = Array.from(new Set(assignments.map(a => a.itemCode)))
        for (const code of itemCodes) {
            const itemLines = assignments.filter(a => a.itemCode === code)
            const currentTotal = itemLines.reduce((sum, a) => sum + a.actualQuantity, 0)
            const originalTotal = itemLines[0].totalActualQuantity

            if (currentTotal !== originalTotal) {
                toast.error(`Tổng số lượng của mặt hàng ${code} (${currentTotal}) không khớp với số lượng thực nhập (${originalTotal}). Vui lòng kiểm tra lại.`)
                return
            }
        }

        // 3. Kiểm tra sức chứa (cảnh báo)
        const overCapacity = assignments.some(a => {
            const shelf = shelves.find(s => s._id === a.shelf) || recommendations.find((r: any) => r._id === a.shelf);
            const available = shelf ? ((shelf as any).availableCapacity ?? (shelf.maxCapacity - shelf.currentLoad)) : 0;
            return available < a.actualQuantity;
        });

        if (overCapacity) {
            const confirmOverCapacity = window.confirm("Một số kệ đã chọn không đủ sức chứa. Bạn có chắc chắn muốn tiếp tục nhập kho vào các vị trí này không?");
            if (!confirmOverCapacity) return;
        }

        onConfirm(assignments.map(a => ({
            itemCode: a.itemCode,
            material: a.material,
            product: a.product,
            actualQuantity: a.actualQuantity,
            batchNumber: a.batchNumber || undefined,
            shelf: a.shelf
        })))
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent size="4xl" className="max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Package className="size-6 text-emerald-600" />
                        Nghiệp vụ Lưu kho (Stocking)
                    </DialogTitle>
                    <DialogDescription>
                        Gán vị trí kệ và quản lý số lô cho phiếu nhập: <span className="font-bold text-foreground">{slip?.slipNumber}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto p-6">
                    <div className="rounded-xl border shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-12 text-center">STT</TableHead>
                                    <TableHead>Vật tư / Sản phẩm</TableHead>
                                    <TableHead className="text-center w-32">Số lượng nhập</TableHead>
                                    <TableHead className="w-64">
                                        <div className="flex items-center gap-2">
                                            <Hash className="size-4 text-amber-600" />
                                            Số lô (Batch)
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-64">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="size-4 text-blue-600" />
                                            Vị trí Kệ (Shelf)
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <HelpCircle className="size-3.5 text-muted-foreground cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-[250px] p-3">
                                                        <p className="text-xs leading-relaxed">
                                                            Hệ thống tự động đề xuất các kệ đang lưu trữ mặt hàng này hoặc các kệ trống cùng loại để tối ưu việc sắp xếp.
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-20 text-center">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignments.map((item, idx) => {
                                    const isDuplicate = assignments.filter(a => a.itemCode === item.itemCode).length > 1;
                                    const isFirstOfDuplicate = isDuplicate && assignments.findIndex(a => a.itemCode === item.itemCode) === idx;

                                    return (
                                        <TableRow key={item.id} className={cn(item.isSplit && "bg-muted/10")}>
                                            <TableCell className="text-center font-medium">
                                                {!item.isSplit || isFirstOfDuplicate ? idx + 1 : ""}
                                            </TableCell>
                                            <TableCell>
                                                {(!item.isSplit || isFirstOfDuplicate) ? (
                                                    <div>
                                                        <p className="font-semibold">{item.itemName}</p>
                                                        <p className="text-xs text-muted-foreground font-mono">{item.itemCode}</p>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-muted-foreground italic text-xs pl-4">
                                                        <div className="w-2 h-4 border-l border-b rounded-bl-lg border-muted-foreground/30" />
                                                        Tách từ {item.itemName}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-col gap-1">
                                                    {item.isSplit ? (
                                                        <Input
                                                            type="number"
                                                            value={item.actualQuantity}
                                                            onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                                                            className="h-8 text-right font-bold text-emerald-700 bg-emerald-50/30"
                                                        />
                                                    ) : (
                                                        <Badge variant="outline" className="text-sm font-bold bg-emerald-50 text-emerald-700 border-emerald-200 justify-center py-1">
                                                            {item.actualQuantity} {item.unit}
                                                        </Badge>
                                                    )}
                                                    {item.isSplit && isFirstOfDuplicate && (
                                                        <span className="text-[10px] text-muted-foreground italic">
                                                            Tổng: {item.totalActualQuantity} {item.unit}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={item.batchNumber}
                                                    onChange={(e) => handleBatchChange(idx, e.target.value)}
                                                    placeholder="Để trống để hệ thống tự tạo"
                                                    className="bg-amber-50/30 border-amber-100 focus:ring-amber-200 text-sm h-9"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <Select
                                                        value={item.shelf}
                                                        onValueChange={(val) => handleShelfChange(idx, val)}
                                                        onOpenChange={(open) => open && setActiveItemIdx(idx)}
                                                    >
                                                        <SelectTrigger className={cn(
                                                            "bg-blue-50/30 border-blue-100 focus:ring-blue-200 text-sm h-9",
                                                            !item.shelf && "border-amber-500 ring-1 ring-amber-500"
                                                        )}>
                                                            <SelectValue placeholder="Chọn kệ lưu trữ..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {isLoadingRecs && activeItemIdx === idx && (
                                                                <div className="flex items-center justify-center p-2">
                                                                    <Loader2 className="size-4 animate-spin text-primary" />
                                                                </div>
                                                            )}

                                                            {/* Always show the current selected shelf first if it exists */}
                                                            {item.shelf && !isLoadingRecs && (
                                                                <>
                                                                    <div className="px-2 py-1.5 text-xs font-bold text-blue-600">Vị trí đã chọn</div>
                                                                    {(() => {
                                                                        const s = shelves.find(s => s._id === item.shelf) || recommendations.find((r: any) => r._id === item.shelf);
                                                                        return s ? (
                                                                            <SelectItem key={`selected-${s._id}`} value={s._id}>
                                                                                <div className="flex flex-col">
                                                                                    <span className="font-bold text-blue-700">{s.shelfCode} (Hiện tại)</span>
                                                                                    <span className="text-[10px] text-muted-foreground">Trống: {((s as any).availableCapacity ?? (s.maxCapacity - s.currentLoad)).toLocaleString()}</span>
                                                                                </div>
                                                                            </SelectItem>
                                                                        ) : null;
                                                                    })()}
                                                                    <div className="h-px bg-muted my-1" />
                                                                </>
                                                            )}

                                                            {recommendations.length > 0 && activeItemIdx === idx && (
                                                                <>
                                                                    <div className="px-2 py-1.5 text-xs font-bold text-emerald-600 flex items-center gap-1">
                                                                        <Sparkles className="size-3" /> Đề xuất kệ (Tối ưu nhất)
                                                                    </div>
                                                                    {recommendations
                                                                        .filter((s: any) => s._id !== item.shelf) // Don't duplicate if already selected
                                                                        .map((s: any) => (
                                                                            <SelectItem key={`rec-${s._id}`} value={s._id}>
                                                                                <div className="flex flex-col">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="font-bold">{s.shelfCode}</span>
                                                                                        {s.hasSameItem && (
                                                                                            <Badge variant="secondary" className="text-[9px] h-3.5 px-1 bg-emerald-100 text-emerald-700 border-none">Đang chứa mặt hàng này</Badge>
                                                                                        )}
                                                                                        {s.canFullyAccommodate ? (
                                                                                            <Badge variant="outline" className="text-[9px] h-3.5 px-1 bg-blue-50 text-blue-700 border-blue-200">Đủ sức chứa</Badge>
                                                                                        ) : (
                                                                                            <Badge variant="outline" className="text-[9px] h-3.5 px-1 bg-amber-50 text-amber-700 border-amber-200">Không đủ sức chứa</Badge>
                                                                                        )}
                                                                                    </div>
                                                                                    <span className="text-[10px] text-muted-foreground">Khu {s.warehouseSection} - Trống: {s.availableCapacity?.toLocaleString() || (s.maxCapacity - s.currentLoad).toLocaleString()}</span>
                                                                                </div>
                                                                            </SelectItem>
                                                                        ))}
                                                                    <div className="h-px bg-muted my-1" />
                                                                </>
                                                            )}

                                                            <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground">Tất cả kệ khác</div>
                                                            {shelves
                                                                .filter(s => s._id !== item.shelf && !recommendations.some((r: any) => r._id === s._id))
                                                                .map(s => (
                                                                    <SelectItem key={s._id} value={s._id}>
                                                                        <div className="flex flex-col">
                                                                            <span className="font-bold">{s.shelfCode}</span>
                                                                            <span className="text-[10px] text-muted-foreground">Khu {s.warehouseSection} - Còn trống: {(s.maxCapacity - s.currentLoad).toLocaleString()}</span>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))
                                                            }
                                                        </SelectContent>
                                                    </Select>

                                                    {item.shelf && (() => {
                                                        const selectedShelf: any = shelves.find(s => s._id === item.shelf) || recommendations.find((r: any) => r._id === item.shelf);
                                                        if (selectedShelf && ((selectedShelf as any).availableCapacity ?? (selectedShelf.maxCapacity - selectedShelf.currentLoad)) < item.actualQuantity) {
                                                            return (
                                                                <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium bg-amber-50 p-1 rounded">
                                                                    <AlertTriangle className="size-3" />
                                                                    Vượt sức chứa ({((selectedShelf as any).availableCapacity ?? (selectedShelf.maxCapacity - selectedShelf.currentLoad)).toLocaleString()} trống)
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() => handleQuickSplit(idx)}
                                                        title="Chia nhanh theo sức chứa"
                                                        disabled={!recommendations || recommendations.length === 0}
                                                    >
                                                        <Zap className="size-4 fill-emerald-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        onClick={() => handleSplitLine(idx)}
                                                        title="Tách dòng thủ công"
                                                    >
                                                        <Split className="size-4" />
                                                    </Button>
                                                    {isDuplicate && !isFirstOfDuplicate && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => handleRemoveSplit(idx)}
                                                            title="Xóa dòng tách"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
                        <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <p className="font-bold">Lưu ý nghiệp vụ:</p>
                            <ul className="list-disc ml-4 mt-1 space-y-1">
                                <li>Nếu nhà cung cấp có số lô đi kèm, vui lòng nhập chính xác vào cột "Số lô".</li>
                                <li>Nếu không nhập, hệ thống sẽ tự động tạo mã lô theo quy tắc FIFO của kho.</li>
                                <li>Đảm bảo chọn đúng kệ có sức chứa phù hợp để tối ưu không gian kho.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 border-t bg-muted/10">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Quay lại
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8"
                    >
                        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                        Xác nhận Nhập kho & Hoàn tất
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
