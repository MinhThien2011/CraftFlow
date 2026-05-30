"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useQueries } from "@tanstack/react-query"
import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { shrinkageApi } from "@/api/shrinkage.api"
import { batchApi } from "@/api/batch.api"
import { slipApi, Slip } from "@/api/slip.api"
import { productionApi } from "@/api/production.api"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { SlipDetailDialog } from "@/components/shared/slip-detail-dialog"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertTriangle,
  PlusCircle,
  CheckCircle2,
  Clock,
  FileText,
  Package,
  Layers,
  Info,
  ChevronRight,
  Scale,
  Search,
  Calendar,
  AlertCircle,
  Sparkles,
  History,
  RotateCcw
} from "lucide-react"

const statusBadge: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40",
  checking: "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40",
  resolved: "bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/40",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40",
  rejected: "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40",
}

const statusLabel: Record<string, string> = {
  pending: "Chờ duyệt",
  checking: "Đang kiểm tra",
  resolved: "Đã giải quyết",
  accepted: "Đã duyệt",
  rejected: "Từ chối",
}

const slipStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Đang chờ", color: "bg-amber-50 text-amber-700 border-amber-200/50" },
  received: { label: "Đã nhận", color: "bg-blue-50 text-blue-700 border-blue-200/50" },
  inspected: { label: "Đã kiểm tra", color: "bg-purple-50 text-purple-700 border-purple-200/50" },
  in_stock: { label: "Đã vào kho", color: "bg-emerald-50 text-emerald-700 border-emerald-200/50" },
  completed: { label: "Đã hoàn tất", color: "bg-emerald-50 text-emerald-700 border-emerald-200/50" },
  cancelled: { label: "Đã hủy", color: "bg-rose-50 text-rose-700 border-rose-200/50" },
}

