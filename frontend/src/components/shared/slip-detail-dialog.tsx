"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Save, CheckCircle2, Image as ImageIcon, Upload, X, AlertTriangle, CheckCircle, ScanLine, History } from "lucide-react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { slipApi, Slip, SlipItem, FifoAuditResult, FifoHistoryResult } from "@/api/slip.api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { QRCodeSVG } from 'qrcode.react'
import Barcode from 'react-barcode'
import { QRScanner } from "@/features/receiving/components/qr-scanner"
import { useShelves } from "@/features/inventory/hooks/use-shelves"

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
    onStatusUpdate?: (status: string, items: any[]) => void
    onStockingAssignment?: (slip: Slip, items: SlipItem[]) => void
    isUpdating?: boolean
    readOnly?: boolean
}

export function SlipDetailDialog({
    open,
    onOpenChange,
    slip,
    type,
    statusConfig,
    onSave,
    onStatusUpdate,
    onStockingAssignment,
    isUpdating = false,
    readOnly = false
}: SlipDetailDialogProps) {
    const queryClient = useQueryClient()
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
    const [uploading, setUploading] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [isScannerOpen, setIsScannerOpen] = useState(false)
    const [fifoAudit, setFifoAudit] = useState<FifoAuditResult | null>(null)
    const [fifoLoading, setFifoLoading] = useState(false)
    const [fifoHistoryOpen, setFifoHistoryOpen] = useState(false)
    const [fifoHistoryLoading, setFifoHistoryLoading] = useState(false)
    const [fifoHistory, setFifoHistory] = useState<FifoHistoryResult | null>(null)
    const [selectedFifoItemKey, setSelectedFifoItemKey] = useState<string>("")
    const audioCtxRef = useRef<AudioContext | null>(null)
    const isImport = type === 'import'
    // Lấy danh sách kệ để chọn
    const { data: shelvesResponse } = useShelves({
        category: isImport ? 'Material' : undefined,
        status: 'Available'
    })
    const shelves = shelvesResponse?.data || []

    const currentStatus = slip?.status || 'pending'


    const canManageWorkflow = !readOnly && !!onStatusUpdate
    const canSaveDetails = !readOnly && !!onSave
    const canUploadEvidence = !readOnly

    // Xác định các quyền chỉnh sửa dựa trên trạng thái và ngữ cảnh mở phiếu
    const canEditProvisional = canManageWorkflow && isImport && currentStatus === 'pending'
    const canEditActual = canManageWorkflow && ((isImport && currentStatus === 'received') || (!isImport && currentStatus === 'inspecting'))
    const canEditInfo = canSaveDetails && (isImport
        ? ['pending', 'received', 'inspected'].includes(currentStatus)
        : ['pending', 'received', 'inspecting'].includes(currentStatus))

    const shouldShowFifoAudit = !isImport && ['inspecting', 'completed', 'verified'].includes(currentStatus)

    useEffect(() => {
        if (slip) {
            const items = JSON.parse(JSON.stringify(slip.items || []))

            // Tự động điền số lượng tạm nhập = yêu cầu nếu đang ở bước pending và chưa có số liệu
            if (isImport && currentStatus === 'pending') {
                items.forEach((item: any) => {
                    if (!item.quantity.provisional || item.quantity.provisional === 0) {
                        item.quantity.provisional = item.quantity.requested || 0
                    }
                })
            }
            // Tự động điền số lượng thực nhập = tạm nhập nếu đang ở bước received và chưa có số liệu
            else if (isImport && currentStatus === 'received') {
                items.forEach((item: any) => {
                    if (!item.quantity.actual || item.quantity.actual === 0) {
                        item.quantity.actual = item.quantity.provisional || item.quantity.requested || 0
                    }
                })
            }
            // Fallback cho dữ liệu cũ hoặc bị lỗi (nếu provisional hoặc actual là 0 ở các bước sau)
            else if (isImport && ['inspected', 'in_stock', 'verified'].includes(currentStatus)) {
                items.forEach((item: any) => {
                    if (!item.quantity.provisional || item.quantity.provisional === 0) {
                        item.quantity.provisional = item.quantity.actual || item.quantity.requested || 0
                    }
                    if (!item.quantity.actual || item.quantity.actual === 0) {
                        item.quantity.actual = item.quantity.provisional || item.quantity.requested || 0
                    }
                })
            }

            // Cập nhật lại amount cho tất cả các item dựa trên số lượng mới nhất
            items.forEach((item: any) => {
                const finalQty = item.quantity.actual || item.quantity.provisional || item.quantity.requested || 0
                item.amount = finalQty * (item.unitPrice || 0)
            })

            setEditableItems(items)
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

    useEffect(() => {
        if (!open || !slip || !shouldShowFifoAudit) {
            setFifoAudit(null)
            setFifoLoading(false)
            return
        }

        let isCancelled = false

        const loadFifoAudit = async () => {
            try {
                setFifoLoading(true)
                const response = await slipApi.getFifoAudit(slip._id)
                if (!isCancelled) {
                    setFifoAudit(response?.data || null)
                }
            } catch {
                if (!isCancelled) {
                    setFifoAudit(null)
                }
            } finally {
                if (!isCancelled) {
                    setFifoLoading(false)
                }
            }
        }

        loadFifoAudit()

        return () => {
            isCancelled = true
        }
    }, [open, slip?._id, shouldShowFifoAudit, slip])

    const totalAmount = useMemo(() => {
        return editableItems.reduce((sum, item) => sum + (item.amount || 0), 0)
    }, [editableItems])

    const totalRequested = useMemo(() => {
        return editableItems.reduce((sum, item) => sum + (item.quantity?.requested || 0), 0)
    }, [editableItems])

    const totalProvisional = useMemo(() => {
        return editableItems.reduce((sum, item) => sum + (item.quantity?.provisional || 0), 0)
    }, [editableItems])

    const totalActual = useMemo(() => {
        return editableItems.reduce((sum, item) => sum + (item.quantity?.actual || 0), 0)
    }, [editableItems])

    const quantityColumnCount = isImport ? 3 : 2
    const tableColumnCount = isImport ? 9 : 8

    const totalAmountInWords = useMemo(() => {
        return numberToVietnameseWords(totalAmount)
    }, [totalAmount])

    const selectedFifoHistoryItem = useMemo(() => {
        if (!fifoHistory?.items?.length) return null
        if (!selectedFifoItemKey) return fifoHistory.items[0]
        return fifoHistory.items.find((item) => `${item.itemType}:${item.itemId}` === selectedFifoItemKey) || fifoHistory.items[0]
    }, [fifoHistory, selectedFifoItemKey])

    const handleOpenFifoHistory = async () => {
        if (!slip) return
        setFifoHistoryOpen(true)
        if (fifoHistory?.slipId === slip._id) return
        try {
            setFifoHistoryLoading(true)
            const response = await slipApi.getFifoHistory(slip._id)
            const payload = response?.data || null
            setFifoHistory(payload)
            if (payload?.items?.length) {
                const firstKey = `${payload.items[0].itemType}:${payload.items[0].itemId}`
                setSelectedFifoItemKey(firstKey)
            } else {
                setSelectedFifoItemKey("")
            }
        } catch {
            setFifoHistory(null)
            setSelectedFifoItemKey("")
            toast.error("Không tải được lịch sử FIFO")
        } finally {
            setFifoHistoryLoading(false)
        }
    }

    const handleProvisionalChange = (idx: number, value: string) => {
        let val = Number(value)
        if (isNaN(val) || val < 0) val = 0
        const newItems = [...editableItems]
        if (newItems[idx]) {
            newItems[idx].quantity.provisional = val
            // Khi ở bước pending, tạm tính amount theo provisional
            newItems[idx].amount = val * (newItems[idx].unitPrice || 0)
            setEditableItems(newItems)
        }
    }

    const handleActualChange = (idx: number, value: string) => {
        let val = Number(value)
        if (isNaN(val) || val < 0) val = 0
        const newItems = [...editableItems]
        if (newItems[idx]) {
            newItems[idx].quantity.actual = val
            newItems[idx].amount = val * (newItems[idx].unitPrice || 0)
            setEditableItems(newItems)
        }
    }

    const buildStatusItems = (nextStatus: string) => {
        return editableItems.map(item => {
            const materialId = typeof item.material === 'object' && item.material ? ((item.material as any)._id || (item.material as any).id) : item.material;
            const productId = typeof item.product === 'object' && item.product ? ((item.product as any)._id || (item.product as any).id) : item.product;

            return {
                itemCode: item.itemCode,
                material: materialId || undefined,
                product: productId || undefined,
                actualQuantity: item.quantity.actual || 0,
                ...(isImport ? { provisionalQuantity: item.quantity.provisional } : {}),
                itemNote: item.itemNote || ""
            }
        })
    }

    // Hàm phát âm thanh khi quét QR
    const playScanSound = (type: 'success' | 'error') => {
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
            }
            const ctx = audioCtxRef.current
            if (ctx.state === 'suspended') ctx.resume()

            const oscillator = ctx.createOscillator()
            const gainNode = ctx.createGain()
            oscillator.connect(gainNode)
            gainNode.connect(ctx.destination)

            if (type === 'success') {
                // Tiếng "Bíp" ngắn, thanh (Tần số 1200Hz)
                oscillator.type = 'sine'
                oscillator.frequency.setValueAtTime(1200, ctx.currentTime)
                gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
                oscillator.start(ctx.currentTime)
                oscillator.stop(ctx.currentTime + 0.1)
            } else {
                // Tiếng "Tít Tít" lỗi (Tần số 400Hz, 2 nhịp)
                oscillator.type = 'square'
                oscillator.frequency.setValueAtTime(400, ctx.currentTime)
                gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
                oscillator.start(ctx.currentTime)
                oscillator.stop(ctx.currentTime + 0.15)

                const osc2 = ctx.createOscillator()
                const gain2 = ctx.createGain()
                osc2.connect(gain2)
                gain2.connect(ctx.destination)
                osc2.type = 'square'
                osc2.frequency.setValueAtTime(400, ctx.currentTime + 0.2)
                gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.2)
                gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
                osc2.start(ctx.currentTime + 0.2)
                osc2.stop(ctx.currentTime + 0.35)
            }
        } catch (e) {
            console.error("Audio API not supported", e)
        }
    }

    const handleScanSuccess = (data: any) => {
        const scannedCode = data?.code || data?.itemCode || data?.materialCode || data?.productCode || data?.id || (typeof data === 'string' ? data : null)

        if (!scannedCode) {
            toast.error("Mã không hợp lệ hoặc không đọc được.")
            return
        }

        // Tìm item có mã tương ứng trong danh sách phiếu (bao gồm cả fallback nếu mã có tiền tố phụ)
        const itemIndex = editableItems.findIndex(item => item.itemCode === scannedCode || item.itemCode === scannedCode.split('-')[0])

        if (itemIndex !== -1) {
            const newItems = [...editableItems]
            const item = newItems[itemIndex]

            if (canEditActual) {
                item.quantity.actual = (item.quantity.actual || 0) + 1
                item.amount = item.quantity.actual * (item.unitPrice || 0)
                playScanSound('success')
                toast.success(`Khớp mã! Đã cộng 1 vào thực nhập: ${item.itemName}`, {
                    description: `Số lượng thực tế mới: ${item.quantity.actual}`
                })
            } else if (canEditProvisional) {
                item.quantity.provisional = (item.quantity.provisional || 0) + 1
                item.amount = item.quantity.provisional * (item.unitPrice || 0)
                playScanSound('success')
                toast.success(`Khớp mã! Đã cộng 1 vào tạm tính: ${item.itemName}`, {
                    description: `Số lượng tạm tính mới: ${item.quantity.provisional}`
                })
            }

            setEditableItems(newItems)
        } else {
            playScanSound('error')
            toast.error(`Mã [${scannedCode}] không khớp!`, {
                description: "Vật tư/sản phẩm này KHÔNG CÓ TRONG PHIẾU."
            })
        }
    }

    // Logic xác định bước tiếp theo và nhãn nút
    const getNextStepAction = () => {
        if (isImport) {
            switch (currentStatus) {
                case 'pending':
                    return { label: 'Xác nhận nhận hàng', nextStatus: 'received', color: 'bg-blue-600' }
                case 'received':
                    return { label: 'Hoàn tất kiểm tra', nextStatus: 'inspected', color: 'bg-purple-600' }
                case 'inspected':
                    return { label: 'Nhập kho chính thức', nextStatus: 'in_stock', color: 'bg-emerald-600' }
                default:
                    return null
            }
        } else {
            switch (currentStatus) {
                case 'pending':
                    return { label: 'Bắt đầu soạn hàng', nextStatus: 'received', color: 'bg-blue-600' }
                case 'received':
                    return { label: 'Chuyển sang kiểm hàng', nextStatus: 'inspecting', color: 'bg-purple-600' }
                case 'inspecting':
                    return { label: 'Hoàn tất xuất kho', nextStatus: 'completed', color: 'bg-emerald-600' }
                default:
                    return null
            }
        }
    }

    const nextStep = getNextStepAction()

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(Array.from(e.target.files))
        }
    }

    const handleUploadImages = async () => {
        if (!slip || selectedFiles.length === 0) return
        setUploading(true)
        try {
            await slipApi.uploadSlipImages(slip._id, selectedFiles)
            queryClient.invalidateQueries({ queryKey: ['slips'] })
            queryClient.invalidateQueries({ queryKey: ['product-export-requests'] })
            queryClient.invalidateQueries({ queryKey: ['requisitions'] })
            toast.success("Tải lên ảnh chứng từ thành công")
            setSelectedFiles([])
            // Có thể cần refresh lại dữ liệu slip ở đây hoặc báo cho component cha
            if (onOpenChange) onOpenChange(false)
        } catch (error: any) {
            toast.error(error?.response?.data?.error || "Lỗi khi tải lên ảnh")
        } finally {
            setUploading(false)
        }
    }

    const formTitle = isImport ? "Phiếu nhập kho" : "Phiếu xuất kho"
    const formNumber = isImport ? "Mẫu số 01 - VT" : "Mẫu số 02 - VT"
    const actionLabel = isImport ? "- Nhập tại kho:" : "- Xuất tại kho:"
    const personLabel1 = isImport ? "- Họ và tên người giao:" : "- Họ và tên người nhận hàng:"
    const personLabel2 = isImport ? "Người giao hàng" : "Người nhận hàng"
    const actualLabel = isImport ? "Thực nhập" : "Thực xuất"

    const handlePrint = () => {
        const printContent = document.getElementById('printable-slip-wrapper');
        if (!printContent) return;

        // Cập nhật value cho các input để outerHTML lấy được giá trị bạn vừa gõ
        const inputs = printContent.querySelectorAll('input');
        inputs.forEach(input => {
            input.setAttribute('value', input.value);
        });

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error("Vui lòng cho phép popup trình duyệt để in phiếu");
            return;
        }

        let styleHTML = '';
        document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
            styleHTML += el.outerHTML;
        });

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>In Phiếu</title>
                ${styleHTML}
                <style>
                    body { background: white !important; padding: 0; font-family: "Times New Roman", Times, serif; }
                    #printable-slip-wrapper { width: 100%; margin: 0 auto; padding: 20px; }
                    .print\\:hidden { display: none !important; }
                    input { border: none !important; border-bottom: 1px dotted black !important; background: transparent !important; color: black !important; }
                    table { border-collapse: collapse !important; width: 100% !important; }
                    th, td { border: 1px solid black !important; }
                    ::-webkit-scrollbar { display: none; }
                    @media print {
                        @page { size: A4; margin: 15mm; }
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                ${printContent.outerHTML}
                <script>
                    setTimeout(() => {
                        window.print();
                        window.onafterprint = () => window.close();
                    }, 800); // Chờ 800ms cho QR/Barcode render nét chuẩn
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent size="4xl" className="w-[95vw] max-h-[95vh] p-0 border-none shadow-2xl rounded-2xl overflow-hidden flex flex-col bg-white">
                <DialogHeader className="sr-only">
                    <DialogTitle>{formTitle}: {slip?.slipNumber}</DialogTitle>
                    <DialogDescription>
                        Hiển thị thông tin chi tiết và chỉnh sửa {formTitle.toLowerCase()} theo {formNumber}
                    </DialogDescription>
                </DialogHeader>

                {/* Style dành riêng cho máy in: Cắt bỏ UI thừa, chuẩn hóa form giấy */}
                <style>{`
                    @media print {
                        body { visibility: hidden; background: white !important; }
                        #printable-slip-wrapper, #printable-slip-wrapper * { visibility: visible; }
                        #printable-slip-wrapper {
                            position: absolute; left: 0; top: 0; width: 100vw; margin: 0; padding: 0;
                            background: white !important;
                        }
                        /* Ẩn các phần tử có class print:hidden */
                        .print\\:hidden { display: none !important; }
                        /* Chuyển các input thành chữ thường có viền chấm */
                        #printable-slip-wrapper input {
                            border: none !important;
                            border-bottom: 1px dotted black !important;
                            background: transparent !important;
                            color: black !important;
                        }
                        /* Chuẩn hóa viền bảng in */
                        table { border-collapse: collapse !important; width: 100% !important; }
                        th, td { border: 1px solid black !important; }
                        /* Ẩn thanh cuộn */
                        ::-webkit-scrollbar { display: none; }
                        @page { size: A4; margin: 15mm; }
                    }
                `}</style>

                <div className="overflow-y-auto w-full h-full scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                    <div id="printable-slip-wrapper" className="p-8 md:p-12 text-black print:p-0" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                        {/* Header */}
                        <div className="flex justify-between items-start mb-8">
                            <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-1">
                                    <span className="font-bold whitespace-nowrap">Đơn vị:</span>
                                    <input
                                        className="border-b border-dotted border-black px-1 min-w-[150px] bg-transparent outline-none focus:bg-emerald-50/30 transition-colors"
                                        value={editableSlipInfo.unit}
                                        readOnly={!canEditInfo}
                                        onChange={(e) => setEditableSlipInfo({ ...editableSlipInfo, unit: e.target.value })}
                                        placeholder="CRAFTFLOW"
                                    />
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="font-bold whitespace-nowrap">Bộ phận:</span>
                                    <input
                                        className="border-b border-dotted border-black px-1 min-w-[150px] bg-transparent outline-none focus:bg-emerald-50/30 transition-colors"
                                        value={editableSlipInfo.department}
                                        readOnly={!canEditInfo}
                                        onChange={(e) => setEditableSlipInfo({ ...editableSlipInfo, department: e.target.value })}
                                        placeholder="Kho vật tư"
                                    />
                                </div>
                            </div>
                            <div className="flex items-start gap-8">
                                <div className="text-center space-y-1 mt-1">
                                    <p className="font-bold text-base uppercase">{formNumber}</p>
                                    <p className="text-[10px] leading-tight max-w-[220px] mx-auto">
                                        (Ban hành theo Thông tư số 133/2016/TT-BTC ngày 26/8/2016 của Bộ Tài chính)
                                    </p>
                                </div>
                                {slip && (
                                    <div className="flex flex-col items-center justify-center p-2.5 bg-white rounded-lg border-2 border-dashed border-gray-300 shrink-0 min-w-[120px] print:border-black print:border-solid">
                                        <QRCodeSVG
                                            value={JSON.stringify({ type: isImport ? 'RECEIVING_SLIP' : 'DELIVERY_SLIP', id: slip._id, code: slip.slipNumber })}
                                            size={65}
                                            level="M"
                                            includeMargin={false}
                                        />
                                        <div className="border-t border-gray-200 print:border-black mt-2.5 pt-2 w-full flex justify-center">
                                            <Barcode
                                                value={slip.slipNumber}
                                                width={1.2}
                                                height={28}
                                                displayValue={true}
                                                fontSize={11}
                                                background="transparent"
                                                margin={0}
                                            />
                                        </div>
                                    </div>
                                )}
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
                                            readOnly={!canEditInfo}
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
                                            readOnly={!canEditInfo}
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
                                    readOnly={!canEditInfo}
                                    onChange={(e) => setEditableSlipInfo({ ...editableSlipInfo, personName: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-3">
                                <span className="whitespace-nowrap">- Theo</span>
                                <input
                                    className="border-b border-dotted border-black min-w-[120px] max-w-[150px] text-center px-1 bg-transparent outline-none focus:bg-emerald-50/30 transition-colors font-medium"
                                    value={editableSlipInfo.referenceDoc.description}
                                    readOnly={!canEditInfo}
                                    onChange={(e) => setEditableSlipInfo({
                                        ...editableSlipInfo,
                                        referenceDoc: { ...editableSlipInfo.referenceDoc, description: e.target.value }
                                    })}
                                />
                                <span className="whitespace-nowrap">số</span>
                                <input
                                    className="border-b border-dotted border-black min-w-[80px] max-w-[120px] text-center px-1 bg-transparent outline-none focus:bg-emerald-50/30 transition-colors font-medium"
                                    value={editableSlipInfo.referenceDoc.number}
                                    readOnly={!canEditInfo}
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
                                    readOnly={!canEditInfo}
                                    onChange={(e) => setEditableSlipInfo({
                                        ...editableSlipInfo,
                                        referenceDoc: { ...editableSlipInfo.referenceDoc, date: e.target.value }
                                    })}
                                />
                                <span className="whitespace-nowrap">của</span>
                                <input
                                    className="flex-1 border-b border-dotted border-black min-w-[200px] px-2 bg-transparent outline-none focus:bg-emerald-50/30 transition-colors font-medium"
                                    value={editableSlipInfo.referenceDoc.issuer}
                                    readOnly={!canEditInfo}
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
                                    readOnly={!canEditInfo}
                                    onChange={(e) => setEditableSlipInfo({
                                        ...editableSlipInfo,
                                        warehouse: { ...editableSlipInfo.warehouse, name: e.target.value }
                                    })}
                                />
                                <span>địa điểm</span>
                                <input
                                    className="flex-1 border-b border-dotted border-black px-2 font-medium bg-transparent outline-none focus:bg-emerald-50/30 transition-colors"
                                    value={editableSlipInfo.warehouse.location}
                                    readOnly={!canEditInfo}
                                    onChange={(e) => setEditableSlipInfo({
                                        ...editableSlipInfo,
                                        warehouse: { ...editableSlipInfo.warehouse, location: e.target.value }
                                    })}
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex items-center justify-between mb-2 mt-4 print:hidden">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                Danh sách vật tư / hàng hóa
                            </h3>
                            {(canEditProvisional || canEditActual) && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setIsScannerOpen(true)}
                                    className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                                >
                                    <ScanLine className="size-4" />
                                    Quét mã kiểm đếm
                                </Button>
                            )}
                        </div>
                        <div className="mb-6 overflow-x-auto">
                            <table className="w-full border-collapse border border-black text-[13px]">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="border border-black p-2 w-10 text-center" rowSpan={2}>STT</th>
                                        <th className="border border-black p-2 min-w-[200px] text-center" rowSpan={2}>Tên, nhãn hiệu, quy cách, phẩm chất vật tư, dụng cụ sản phẩm, hàng hóa</th>
                                        <th className="border border-black p-2 w-28 text-center" rowSpan={2}>Mã số</th>
                                        <th className="border border-black p-2 w-20 text-center" rowSpan={2}>ĐVT</th>
                                        <th className="border border-black p-1 text-center" colSpan={quantityColumnCount}>Số lượng</th>
                                        <th className="border border-black p-2 w-24 text-center" rowSpan={2}>Đơn giá</th>
                                        <th className="border border-black p-2 w-28 text-center" rowSpan={2}>Thành tiền</th>
                                    </tr>
                                    <tr className="bg-gray-50/50">
                                        <th className="border border-black p-1 w-20 text-center text-[11px]">Theo chứng từ</th>
                                        {isImport && <th className="border border-black p-1 w-20 text-center text-[11px]">Tạm nhập</th>}
                                        <th className="border border-black p-1 w-20 text-center text-[11px]">{actualLabel}</th>
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

                                            {isImport && (
                                                <td className="border border-black p-0 text-center min-w-[80px]">
                                                    {canEditProvisional ? (
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={item.quantity?.provisional === 0 ? '' : item.quantity?.provisional}
                                                            onChange={(e) => handleProvisionalChange(idx, e.target.value)}
                                                            className="w-full h-full bg-blue-50/50 text-right px-2 font-bold text-blue-700 outline-none focus:bg-blue-100"
                                                        />
                                                    ) : (
                                                        <span className="px-2 text-right block">{item.quantity?.provisional || 0}</span>
                                                    )}
                                                </td>
                                            )}

                                            {/* Actual Quantity */}
                                            <td className="border border-black p-0 text-center min-w-[80px]">
                                                {canEditActual ? (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={item.quantity?.actual === 0 ? '' : item.quantity?.actual}
                                                        onChange={(e) => handleActualChange(idx, e.target.value)}
                                                        className="w-full h-full bg-emerald-50/50 text-right px-2 font-bold text-emerald-700 outline-none focus:bg-emerald-100"
                                                    />
                                                ) : (
                                                    <span className="px-2 text-right block font-medium">{item.quantity?.actual || 0}</span>
                                                )}
                                            </td>

                                            <td className="border border-black px-2 text-right font-mono truncate max-w-[100px]">
                                                {new Intl.NumberFormat('vi-VN').format(item.unitPrice || 0)}
                                            </td>
                                            <td className="border border-black px-2 text-right font-bold font-mono truncate max-w-[120px]">
                                                {new Intl.NumberFormat('vi-VN').format(item.amount || 0)}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Placeholder rows if few items */}
                                    {Array.from({ length: Math.max(0, 5 - (editableItems.length || 0)) }).map((_, i) => (
                                        <tr key={`empty-${i}`} className="h-9">
                                            {Array.from({ length: tableColumnCount }).map((__, emptyIdx) => (
                                                <td key={emptyIdx} className="border border-black px-2"></td>
                                            ))}
                                        </tr>
                                    ))}
                                    <tr className="h-10 font-bold bg-gray-50/30">
                                        <td className="border border-black px-4 text-center" colSpan={4}>Cộng</td>
                                        <td className="border border-black px-2 text-right text-xs font-mono">{totalRequested}</td>
                                        {isImport && <td className="border border-black px-2 text-right text-xs font-mono text-blue-700">{totalProvisional}</td>}
                                        <td className="border border-black px-2 text-right text-xs font-mono text-emerald-700">{totalActual}</td>
                                        <td className="border border-black px-2 text-center text-gray-400 italic font-normal text-xs">x</td>
                                        <td className="border border-black px-2 text-right font-mono text-base min-w-[140px]" title={new Intl.NumberFormat('vi-VN').format(totalAmount)}>
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
                                    readOnly={!canEditInfo}
                                    onChange={(e) => setEditableSlipInfo({ ...editableSlipInfo, originalDocsCount: e.target.value })}
                                />
                            </div>
                        </div>

                        {shouldShowFifoAudit && (
                            <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50/60 p-4 print:hidden">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-semibold">Kiểm chứng FIFO</div>
                                    {fifoLoading ? (
                                        <Badge className="bg-gray-100 text-gray-700 border-gray-200">Đang kiểm tra...</Badge>
                                    ) : fifoAudit ? (
                                        <Badge className={fifoAudit.passed ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"}>
                                            {fifoAudit.passed ? "Đạt FIFO" : "Lệch FIFO"}
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">Chưa có dữ liệu</Badge>
                                    )}
                                </div>
                                {fifoAudit && (
                                    <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                                        <div>
                                            Đã kiểm tra {fifoAudit.itemCount} mặt hàng, phát hiện {fifoAudit.violationCount} điểm lệch.
                                        </div>
                                        {!fifoAudit.passed && fifoAudit.items.filter(item => !item.passed).slice(0, 3).map((item, idx) => (
                                            <div key={`${item.itemId}-${idx}`} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                                                {item.itemType === 'material' ? 'Nguyên liệu' : 'Thành phẩm'}: dùng lô {item.violations[0]?.usedBatchNumber || '-'} trước lô cũ hơn {item.violations[0]?.expectedBatchNumber || '-'}.
                                            </div>
                                        ))}
                                        {fifoAudit.items.length > 0 && (
                                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                                                <div className="mb-2 text-xs font-semibold text-foreground">Lô đã được sử dụng để xuất (đối chiếu FIFO)</div>
                                                <div className="space-y-2">
                                                    {fifoAudit.items.map((item) => (
                                                        <div key={`alloc-${item.itemType}-${item.itemId}`} className="rounded-md border border-gray-100 bg-gray-50/60 p-2">
                                                            <div className="mb-1 flex items-center justify-between gap-2">
                                                                <span className="text-[11px] font-medium text-foreground">
                                                                    {item.itemType === "material" ? "Nguyên liệu" : "Thành phẩm"} · {item.itemId}
                                                                </span>
                                                                <Badge className={item.passed ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"}>
                                                                    {item.passed ? "Đúng FIFO" : "Lệch FIFO"}
                                                                </Badge>
                                                            </div>
                                                            {item.allocations?.length ? (
                                                                <div className="space-y-1">
                                                                    {item.allocations.map((allocation) => (
                                                                        <div key={allocation.transactionId} className="grid grid-cols-12 gap-2 rounded border border-gray-100 bg-white px-2 py-1 text-[11px]">
                                                                            <div className="col-span-6 md:col-span-5">
                                                                                <span className="text-muted-foreground">Lô:</span>{" "}
                                                                                <span className="font-medium text-foreground">{allocation.batchNumber || "-"}</span>
                                                                            </div>
                                                                            <div className="col-span-3 md:col-span-2 text-emerald-700 font-semibold">
                                                                                {allocation.quantity}
                                                                            </div>
                                                                            <div className="col-span-12 md:col-span-5 text-muted-foreground">
                                                                                Nhập: {allocation.receivedDate ? format(new Date(allocation.receivedDate), "dd/MM/yyyy HH:mm") : "-"}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-[11px] text-muted-foreground">Không có dữ liệu phân bổ lô cho mục này.</div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="pt-1">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="gap-2"
                                                onClick={handleOpenFifoHistory}
                                            >
                                                <History className="size-4" />
                                                Xem lịch sử FIFO đầy đủ
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Evidence Images Section */}
                        {slip?.images && slip.images.length > 0 && (
                            <div className="mb-8 p-6 rounded-2xl border bg-gray-50/30 print:hidden">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold flex items-center gap-2">
                                        <ImageIcon className="size-4 text-blue-600" />
                                        Ảnh chứng từ thực tế:
                                    </h3>
                                    <div className="flex gap-2">
                                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1.5 py-1 px-3">
                                            <CheckCircle className="size-3.5" />
                                            Confirmed
                                        </Badge>
                                        {slip.isImageUploadLate && (
                                            <Badge className="bg-red-100 text-red-700 border-red-200 gap-1.5 py-1 px-3">
                                                <AlertTriangle className="size-3.5" />
                                                LATE (Quá hạn 3 ngày)
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {slip.imageUploadedAt && (
                                    <p className="text-xs text-muted-foreground mb-4 italic">
                                        Đã tải lên vào lúc: {format(new Date(slip.imageUploadedAt), 'HH:mm, dd/MM/yyyy', { locale: vi })}
                                    </p>
                                )}

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {slip.images.map((img, idx) => (
                                        <div key={idx} className="group relative aspect-video rounded-xl overflow-hidden border-2 border-white shadow-sm bg-muted ring-1 ring-gray-200">
                                            <img
                                                src={img}
                                                alt={`Evidence ${idx + 1}`}
                                                className="w-full h-full object-cover cursor-pointer group-hover:scale-110 transition-all duration-300"
                                                onClick={() => window.open(img, '_blank')}
                                            />
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                                                <ImageIcon className="size-6 text-white" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upload Evidence Section (Warehouse Only) */}
                        {canUploadEvidence && ((isImport && currentStatus === 'in_stock') || (!isImport && currentStatus === 'completed')) && (
                            <div className="mb-10 p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 print:hidden">
                                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                    <Upload className="size-4 text-blue-600" />
                                    Cập nhật ảnh chứng từ (Ký nhận thực tế):
                                </h3>
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            id="evidence-upload"
                                            className="hidden"
                                        />
                                        <label
                                            htmlFor="evidence-upload"
                                            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-sm"
                                        >
                                            <Upload className="size-4" />
                                            Chọn ảnh ({selectedFiles.length} đã chọn)
                                        </label>
                                        {selectedFiles.length > 0 && (
                                            <Button
                                                size="sm"
                                                onClick={handleUploadImages}
                                                disabled={uploading}
                                                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                                            >
                                                {uploading ? "Đang tải lên..." : "Tải lên ngay"}
                                            </Button>
                                        )}
                                    </div>
                                    {selectedFiles.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {selectedFiles.map((file, i) => (
                                                <div key={i} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                                                    <span className="truncate max-w-[150px]">{file.name}</span>
                                                    <X className="size-3 cursor-pointer" onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

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
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePrint}
                                    className="gap-2"
                                    disabled={isUpdating}
                                >
                                    In phiếu
                                </Button>

                                {canManageWorkflow && nextStep && (
                                    <Button
                                        size="sm"
                                        className={cn("gap-2 text-white shadow-sm transition-all hover:scale-105 active:scale-95", nextStep.color)}
                                        onClick={() => {
                                            if (nextStep.nextStatus === 'in_stock' && onStockingAssignment && slip) {
                                                onStockingAssignment(slip, editableItems)
                                            } else if (onStatusUpdate) {
                                                onStatusUpdate(nextStep.nextStatus, buildStatusItems(nextStep.nextStatus))
                                            }
                                        }}
                                        disabled={isUpdating}
                                    >
                                        <CheckCircle2 className="size-4" />
                                        {nextStep.label}
                                    </Button>
                                )}

                                {canEditInfo && (
                                    <Button
                                        size="sm"
                                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all hover:scale-105 active:scale-95"
                                        onClick={() => {
                                            if (onSave) {
                                                const itemsWithDetails = editableItems.map(item => ({
                                                    ...item,
                                                    shelf: typeof item.shelf === 'object' ? (item.shelf as any)?._id : item.shelf
                                                }))
                                                onSave(editableSlipInfo, itemsWithDetails)
                                            }
                                        }}
                                        disabled={isUpdating}
                                    >
                                        <Save className="size-4" />
                                        Lưu thay đổi
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
            <QRScanner
                open={isScannerOpen}
                onOpenChange={setIsScannerOpen}
                onScanSuccess={handleScanSuccess}
            />
            <Dialog open={fifoHistoryOpen} onOpenChange={setFifoHistoryOpen}>
                <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Lịch sử FIFO theo phiếu {slip?.slipNumber}</DialogTitle>
                        <DialogDescription>
                            Theo dõi đầy đủ batch, luồng nhập/xuất, vị trí hiện tại và chứng từ liên quan của từng mặt hàng.
                        </DialogDescription>
                    </DialogHeader>
                    {fifoHistoryLoading ? (
                        <div className="text-sm text-muted-foreground py-6">Đang tải lịch sử FIFO...</div>
                    ) : !fifoHistory?.items?.length ? (
                        <div className="text-sm text-muted-foreground py-6">Chưa có dữ liệu lịch sử FIFO cho phiếu này.</div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {fifoHistory.items.map((item) => {
                                    const itemKey = `${item.itemType}:${item.itemId}`
                                    const active = selectedFifoHistoryItem && `${selectedFifoHistoryItem.itemType}:${selectedFifoHistoryItem.itemId}` === itemKey
                                    return (
                                        <button
                                            key={itemKey}
                                            type="button"
                                            onClick={() => setSelectedFifoItemKey(itemKey)}
                                            className={cn(
                                                "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                                                active ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 bg-white hover:bg-gray-50"
                                            )}
                                        >
                                            <div className="font-semibold">{item.itemName || item.itemCode || item.itemId}</div>
                                            <div className="text-muted-foreground">
                                                {item.summary.batchCount} batch • Còn {item.summary.totalRemaining} {item.unit || ''}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>

                            {selectedFifoHistoryItem && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                                        <div className="rounded-lg border p-3"><div className="text-muted-foreground">Mã hàng</div><div className="font-semibold">{selectedFifoHistoryItem.itemCode || '-'}</div></div>
                                        <div className="rounded-lg border p-3"><div className="text-muted-foreground">Tổng batch</div><div className="font-semibold">{selectedFifoHistoryItem.summary.batchCount}</div></div>
                                        <div className="rounded-lg border p-3"><div className="text-muted-foreground">Batch còn hàng</div><div className="font-semibold">{selectedFifoHistoryItem.summary.activeBatchCount}</div></div>
                                        <div className="rounded-lg border p-3"><div className="text-muted-foreground">Đã nhập</div><div className="font-semibold">{selectedFifoHistoryItem.summary.totalReceived} {selectedFifoHistoryItem.unit || ''}</div></div>
                                        <div className="rounded-lg border p-3"><div className="text-muted-foreground">Còn lại</div><div className="font-semibold">{selectedFifoHistoryItem.summary.totalRemaining} {selectedFifoHistoryItem.unit || ''}</div></div>
                                    </div>

                                    <div className="rounded-xl border overflow-hidden">
                                        <div className="bg-muted/40 px-4 py-2 text-sm font-semibold">Danh sách batch hiện có</div>
                                        <div className="divide-y">
                                            {selectedFifoHistoryItem.batches.map((batch) => (
                                                <div key={batch.batchId} className="grid grid-cols-1 md:grid-cols-6 gap-2 px-4 py-3 text-xs">
                                                    <div><div className="text-muted-foreground">Batch</div><div className="font-semibold">{batch.batchNumber}</div></div>
                                                    <div><div className="text-muted-foreground">Nhập ngày</div><div>{format(new Date(batch.receivedDate), "dd/MM/yyyy HH:mm")}</div></div>
                                                    <div><div className="text-muted-foreground">Số lượng</div><div>{batch.quantityRemaining}/{batch.quantityReceived} {selectedFifoHistoryItem.unit || ''}</div></div>
                                                    <div><div className="text-muted-foreground">Vị trí</div><div>{batch.currentLocation?.shelfCode || 'Chưa gán kệ'}</div></div>
                                                    <div><div className="text-muted-foreground">Đơn nguồn</div><div>{batch.source.purchaseOrderCode || batch.source.importSlipNumber || batch.source.productionOrderCode || '-'}</div></div>
                                                    <div><div className="text-muted-foreground">Hạn dùng</div><div>{batch.expirationDate ? format(new Date(batch.expirationDate), "dd/MM/yyyy") : '-'}</div></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border overflow-hidden">
                                        <div className="bg-muted/40 px-4 py-2 text-sm font-semibold">Lịch sử luân chuyển</div>
                                        <div className="max-h-[360px] overflow-auto divide-y">
                                            {selectedFifoHistoryItem.transactions.map((tx) => (
                                                <div key={tx.transactionId} className="grid grid-cols-1 md:grid-cols-7 gap-2 px-4 py-3 text-xs">
                                                    <div><div className="text-muted-foreground">Thời gian</div><div>{format(new Date(tx.createdAt), "dd/MM/yyyy HH:mm")}</div></div>
                                                    <div><div className="text-muted-foreground">Nghiệp vụ</div><div className="font-semibold">{tx.type}</div></div>
                                                    <div>
                                                        <div className="text-muted-foreground">{tx.signedQuantity < 0 ? "Xuất từ lô" : "Theo lô"}</div>
                                                        <div className="font-medium">{tx.batchNumber || '-'}</div>
                                                    </div>
                                                    <div><div className="text-muted-foreground">Biến động</div><div className={tx.signedQuantity < 0 ? "text-red-600 font-semibold" : "text-emerald-700 font-semibold"}>{tx.signedQuantity > 0 ? `+${tx.signedQuantity}` : tx.signedQuantity} {selectedFifoHistoryItem.unit || ''}</div></div>
                                                    <div>
                                                        <div className="text-muted-foreground">Đơn liên quan</div>
                                                        <div className="font-medium">{tx.orderRef || tx.productionOrderCode || tx.purchaseOrderCode || tx.requisitionCode || '-'}</div>
                                                    </div>
                                                    <div><div className="text-muted-foreground">Vị trí</div><div>{tx.location || '-'}</div></div>
                                                    <div>
                                                        <div className="text-muted-foreground">Thực hiện</div>
                                                        <div>{tx.performedBy?.name || '-'}</div>
                                                        <div className="text-[10px] text-muted-foreground">Tx: {tx.transactionId}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Dialog>
    )
}
