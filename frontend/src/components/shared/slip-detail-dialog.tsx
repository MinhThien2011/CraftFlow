"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"
import { format } from "date-fns"
import { Slip, SlipItem } from "@/api/slip.api"

/**
 * Chuyển đổi số thành chữ tiếng Việt
 */
function numberToVietnameseWords(number: number): string {
    if (number === 0) return "Không đồng";

    const units = ["", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ"];
    const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

    function readGroup(n: number): string {
        let s = "";
        const h = Math.floor(n / 100);
        const t = Math.floor((n % 100) / 10);
        const u = n % 10;

        if (h > 0) {
            s += digits[h] + " trăm ";
            if (t === 0 && u > 0) s += "lẻ ";
        }

        if (t > 0) {
            if (t === 1) s += "mười ";
            else s += digits[t] + " mươi ";
        }

        if (u > 0) {
            if (t > 1 && u === 1) s += "mốt";
            else if (t > 0 && u === 5) s += "lăm";
            else s += digits[u];
        }

        return s.trim();
    }

    let res = "";
    let i = 0;
    let n = Math.abs(number);

    while (n > 0) {
        const group = n % 1000;
        if (group > 0) {
            const groupStr = readGroup(group);
            res = groupStr + units[i] + (res ? " " + res : "");
        }
        n = Math.floor(n / 1000);
        i++;
    }

    res = res.trim();
    if (!res) return "Không đồng";
    res = res.charAt(0).toUpperCase() + res.slice(1) + " đồng";
    return res;
}

export interface SlipDetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    slip: Slip | null
    type: 'import' | 'export'
    statusConfig: Record<string, { label: string, color: string }>
    onSave?: (slipInfo: any, items: SlipItem[]) => void
}