export default function IssuesPage() {
  const qc = useQueryClient()
  const { isProductionManager, isAdmin } = useAuth()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedProductionOrderId, setSelectedProductionOrderId] = useState("")
  // batchInputs[materialId][batchId] = shrinkageAmount string
  const [batchInputs, setBatchInputs] = useState<Record<string, Record<string, string>>>({})
  const [shrinkageReason, setShrinkageReason] = useState("")
  const [notableMetrics, setNotableMetrics] = useState("")

  const [filterMonth, setFilterMonth] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterMaterialId, setFilterMaterialId] = useState("all")
  const [filterOrderCode, setFilterOrderCode] = useState("")
  const [filterOrderId, setFilterOrderId] = useState("all")

  const [selectedReportId, setSelectedReportId] = useState("")
  const [slipDialogOpen, setSlipDialogOpen] = useState(false)
  const [selectedSlip, setSelectedSlip] = useState<Slip | null>(null)

  const reportParams = useMemo(
    () => ({
      status: filterStatus === "all" ? undefined : filterStatus,
      materialId: filterMaterialId === "all" ? undefined : filterMaterialId,
      productionOrderId: filterOrderId === "all" ? undefined : filterOrderId,
    }),
    [filterStatus, filterMaterialId, filterOrderId]
  )

  // Fetch reports based on active filters
  const { data: reportRes, isLoading: isLoadingReports } = useQuery({
    queryKey: ["shrinkage-reports", reportParams],
    queryFn: () => shrinkageApi.getReports(reportParams),
  })

  // Fetch ALL reports lookup to strictly filter completed/unreported orders
  const { data: allReportsRes } = useQuery({
    queryKey: ["all-shrinkage-reports-lookup"],
    queryFn: () => shrinkageApi.getReports({ limit: 1000 }),
    enabled: isProductionManager,
  })

  const { data: summaryRes } = useQuery({
    queryKey: ["shrinkage-summary"],
    queryFn: () => shrinkageApi.getSummary({}),
    enabled: isAdmin || isProductionManager,
  })

  const { data: productionOrdersRes, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["production-orders-for-shrinkage"],
    queryFn: () => productionApi.getOrders({ limit: 200 }),
  })

  const { data: selectedOrderDetailRes, isLoading: isLoadingOrderDetail } = useQuery({
    queryKey: ["production-order-detail", selectedProductionOrderId],
    queryFn: () => productionApi.getOrderById(selectedProductionOrderId),
    enabled: !!selectedProductionOrderId,
  })

  const reports = (reportRes as any)?.data || []
  const allReports = (allReportsRes as any)?.data || []
  const summary = (summaryRes as any)?.data || {}
  const allOrders = (productionOrdersRes as any)?.data?.orders || []

  const selectedOrder = (selectedOrderDetailRes as any)?.data || null
  const orderMaterials = (selectedOrder?.materials || []) as Array<any>

  // Fetch batches used in the selected production order
  const { data: orderBatchesRes, isLoading: isLoadingBatches } = useQuery({
    queryKey: ["production-order-batches", selectedProductionOrderId],
    queryFn: () => batchApi.getBatchesByProductionOrder(selectedProductionOrderId),
    enabled: !!selectedProductionOrderId,
  })

  const batchesByMaterial = useMemo(() => {
    const map: Record<string, any[]> = {}
    
    // Initialize empty array for each material in the order
    orderMaterials.forEach((m: any) => {
      const matId = String(m.material?._id || m.material || "")
      map[matId] = []
    })

    const rawBatches = (orderBatchesRes as any)?.data || []
    rawBatches.forEach((b: any) => {
      const matId = String(b.material)
      if (map[matId]) {
        map[matId].push(b)
      }
    })

    // Filter positive remaining quantity
    Object.keys(map).forEach(matId => {
      map[matId] = map[matId].filter((b: any) => Number(b?.quantityRemaining || 0) > 0)
    })

    return map
  }, [orderMaterials, orderBatchesRes])

  // Strictly filter completed orders that do NOT have any shrinkage reports yet
  const completedAndUnreportedOrders = useMemo(() => {
    return allOrders.filter((order: any) => {
      const isCompleted = order.status === "completed"
      const alreadyReported = allReports.some(
        (r: any) => String(r.productionOrder?._id || r.productionOrder) === String(order._id)
      )
      return isCompleted && !alreadyReported
    })
  }, [allOrders, allReports])

  const setBatchShrinkage = useCallback((matId: string, bId: string, val: string) => {
    setBatchInputs(prev => ({ ...prev, [matId]: { ...(prev[matId] || {}), [bId]: val } }))
  }, [])

  // All batch-level entries that have a positive shrinkage amount
  const entriesToSubmit = useMemo(() => {
    const entries: { materialId: string; batchId: string; shrinkageAmount: number }[] = []
    orderMaterials.forEach((m: any) => {
      const matId = String(m.material?._id || m.material || "")
      const matBatches = batchesByMaterial[matId] || []
      matBatches.forEach((b: any) => {
        const amt = Number(batchInputs[matId]?.[b._id] || 0)
        if (amt > 0) entries.push({ materialId: matId, batchId: b._id, shrinkageAmount: amt })
      })
    })
    return entries
  }, [orderMaterials, batchesByMaterial, batchInputs])

  const filteredReports = useMemo(() => {
    return reports.filter((r: any) => {
      const monthOk = !filterMonth || format(new Date(r.createdAt), "yyyy-MM") === filterMonth
      const orderCode = String(r.productionOrder?.orderCode || "").toLowerCase()
      const orderOk = !filterOrderCode || orderCode.includes(filterOrderCode.toLowerCase())
      return monthOk && orderOk
    })
  }, [reports, filterMonth, filterOrderCode])

  const reportsByOrder = useMemo(() => {
    const groups = new Map<string, { orderId: string; orderCode: string; orderStatus: string; items: any[] }>()
    for (const report of filteredReports) {
      const orderId = String(report?.productionOrder?._id || report?.productionOrder || "")
      const orderCode = report?.productionOrder?.orderCode || "Không rõ lệnh"
      const orderStatus = report?.productionOrder?.status || "-"
      const key = orderId || `unknown-${orderCode}`
      const existing = groups.get(key)
      if (existing) {
        existing.items.push(report)
      } else {
        groups.set(key, { orderId, orderCode, orderStatus, items: [report] })
      }
    }

    return Array.from(groups.values()).sort((a, b) => a.orderCode.localeCompare(b.orderCode))
  }, [filteredReports])

  const selectedReport = useMemo(() => {
    return filteredReports.find((r: any) => String(r._id) === selectedReportId) || null
  }, [filteredReports, selectedReportId])

  useEffect(() => {
    if (!filteredReports.length) {
      setSelectedReportId("")
      return
    }

    const stillExists = filteredReports.some((r: any) => String(r._id) === selectedReportId)
    if (!stillExists) {
      setSelectedReportId(String(filteredReports[0]._id))
    }
  }, [filteredReports, selectedReportId])

  const filterMaterialOptions = useMemo(() => {
    const materialMap = new Map<string, { id: string; code: string; name: string }>()
    for (const report of reports) {
      const id = String(report?.material?._id || report?.material || "")
      if (!id) continue
      materialMap.set(id, {
        id,
        code: report?.material?.code || "Mã VL",
        name: report?.material?.name || "Vật liệu",
      })
    }
    return Array.from(materialMap.values())
  }, [reports])

  const createMutation = useMutation({
    mutationFn: () =>
      Promise.all(
        entriesToSubmit.map(e =>
          shrinkageApi.createReport({
            materialId: e.materialId,
            batchId: e.batchId,
            productionOrderId: selectedProductionOrderId,
            shrinkageAmount: e.shrinkageAmount,
            shrinkageReason: shrinkageReason.trim(),
            notableMetrics: notableMetrics.trim(),
          })
        )
      ),
    onSuccess: () => {
      toast.success(`Đã tạo ${entriesToSubmit.length} báo cáo hao hụt thành công`)
      qc.invalidateQueries({ queryKey: ["shrinkage-reports"] })
      qc.invalidateQueries({ queryKey: ["all-shrinkage-reports-lookup"] })
      qc.invalidateQueries({ queryKey: ["shrinkage-summary"] })
      setBatchInputs({})
      setShrinkageReason("")
      setNotableMetrics("")
      setSelectedProductionOrderId("")
      setIsCreateOpen(false)
    },
    onError: (e: any) => toast.error((e as any)?.message || "Tạo báo cáo thất bại"),
  })

  const createReturnReqMutation = useMutation({
    mutationFn: ({ id, requestedQuantity }: { id: string; requestedQuantity?: number }) =>
      shrinkageApi.createReturnRequest(id, { requestedQuantity }),
    onSuccess: () => {
      toast.success("Đã tạo yêu cầu hoàn trả kho nguyên liệu")
      qc.invalidateQueries({ queryKey: ["shrinkage-reports"] })
      qc.invalidateQueries({ queryKey: ["requisitions"] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Tạo yêu cầu hoàn trả thất bại"),
  })

  const canSubmit = useMemo(() => {
    if (!selectedProductionOrderId || entriesToSubmit.length === 0) return false
    if (shrinkageReason.trim().length < 5) return false
    // Validate no entry exceeds batch remaining or order used quantity
    for (const e of entriesToSubmit) {
      const batch = (batchesByMaterial[e.materialId] || []).find((b: any) => b._id === e.batchId)
      if (!batch) return false
      const maxAllowed = Math.min(Number(batch.quantityRemaining), Number(batch.quantityUsed || 0))
      if (e.shrinkageAmount > maxAllowed) return false
    }
    return true
  }, [selectedProductionOrderId, entriesToSubmit, batchesByMaterial, shrinkageReason])

  const handleSelectOrder = (orderId: string) => {
    setSelectedProductionOrderId(orderId)
    setBatchInputs({})
  }

  const handleOpenSlip = async (slipId: string) => {
    try {
      const res = await slipApi.getSlipById(slipId)
      const slip = (res as any)?.data?.data || (res as any)?.data
      if (!slip?._id) {
        toast.error("Không tìm thấy phiếu nhập xuất")
        return
      }
      setSelectedSlip(slip)
      setSlipDialogOpen(true)
    } catch {
      toast.error("Mở chi tiết phiếu thất bại")
    }
  }

  return (
    <DashboardLayout title="Báo cáo hao hụt & vấn đề">
      <div className="space-y-6 max-w-7xl mx-auto p-1 sm:p-2">
        {/* Upper Header and Create Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 backdrop-blur-md shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
              Báo cáo hao hụt & vấn đề
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Quản lý hao hụt nguyên vật liệu phát sinh từ lệnh sản xuất và lập chứng từ hoàn kho.
            </p>
          </div>
          {isProductionManager && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 transform hover:-translate-y-0.5 cursor-pointer rounded-xl h-11 px-5"
            >
              <PlusCircle className="h-5 w-5" />
              Tạo báo cáo hao hụt
            </Button>
          )}
        </div>

        {/* Dynamic Premium Metrics Section */}
        {(isAdmin || isProductionManager) && (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="p-4 border-none bg-gradient-to-br from-indigo-50/60 via-indigo-50/30 to-purple-50/40 dark:from-indigo-950/20 dark:to-purple-950/10 shadow-xs hover:shadow-md transition-all duration-300 border-l-4 border-l-indigo-500/80 group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-indigo-950/60 dark:text-indigo-400/80 uppercase tracking-wider">Tổng báo cáo</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-850 dark:text-slate-100 mt-2">{summary?.totals?.reportCount || 0}</p>
                </div>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-none bg-gradient-to-br from-blue-50/60 via-blue-50/30 to-cyan-50/40 dark:from-blue-950/20 dark:to-cyan-950/10 shadow-xs hover:shadow-md transition-all duration-300 border-l-4 border-l-blue-500/80 group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-blue-950/60 dark:text-blue-400/80 uppercase tracking-wider">Vật liệu nhận</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-850 dark:text-slate-100 mt-2">{summary?.totals?.totalReceivedQuantity || 0}</p>
                </div>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
                  <Package className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-none bg-gradient-to-br from-emerald-50/60 via-emerald-50/30 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/10 shadow-xs hover:shadow-md transition-all duration-300 border-l-4 border-l-emerald-500/80 group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-emerald-950/60 dark:text-emerald-400/80 uppercase tracking-wider">Đã sử dụng</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-850 dark:text-slate-100 mt-2">{summary?.totals?.totalUsedQuantity || 0}</p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-none bg-gradient-to-br from-rose-50/60 via-rose-50/30 to-pink-50/40 dark:from-rose-950/20 dark:to-pink-950/10 shadow-xs hover:shadow-md transition-all duration-300 border-l-4 border-l-rose-500/80 group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-rose-950/60 dark:text-rose-400/80 uppercase tracking-wider">Tổng hao hụt</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">{summary?.totals?.totalShrinkageQuantity || 0}</p>
                </div>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform duration-300">
                  <AlertTriangle className="h-5 w-5 animate-pulse" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Beautiful Dialog containing the creation form */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent size="7xl" className="!w-[90vw] !max-w-[1100px] max-h-[92vh] overflow-y-auto rounded-2xl border-slate-100 dark:border-slate-800 p-0 shadow-2xl bg-white dark:bg-slate-950">
            <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5 text-xl font-bold text-slate-855 dark:text-slate-100">
                  <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <AlertTriangle className="h-5 w-5 text-orange-500 animate-bounce" />
                  </span>
                  Tạo Báo Cáo Hao Hụt & Vấn Đề
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                  Báo cáo hao hụt vật liệu thực tế sau khi lệnh sản xuất hoàn thành. Hệ thống sẽ tự động đối chiếu lô hàng và tính toán số lượng hoàn kho tự động.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-6 space-y-5">
              {/* Step 1 – Pick order */}
              <div className="space-y-2">
                <Label className="font-semibold text-slate-800 dark:text-slate-200">Lệnh sản xuất đã hoàn thành</Label>
                <Select value={selectedProductionOrderId} onValueChange={handleSelectOrder}>
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:ring-amber-500/50">
                    <SelectValue placeholder={isLoadingOrders ? "Đang tải..." : "Chọn lệnh sản xuất đã hoàn thành"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {completedAndUnreportedOrders.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">Không có lệnh nào phù hợp.</div>
                    ) : (
                      completedAndUnreportedOrders.map((order: any) => (
                        <SelectItem key={order._id} value={order._id} className="rounded-lg py-2.5">
                          {order.orderCode} — Hoàn thành ({format(new Date(order.updatedAt), "dd/MM/yyyy")})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2 – Material + Batch cards (auto-loaded) */}
              {selectedProductionOrderId && (
                <div className="space-y-4">
                  {isLoadingOrderDetail ? (
                    <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground text-sm">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                      Đang tải dữ liệu vật liệu trong đơn...
                    </div>
                  ) : orderMaterials.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-center text-slate-400">
                      <Layers className="h-8 w-8 opacity-25 mb-2" />
                      <p className="text-xs">Đơn sản xuất này không có vật liệu nào.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-amber-500" />
                        Nhập hao hụt theo từng vật tư & lô hàng
                      </p>
                      {orderMaterials.map((m: any, idx: number) => {
                        const matId = String(m.material?._id || m.material || "")
                        const matBatches = batchesByMaterial[matId] || []
                        const isLoadingMat = isLoadingBatches
                        const matName = m.material?.name || "Vật liệu"
                        const matCode = m.material?.code || ""
                        const matUnit = m.unit || m.material?.unit || ""
                        return (
                          <div key={matId} className="rounded-2xl border border-amber-100/80 dark:border-amber-900/30 bg-gradient-to-br from-amber-50/60 via-orange-50/20 to-yellow-50/10 dark:from-slate-900/40 dark:to-slate-950/10 overflow-hidden shadow-xs">
                            {/* Material header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100/60 dark:border-amber-900/20 bg-amber-50/50 dark:bg-amber-950/10">
                              <div className="flex items-center gap-2.5">
                                <span className="h-7 w-7 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center font-black text-xs">{idx + 1}</span>
                                <div>
                                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{matName}</p>
                                  <p className="text-[10px] font-mono text-slate-500">{matCode} · Kế hoạch: {m.plannedQuantity} {matUnit} · Đã cấp: {m.issuedQuantity} {matUnit}</p>
                                </div>
                              </div>
                              {isLoadingMat && (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                              )}
                            </div>

                            {/* Batch rows */}
                            <div className="divide-y divide-amber-50 dark:divide-slate-800/50">
                              {!isLoadingMat && matBatches.length === 0 && (
                                <div className="px-4 py-3 text-xs text-slate-400 italic">Không có lô hàng nào được sử dụng trong lệnh này.</div>
                              )}
                              {matBatches.map((b: any) => {
                                const inputVal = batchInputs[matId]?.[b._id] || ""
                                const loss = Number(inputVal || 0)
                                const remaining = Number(b.quantityRemaining || 0)
                                const usedQty = Number(b.quantityUsed || 0)
                                const maxAllowed = Math.min(remaining, usedQty)
                                const returnable = Math.max(remaining - loss, 0)
                                const isOver = loss > maxAllowed && loss > 0
                                return (
                                  <div key={b._id} className="px-4 py-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 items-start">
                                    <div className="space-y-0.5">
                                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <Layers className="h-3 w-3 text-indigo-400" />
                                        Lô: <span className="font-mono">{b.batchNumber}</span>
                                      </p>
                                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-slate-500">
                                        <span>Đã cấp/sử dụng: <strong className="text-blue-700 dark:text-blue-400">{usedQty} {matUnit}</strong></span>
                                        <span>Tồn kho lô: <strong className="text-amber-700 dark:text-amber-400">{remaining} {matUnit}</strong></span>
                                        {loss > 0 && !isOver && (
                                          <span>Hoàn trả dự kiến: <strong className="text-emerald-600 dark:text-emerald-400">{returnable} {matUnit}</strong></span>
                                        )}
                                        {isOver && (
                                          <span className="text-rose-600 font-semibold animate-pulse">⚠ Vượt quá lượng cho phép (tối đa {maxAllowed} {matUnit})!</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 min-w-[160px]">
                                      <div className="relative flex-1">
                                        <Input
                                          type="number"
                                          min={0}
                                          max={maxAllowed}
                                          step="any"
                                          value={inputVal}
                                          onChange={e => setBatchShrinkage(matId, b._id, e.target.value)}
                                          placeholder="0.0"
                                          className={`h-9 rounded-xl text-sm pr-12 font-semibold ${
                                            isOver
                                              ? "border-rose-400 focus-visible:ring-rose-400/50 bg-rose-50"
                                              : loss > 0
                                              ? "border-amber-400 focus-visible:ring-amber-400/50 bg-amber-50/50"
                                              : "border-slate-200 focus-visible:ring-amber-500/40"
                                          }`}
                                        />
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">{matUnit}</span>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Summary of entries */}
                  {entriesToSubmit.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Sẽ tạo <strong>{entriesToSubmit.length}</strong> báo cáo hao hụt cho {entriesToSubmit.length} lô hàng đã nhập.
                    </div>
                  )}
                </div>
              )}

              {/* Common reason + metrics */}
              <div className="space-y-2">
                <Label className="font-semibold text-slate-800 dark:text-slate-200">Lý do hao hụt chung (Bắt buộc ít nhất 5 ký tự)</Label>
                <Textarea
                  value={shrinkageReason}
                  onChange={(e) => setShrinkageReason(e.target.value)}
                  rows={3}
                  placeholder="Mô tả cụ thể lý do hao hụt (ví dụ: Tre bị mục ẩm mốc, sơn bị vón cục nứt nẻ...)"
                  className="rounded-xl border-slate-200 focus-visible:ring-amber-500/50 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-slate-800 dark:text-slate-200">Thông số kỹ thuật đáng chú ý (Không bắt buộc)</Label>
                <Textarea
                  value={notableMetrics}
                  onChange={(e) => setNotableMetrics(e.target.value)}
                  rows={2}
                  placeholder="Ví dụ: Nhiệt độ môi trường sản xuất 32 độ C, tỷ lệ hư hao thực tế 5.2%..."
                  className="rounded-xl border-slate-200 focus-visible:ring-amber-500/50 text-sm"
                />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 rounded-b-2xl">
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200 cursor-pointer h-10 px-4 text-xs font-semibold"
              >
                Hủy bỏ
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!canSubmit || createMutation.isPending}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer rounded-xl h-10 px-6 text-xs"
              >
                {createMutation.isPending ? "Đang xử lý..." : "Xác nhận tạo"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Filters and List Dashboard View */}
        <Card className="p-4 sm:p-5 border-none shadow-xs bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-900/50">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-150/40 dark:border-slate-800/80 pb-3">
            <History className="h-5 w-5 text-indigo-500" />
            <h3 className="font-bold text-lg text-slate-855 dark:text-slate-100">Lịch sử Báo cáo hao hụt & Vấn đề</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-5 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-900/50">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Chọn Tháng</Label>
              <Input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="h-10 rounded-xl border-slate-200 focus-visible:ring-indigo-500/50" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Trạng thái Báo cáo</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 focus:ring-indigo-500/50 bg-white dark:bg-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="pending">Chờ duyệt</SelectItem>
                  <SelectItem value="checking">Đang kiểm tra</SelectItem>
                  <SelectItem value="resolved">Đã giải quyết</SelectItem>
                  <SelectItem value="accepted">Đã duyệt</SelectItem>
                  <SelectItem value="rejected">Từ chối</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Nguyên vật liệu</Label>
              <Select value={filterMaterialId} onValueChange={setFilterMaterialId}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 focus:ring-indigo-500/50 bg-white dark:bg-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Tất cả vật liệu</SelectItem>
                  {filterMaterialOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.code} - {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Lệnh sản xuất</Label>
              <Select value={filterOrderId} onValueChange={setFilterOrderId}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 focus:ring-indigo-500/50 bg-white dark:bg-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Tất cả các đơn</SelectItem>
                  {allOrders.map((o: any) => (
                    <SelectItem key={o._id} value={o._id}>
                      {o.orderCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Tìm mã lệnh</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Nhập mã lệnh..."
                  value={filterOrderCode}
                  onChange={(e) => setFilterOrderCode(e.target.value)}
                  className="h-10 pl-9 rounded-xl border-slate-200 focus-visible:ring-indigo-500/50"
                />
              </div>
            </div>
          </div>

          {isLoadingReports ? (
            <div className="flex h-60 items-center justify-center flex-col gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">Đang tải lịch sử báo cáo...</p>
            </div>
          ) : reportsByOrder.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-100 rounded-2xl text-center text-slate-400">
              <Layers className="h-12 w-12 opacity-20 mb-3" />
              <p className="text-sm">Chưa có báo cáo hao hụt nào phù hợp với bộ lọc.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
              {/* Grouped report list (Left Side) */}
              <div className="p-1 space-y-3.5 max-h-[580px] overflow-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                {reportsByOrder.map((group) => (
                  <div
                    key={`${group.orderId}-${group.orderCode}`}
                    className="rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 bg-gradient-to-r from-slate-50/50 to-indigo-50/5 dark:from-slate-900/30 dark:to-slate-950/15 space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2">
                      <div className="space-y-0.5">
                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Mã Lệnh</span>
                        <p className="font-bold text-slate-855 dark:text-slate-100 flex items-center gap-1.5">
                          <Package className="h-4 w-4 text-indigo-500" />
                          {group.orderCode}
                        </p>
                      </div>
                      <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/40 font-semibold rounded-lg">
                        {group.items.length} báo cáo
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {group.items.map((r) => {
                        const active = String(r._id) === selectedReportId
                        return (
                          <button
                            type="button"
                            key={r._id}
                            className={`w-full rounded-xl border px-3 py-3 text-left transition-all duration-300 transform flex items-center justify-between group cursor-pointer ${active
                                ? "border-indigo-500/80 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs"
                                : "border-slate-100 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900"
                              }`}
                            onClick={() => setSelectedReportId(String(r._id))}
                          >
                            <div className="space-y-1">
                              <p className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                {r.reportCode}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{format(new Date(r.createdAt), "dd/MM/yyyy HH:mm")}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`border px-2 py-0.5 rounded-md font-semibold text-xs ${statusBadge[r.status] || "bg-muted text-muted-foreground"}`}>
                                {statusLabel[r.status] || r.status}
                              </Badge>
                              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected report details (Right Side) */}
              <div className="h-fit">
                {!selectedReport ? (
                  <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-100 rounded-2xl text-center text-slate-400 bg-slate-50/20">
                    <FileText className="h-14 w-14 opacity-25 mb-3" />
                    <p className="text-sm">Vui lòng chọn một báo cáo hao hụt từ danh sách để xem chi tiết.</p>
                  </div>
                ) : (
                  <Card className="p-5 border border-slate-150/40 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50/20 dark:from-slate-950 dark:to-slate-950 rounded-2xl shadow-sm space-y-5">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                            <FileText className="h-4 w-4" />
                          </span>
                          <p className="text-base sm:text-lg font-bold text-slate-855 dark:text-slate-100">{selectedReport.reportCode}</p>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 pl-1">
                          <Clock className="h-3.5 w-3.5" />
                          Thời gian tạo: {format(new Date(selectedReport.createdAt), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                      <Badge className={`border px-2.5 py-1 rounded-lg text-xs font-bold ${statusBadge[selectedReport.status] || "bg-muted text-muted-foreground"}`}>
                        {statusLabel[selectedReport.status] || selectedReport.status}
                      </Badge>
                    </div>

                    <div className="space-y-3.5">
                      <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Thông số khối lượng của lô</h4>

                      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                        <Table>
                          <TableHeader className="bg-slate-50/80 dark:bg-slate-900/50">
                            <TableRow>
                              <TableHead className="font-semibold text-xs text-slate-700 dark:text-slate-350">Vật tư / Mã Lô</TableHead>
                              <TableHead className="text-center font-semibold text-xs text-slate-700 dark:text-slate-350">Nhận</TableHead>
                              <TableHead className="text-center font-semibold text-xs text-slate-700 dark:text-slate-350">Đã dùng</TableHead>
                              <TableHead className="text-center font-semibold text-xs text-slate-700 dark:text-slate-350 bg-rose-50/50 dark:bg-rose-950/10 text-rose-700">Hao hụt</TableHead>
                              <TableHead className="text-right font-semibold text-xs text-slate-700 dark:text-slate-350">Còn tồn</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="text-xs font-medium">
                            <TableRow className="hover:bg-transparent">
                              <TableCell className="py-3">
                                <p className="font-bold text-slate-855 dark:text-slate-200">{selectedReport.material?.name}</p>
                                <span className="font-mono text-slate-500 text-[10px] block mt-0.5">{selectedReport.material?.code} • Lô: {selectedReport.batch?.batchNumber || "Không có"}</span>
                              </TableCell>
                              <TableCell className="text-center text-slate-650 dark:text-slate-300">{selectedReport.totalReceivedQuantity} {selectedReport.material?.unit}</TableCell>
                              <TableCell className="text-center text-slate-650 dark:text-slate-300">{selectedReport.totalUsedQuantity} {selectedReport.material?.unit}</TableCell>
                              <TableCell className="text-center bg-rose-50/40 dark:bg-rose-950/5 text-rose-600 font-extrabold text-sm border-x border-rose-100/40">{selectedReport.shrinkageAmount} {selectedReport.material?.unit}</TableCell>
                              <TableCell className="text-right font-bold text-slate-855 dark:text-slate-100">{selectedReport.remainingQuantity} {selectedReport.material?.unit}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                      <div className="space-y-1.5 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/80">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                          Lý do hao hụt
                        </p>
                        <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 italic leading-relaxed">
                          "{selectedReport.shrinkageReason || "Không có mô tả nguyên nhân"}"
                        </p>
                      </div>

                      <div className="space-y-1.5 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/80">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5 text-indigo-500" />
                          Thông số kỹ thuật ghi nhận
                        </p>
                        <p className="text-xs sm:text-sm font-medium text-slate-750 dark:text-slate-300">
                          {selectedReport.notableMetrics || "Không có ghi chú kỹ thuật"}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20 space-y-3">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4.5 w-4.5 text-indigo-500" />
                        <h5 className="font-bold text-xs sm:text-sm text-indigo-955 dark:text-indigo-400 uppercase tracking-wider">Xử lý hoàn trả vật tư thừa</h5>
                      </div>

                      {selectedReport.relatedReturnRequisition ? (
                        <div className="text-xs sm:text-sm space-y-2 border-t border-indigo-100/50 dark:border-indigo-950 pt-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <ChevronRight className="h-3.5 w-3.5 text-indigo-400" /> Mã yêu cầu trả:
                            </span>
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {selectedReport.relatedReturnRequisition.requisitionCode}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <ChevronRight className="h-3.5 w-3.5 text-indigo-400" /> Trạng thái yêu cầu:
                            </span>
                            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 border border-indigo-200/40 text-xs font-semibold rounded-md">
                              {selectedReport.relatedReturnRequisition.status}
                            </Badge>
                          </div>

                          {selectedReport.relatedReturnSlip?.slipNumber && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <ChevronRight className="h-3.5 w-3.5 text-indigo-400" /> Phiếu kho liên quan:
                              </span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {selectedReport.relatedReturnSlip.slipNumber}
                              </span>
                            </div>
                          )}

                          {selectedReport.relatedReturnSlip?._id && (
                            <div className="pt-1 flex justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenSlip(selectedReport.relatedReturnSlip._id)}
                                className="text-xs font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50/50 dark:border-indigo-900 dark:text-indigo-400 cursor-pointer h-8 rounded-lg"
                              >
                                Xem phiếu kho chi tiết
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : isProductionManager ? (
                        <div className="space-y-3 pt-1">
                          <p className="text-[11px] sm:text-xs text-muted-foreground italic">
                            Nguyên vật liệu dư thừa sau khi đã báo cáo hao hụt có thể được làm thủ tục hoàn trả kho vật tư.
                          </p>
                          <Button
                            size="sm"
                            onClick={() =>
                              createReturnReqMutation.mutate({
                                id: selectedReport._id,
                                requestedQuantity: selectedReport.returnableQuantity,
                              })
                            }
                            disabled={createReturnReqMutation.isPending || !selectedReport.returnableQuantity}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all duration-300 cursor-pointer h-9 px-4 rounded-xl w-full sm:w-auto"
                          >
                            {createReturnReqMutation.isPending ? "Đang tạo..." : "Lập yêu cầu hoàn trả kho"}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Không có yêu cầu hoàn trả kho nào được thiết lập.</span>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      <SlipDetailDialog
        open={slipDialogOpen}
        onOpenChange={setSlipDialogOpen}
        slip={selectedSlip}
        type="import"
        statusConfig={slipStatusConfig}
        readOnly
      />
    </DashboardLayout>
  )
}