export function SlipDetailDialog({
    open,
    onOpenChange,
    slip,
    type,
    statusConfig,
    onSave
}: SlipDetailDialogProps) {
    const [editableItems, setEditableItems] = useState<SlipItem[]>([])
    const [editableSlipInfo, setEditableSlipInfo] = useState({
        personName: '',
        unit: '',
        department: '',
        accounting: { debit: '', credit: '' },
        referenceDoc: { description: '', number: '', date: '', issuer: '' },
        warehouse: { name: '', location: '' },
        originalDocsCount: ''
    })

    useEffect(() => {
        if (slip) {
            setEditableItems(JSON.parse(JSON.stringify(slip.items || [])))
            setEditableSlipInfo({
                personName: slip.personName || '',
                unit: slip.unit || '',
                department: slip.department || '',
                accounting: {
                    debit: slip.accounting?.debit || '',
                    credit: slip.accounting?.credit || ''
                },
                referenceDoc: {
                    description: slip.referenceDoc?.description || '',
                    number: slip.referenceDoc?.number || '',
                    date: slip.referenceDoc?.date ? format(new Date(slip.referenceDoc.date), 'yyyy-MM-dd') : '',
                    issuer: slip.referenceDoc?.issuer || ''
                },
                warehouse: {
                    name: slip.warehouse?.name || '',
                    location: slip.warehouse?.location || ''
                },
                originalDocsCount: slip.originalDocsCount || ''
            })
        } else {
            setEditableItems([])
            setEditableSlipInfo({
                personName: '',
                unit: '',
                department: '',
                accounting: { debit: '', credit: '' },
                referenceDoc: { description: '', number: '', date: '', issuer: '' },
                warehouse: { name: '', location: '' },
                originalDocsCount: ''
            })
        }
    }, [slip])

    const totalAmount = useMemo(() => {
        return editableItems.reduce((sum, item) => sum + (item.amount || 0), 0)
    }, [editableItems])

    const totalAmountInWords = useMemo(() => {
        return numberToVietnameseWords(totalAmount)
    }, [totalAmount])

    const handleQuantityChange = (idx: number, value: string) => {
        let actual = Number(value)
        if (isNaN(actual) || actual < 0) actual = 0 // Ngăn chặn số âm
        const newItems = [...editableItems]
        const item = newItems[idx]
        if (item) {
            item.quantity.actual = actual
            item.amount = actual * (item.unitPrice || 0)
            setEditableItems(newItems)
        }
    }

    const isImport = type === 'import'
    const formTitle = isImport ? "Phiếu nhập kho" : "Phiếu xuất kho"
    const formNumber = isImport ? "Mẫu số 01 - VT" : "Mẫu số 02 - VT"
    const actionLabel = isImport ? "- Nhập tại kho:" : "- Xuất tại kho:"
    const personLabel1 = isImport ? "- Họ và tên người giao:" : "- Họ và tên người nhận hàng:"
    const personLabel2 = isImport ? "Người giao hàng" : "Người nhận hàng"
    const actualLabel = isImport ? "Thực nhập" : "Thực xuất"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent size="4xl" className="w-[95vw] max-h-[95vh] p-0 border-none shadow-2xl rounded-2xl overflow-hidden flex flex-col bg-white">
                <DialogHeader className="sr-only">
                    <DialogTitle>{formTitle}: {slip?.slipNumber}</DialogTitle>
                    <DialogDescription>
                        Hiển thị thông tin chi tiết và chỉnh sửa {formTitle.toLowerCase()} theo {formNumber}
                    </DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto w-full h-full scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                    <div className="p-8 md:p-12 text-black print:p-0" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                        {/* Header */}
                        <div className="flex justify-between items-start mb-8">
                            <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-1">
                                    <span className="font-bold whitespace-nowrap">Đơn vị:</span>
                                    <input
                                        className="border-b border-dotted border-black px-1 min-w-[150px] bg-transparent outline-none focus:bg-emerald-50/30 transition-colors"
                                        value={editableSlipInfo.unit}
                                        onChange={(e) => setEditableSlipInfo({ ...editableSlipInfo, unit: e.target.value })}
                                        placeholder="CRAFTFLOW"
                                    />
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="font-bold whitespace-nowrap">Bộ phận:</span>
                                    <input
                                        className="border-b border-dotted border-black px-1 min-w-[150px] bg-transparent outline-none focus:bg-emerald-50/30 transition-colors"
                                        value={editableSlipInfo.department}
                                        onChange={(e) => setEditableSlipInfo({ ...editableSlipInfo, department: e.target.value })}
                                        placeholder="Kho vật tư"
                                    />
                                </div>
                            </div>
                            <div className="text-center space-y-1">
                                <p className="font-bold text-base uppercase">{formNumber}</p>
                                <p className="text-[10px] leading-tight max-w-[220px] mx-auto">
                                    (Ban hành theo Thông tư số 133/2016/TT-BTC ngày 26/8/2016 của Bộ Tài chính)
                                </p>
                            </div>
                        </div>

                        {/* Title */}
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-bold uppercase mb-1">{formTitle}</h1>
                            <p className="italic text-sm">
                                Ngày {slip?.date ? format(new Date(slip.date), 'dd') : '...'} tháng {slip?.date ? format(new Date(slip.date), 'MM') : '...'} năm {slip?.date ? format(new Date(slip.date), 'yyyy') : '....'}
                            </p>
                            <div className="flex justify-center items-start gap-12 mt-4 text-sm">
                                <div className="text-left">
                                    <p><span className="font-bold">Số:</span> {slip?.slipNumber}</p>
                                </div>
                                <div className="space-y-1 text-left min-w-[120px]">
                                    <p>Nợ:
                                        <input
                                            className="border-b border-dotted border-black px-2 w-[80px] bg-transparent outline-none focus:bg-emerald-50/30 transition-colors ml-1"
                                            value={editableSlipInfo.accounting.debit}
                                            onChange={(e) => setEditableSlipInfo({
                                                ...editableSlipInfo,
                                                accounting: { ...editableSlipInfo.accounting, debit: e.target.value }
                                            })}
                                        />
                                    </p>
                                    <p>Có:
                                        <input
                                            className="border-b border-dotted border-black px-2 w-[80px] bg-transparent outline-none focus:bg-emerald-50/30 transition-colors ml-1"
                                            value={editableSlipInfo.accounting.credit}
                                            onChange={(e) => setEditableSlipInfo({
                                                ...editableSlipInfo,
                                                accounting: { ...editableSlipInfo.accounting, credit: e.target.value }
                                            })}
                                        />
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Info section */}
                        <div className="space-y-3 mb-6 text-sm">
                            <div className="flex items-baseline gap-2">
                                <span>{personLabel1}</span>
                                <input
                                    className="flex-1 border-b border-dotted border-black min-h-[1.2rem] px-2 font-medium bg-transparent outline-none focus:bg-emerald-50/30 transition-colors"
                                    value={editableSlipInfo.personName}
                                    onChange={(e) => setEditableSlipInfo({ ...editableSlipInfo, personName: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-3">
                                <span className="whitespace-nowrap">- Theo</span>
                                <input
                                    className="border-b border-dotted border-black min-w-[120px] max-w-[150px] text-center px-1 bg-transparent outline-none focus:bg-emerald-50/30 transition-colors font-medium"
                                    value={editableSlipInfo.referenceDoc.description}
                                    onChange={(e) => setEditableSlipInfo({
                                        ...editableSlipInfo,
                                        referenceDoc: { ...editableSlipInfo.referenceDoc, description: e.target.value }
                                    })}
                                />
                                <span className="whitespace-nowrap">số</span>
                                <input
                                    className="border-b border-dotted border-black min-w-[80px] max-w-[120px] text-center px-1 bg-transparent outline-none focus:bg-emerald-50/30 transition-colors font-medium"
                                    value={editableSlipInfo.referenceDoc.number}
                                    onChange={(e) => setEditableSlipInfo({
                                        ...editableSlipInfo,
                                        referenceDoc: { ...editableSlipInfo.referenceDoc, number: e.target.value }
                                    })}
                                />
                                <span className="whitespace-nowrap">ngày</span>
                                <input
                                    type="date"
                                    className="border-b border-dotted border-black min-w-[130px] text-center px-1 bg-transparent outline-none focus:bg-emerald-50/30 transition-colors font-medium cursor-pointer"
                                    value={editableSlipInfo.referenceDoc.date}
                                    onChange={(e) => setEditableSlipInfo({
                                        ...editableSlipInfo,
                                        referenceDoc: { ...editableSlipInfo.referenceDoc, date: e.target.value }
                                    })}
                                />
                                <span className="whitespace-nowrap">của</span>
                                <input
                                    className="flex-1 border-b border-dotted border-black min-w-[200px] px-2 bg-transparent outline-none focus:bg-emerald-50/30 transition-colors font-medium"
                                    value={editableSlipInfo.referenceDoc.issuer}
                                    onChange={(e) => setEditableSlipInfo({
                                        ...editableSlipInfo,
                                        referenceDoc: { ...editableSlipInfo.referenceDoc, issuer: e.target.value }
                                    })}
                                />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span>{actionLabel}</span>
                                <input
                                    className="border-b border-dotted border-black min-w-[180px] px-2 font-medium bg-transparent outline-none focus:bg-emerald-50/30 transition-colors"
                                    value={editableSlipInfo.warehouse.name}
                                    onChange={(e) => setEditableSlipInfo({
                                        ...editableSlipInfo,
                                        warehouse: { ...editableSlipInfo.warehouse, name: e.target.value }
                                    })}
                                />
                                <span>địa điểm</span>
                                <input
                                    className="flex-1 border-b border-dotted border-black px-2 font-medium bg-transparent outline-none focus:bg-emerald-50/30 transition-colors"
                                    value={editableSlipInfo.warehouse.location}
                                    onChange={(e) => setEditableSlipInfo({
                                        ...editableSlipInfo,
                                        warehouse: { ...editableSlipInfo.warehouse, location: e.target.value }
                                    })}
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="mb-6 overflow-x-auto">
                            <table className="w-full border-collapse border border-black text-[13px]">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="border border-black p-2 w-10 text-center" rowSpan={2}>STT</th>
                                        <th className="border border-black p-2 min-w-[200px] text-center" rowSpan={2}>Tên, nhãn hiệu, quy cách, phẩm chất vật tư, dụng cụ sản phẩm, hàng hóa</th>
                                        <th className="border border-black p-2 w-20 text-center" rowSpan={2}>Mã số</th>
                                        <th className="border border-black p-2 w-20 text-center" rowSpan={2}>ĐVT</th>
                                        <th className="border border-black p-1 text-center" colSpan={2}>Số lượng</th>
                                        <th className="border border-black p-2 w-24 text-center" rowSpan={2}>Đơn giá</th>
                                        <th className="border border-black p-2 w-28 text-center" rowSpan={2}>Thành tiền</th>
                                    </tr>
                                    <tr className="bg-gray-50/50">
                                        <th className="border border-black p-1 w-20 text-center">Theo chứng từ</th>
                                        <th className="border border-black p-1 w-20 text-center">{actualLabel}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {editableItems.map((item, idx) => (
                                        <tr key={idx} className="h-10">
                                            <td className="border border-black px-2 text-center">{idx + 1}</td>
                                            <td className="border border-black px-2 font-medium max-w-[250px] break-words">{item.itemName}</td>
                                            <td className="border border-black px-2 text-center">{item.itemCode}</td>
                                            <td className="border border-black px-2 text-center">{item.unit}</td>
                                            <td className="border border-black px-2 text-right">{item.quantity?.requested || 0}</td>
                                            <td className="border border-black p-0 text-center min-w-[90px]">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    value={item.quantity?.actual === 0 ? '' : item.quantity?.actual}
                                                    onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
                                                    }}
                                                    className="w-full min-h-[38px] bg-emerald-50/50 text-right px-2 font-bold text-emerald-700 outline-none focus:bg-emerald-100 transition-colors print:bg-transparent"
                                                />
                                            </td>
                                            <td className="border border-black px-2 text-right font-mono truncate max-w-[100px]" title={new Intl.NumberFormat('vi-VN').format(item.unitPrice || 0)}>
                                                {new Intl.NumberFormat('vi-VN').format(item.unitPrice || 0)}
                                            </td>
                                            <td className="border border-black px-2 text-right font-bold font-mono truncate max-w-[120px]" title={new Intl.NumberFormat('vi-VN').format(item.amount || 0)}>
                                                {new Intl.NumberFormat('vi-VN').format(item.amount || 0)}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Placeholder rows if few items */}
                                    {Array.from({ length: Math.max(0, 5 - (editableItems.length || 0)) }).map((_, i) => (
                                        <tr key={`empty-${i}`} className="h-9">
                                            <td className="border border-black px-2"></td>
                                            <td className="border border-black px-2"></td>
                                            <td className="border border-black px-2"></td>
                                            <td className="border border-black px-2"></td>
                                            <td className="border border-black px-2"></td>
                                            <td className="border border-black px-2"></td>
                                            <td className="border border-black px-2"></td>
                                            <td className="border border-black px-2"></td>
                                        </tr>
                                    ))}
                                    <tr className="h-10 font-bold bg-gray-50/30">
                                        <td className="border border-black px-4 text-center" colSpan={4}>Cộng</td>
                                        <td className="border border-black px-2 text-center text-gray-400 italic font-normal text-xs">x</td>
                                        <td className="border border-black px-2 text-center text-gray-400 italic font-normal text-xs">x</td>
                                        <td className="border border-black px-2 text-center text-gray-400 italic font-normal text-xs">x</td>
                                        <td className="border border-black px-2 text-right font-mono text-base truncate max-w-[120px]" title={new Intl.NumberFormat('vi-VN').format(totalAmount)}>
                                            {new Intl.NumberFormat('vi-VN').format(totalAmount)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Footer info */}
                        <div className="space-y-4 mb-10 text-sm">
                            <div className="flex items-baseline gap-2">
                                <span>- Tổng số tiền (viết bằng chữ):</span>
                                <span className="flex-1 border-b border-dotted border-black px-2 italic font-medium">
                                    {totalAmountInWords}
                                </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span>- Số chứng từ gốc kèm theo:</span>
                                <input
                                    className="flex-1 border-b border-dotted border-black px-2 font-medium bg-transparent outline-none focus:bg-emerald-50/30 transition-colors"
                                    value={editableSlipInfo.originalDocsCount}
                                    onChange={(e) => setEditableSlipInfo({ ...editableSlipInfo, originalDocsCount: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="grid grid-cols-4 gap-4 text-center text-[13px] mb-8">
                            <div className="flex flex-col h-full">
                                <p className="font-bold">Người lập phiếu</p>
                                <p className="italic text-[11px] mb-12">(Ký, họ tên)</p>
                                <div className="mt-auto">
                                    <p className="font-bold">{slip?.signatures?.creator?.name || ''}</p>
                                </div>
                            </div>
                            <div className="flex flex-col h-full">
                                <p className="font-bold">{personLabel2}</p>
                                <p className="italic text-[11px] mb-12">(Ký, họ tên)</p>
                                <div className="mt-auto">
                                    <p className="font-bold">{slip?.personName || ''}</p>
                                </div>
                            </div>
                            <div className="flex flex-col h-full">
                                <p className="font-bold">Thủ kho</p>
                                <p className="italic text-[11px] mb-12">(Ký, họ tên)</p>
                                <div className="mt-auto">
                                    <p className="font-bold">{slip?.signatures?.storekeeper?.name || ''}</p>
                                </div>
                            </div>
                            <div className="flex flex-col h-full">
                                <div className="italic text-[11px] mb-1">
                                    Ngày {slip?.date ? format(new Date(slip.date), 'dd') : '...'} tháng {slip?.date ? format(new Date(slip.date), 'MM') : '...'} năm {slip?.date ? format(new Date(slip.date), 'yyyy') : '....'}
                                </div>
                                <p className="font-bold">Kế toán trưởng</p>
                                <p className="text-[10px] leading-tight mb-1">(Hoặc bộ phận có nhu cầu {isImport ? 'nhập' : 'xuất'})</p>
                                <p className="italic text-[11px] mb-12">(Ký, họ tên)</p>
                                <div className="mt-auto">
                                    <p className="font-bold text-gray-400">........................</p>
                                </div>
                            </div>
                        </div>

                        {/* Status Badge & Actions (Digital only) */}
                        <div className="mt-12 pt-6 border-t border-dashed flex justify-between items-center print:hidden">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Trạng thái hệ thống:</span>
                                <Badge className={slip ? (statusConfig[slip.status]?.color || "bg-gray-100 text-gray-700") : ""}>
                                    {slip ? (statusConfig[slip.status]?.label || slip.status) : ""}
                                </Badge>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.print()}
                                    className="gap-2"
                                >
                                    In phiếu
                                </Button>
                                <Button
                                    size="sm"
                                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => {
                                        if (onSave) {
                                            onSave(editableSlipInfo, editableItems)
                                        }
                                    }}
                                >
                                    <Save className="size-4" />
                                    Lưu thay đổi
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}