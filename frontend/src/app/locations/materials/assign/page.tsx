'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/app-shell'
import {
  Search,
  Filter,
  MapPin,
  Package,
  Clock,
  ChevronRight,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  QrCode
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { batchApi, Batch } from '@/api/batch.api'
import { shelfApi, Shelf } from '@/api/shelf.api'
import { useShelves } from '@/features/inventory/hooks/use-shelves'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { QRScanner } from '@/features/receiving/components/qr-scanner'

export default function AssignBatchLocationPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [unassignedOnly, setUnassignedOnly] = useState(true)
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  // Assignment State
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [selectedShelf, setSelectedShelf] = useState<string>('')
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get all available shelves for selection
  const { data: shelvesRes } = useShelves({ status: 'Available' })
  const allShelves = shelvesRes?.data || []

  const fetchBatches = async () => {
    setLoading(true)
    try {
      const res = await batchApi.getActiveBatches({
        search: searchQuery,
        unassignedOnly: unassignedOnly
      })
      if (res.success) {
        setBatches(res.data || [])
      }
    } catch (error) {
      toast.error("Lỗi khi tải danh sách lô hàng")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBatches()
  }, [unassignedOnly])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchBatches()
  }

  const handleScanSuccess = (decodedText: string) => {
    setSearchQuery(decodedText)
    setIsScannerOpen(false)
    // Trigger fetch after scan
    batchApi.getActiveBatches({ search: decodedText }).then(res => {
      if (res.success && res.data) {
        setBatches(res.data)
      }
    })
  }

  const openAssignDialog = (batch: Batch) => {
    setSelectedBatch(batch)
    setSelectedShelf(batch.shelf?._id || '')
    setIsAssignDialogOpen(true)
  }

  const handleAssignLocation = async () => {
    if (!selectedBatch || !selectedShelf) return

    setIsSubmitting(true)
    try {
      const res = await batchApi.assignLocation(selectedBatch._id, selectedShelf)
      if (res.success) {
        toast.success(`Đã gán lô ${selectedBatch.batchNumber} vào kệ thành công`)
        setIsAssignDialogOpen(false)
        fetchBatches() // Refresh list
      } else {
        toast.error(res.message || "Lỗi khi gán vị trí")
      }
    } catch (error: any) {
      toast.error(error.message || "Lỗi hệ thống")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppShell title="Gắn vị trí lô hàng" subtitle="Điều chuyển hoặc gán vị trí lưu trữ cho các lô hàng trong kho">
      <div className="space-y-6">
        {/* Search & Filters */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <form onSubmit={handleSearch} className="flex flex-1 gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm mã lô, mã vật tư..."
                    className="pl-10 h-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button type="button" variant="outline" onClick={() => setIsScannerOpen(true)}>
                  <QrCode className="size-4 mr-2" />
                  Quét mã
                </Button>
                <Button type="submit">Tìm kiếm</Button>
              </form>
              <div className="flex items-center gap-2 border-l pl-4">
                <Button
                  variant={unassignedOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUnassignedOnly(true)}
                  className="rounded-full"
                >
                  Chưa gán vị trí
                </Button>
                <Button
                  variant={!unassignedOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUnassignedOnly(false)}
                  className="rounded-full"
                >
                  Tất cả lô hàng
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Batch List */}
        <div className="grid gap-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : batches.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20">
              <Package className="size-10 text-muted-foreground opacity-20 mb-2" />
              <p className="text-muted-foreground">Không tìm thấy lô hàng nào phù hợp</p>
            </div>
          ) : (
            batches.map((batch) => (
              <Card key={batch._id} className="overflow-hidden hover:shadow-md transition-all border-l-4 border-l-primary/30">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                    <div className="flex items-start gap-4">
                      <div className="size-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                        <Package className="size-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{batch.batchNumber}</h3>
                          <Badge variant="outline" className="text-[10px] bg-muted/50">
                            {batch.material ? 'Nguyên liệu' : 'Thành phẩm'}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">
                          {batch.material?.name || batch.product?.name}
                          <span className="text-muted-foreground font-mono ml-2">({batch.material?.code || batch.product?.code})</span>
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            Nhập: {format(new Date(batch.receivedDate), 'dd/MM/yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="size-3" />
                            Tồn kho: <b>{batch.quantityRemaining.toLocaleString()}</b> {batch.unit}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-1 items-center justify-center px-4">
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Vị trí hiện tại</p>
                        {batch.shelf ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                            <MapPin className="size-4" />
                            <span className="font-bold">{batch.shelf.shelfCode}</span>
                            <span className="text-xs font-normal opacity-70">(Khu {batch.shelf.warehouseSection})</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                            <AlertCircle className="size-4" />
                            <span className="font-bold italic">Chưa xác định</span>
                          </div>
                        )}
                      </div>
                      <div className="mx-8 hidden md:block text-muted-foreground/30">
                        <ArrowRight className="size-6" />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Thao tác</p>
                        <Button
                          onClick={() => openAssignDialog(batch)}
                          className={cn(
                            "gap-2",
                            batch.shelf ? "bg-muted text-foreground hover:bg-muted/80" : "bg-primary text-primary-foreground"
                          )}
                        >
                          <MapPin className="size-4" />
                          {batch.shelf ? "Điều chuyển" : "Gán vị trí"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="size-5 text-primary" />
              {selectedBatch?.shelf ? "Điều chuyển vị trí lô hàng" : "Gán vị trí lưu trữ"}
            </DialogTitle>
            <DialogDescription>
              Chọn kệ lưu trữ mới cho lô hàng: <span className="font-bold text-foreground">{selectedBatch?.batchNumber}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mặt hàng:</span>
                <span className="font-bold">{selectedBatch?.material?.name || selectedBatch?.product?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Số lượng tồn:</span>
                <span className="font-bold">{selectedBatch?.quantityRemaining.toLocaleString()} {selectedBatch?.unit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vị trí hiện tại:</span>
                <span className="font-bold text-blue-600">{selectedBatch?.shelf?.shelfCode || "Chưa có"}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">Chọn kệ đích</label>
              <Select value={selectedShelf} onValueChange={setSelectedShelf}>
                <SelectTrigger className="w-full h-12">
                  <SelectValue placeholder="Chọn kệ còn trống..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {allShelves.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      <div className="flex flex-col">
                        <span className="font-bold">{s.shelfCode} (Khu {s.warehouseSection})</span>
                        <div className="flex gap-2 text-[9px] uppercase text-muted-foreground font-medium">
                          {s.zone && <span>Vùng: {s.zone}</span>}
                          {s.aisle && <span>Dãy: {s.aisle}</span>}
                          {s.level && <span>Tầng: {s.level}</span>}
                          {s.bin && <span>Ô: {s.bin}</span>}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {s.category === 'Material' ? 'Kho Nguyên liệu' : 'Kho Thành phẩm'}
                          - Trống: {(s.maxCapacity - s.currentLoad).toLocaleString()}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
              <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <b>Lưu ý:</b> Thao tác này sẽ cập nhật vị trí lưu trữ thực tế và ghi nhận vào nhật ký di chuyển hàng hóa (Audit Trail).
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button
              onClick={handleAssignLocation}
              disabled={isSubmitting || !selectedShelf || selectedShelf === selectedBatch?.shelf?._id}
              className="px-8"
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
              Xác nhận gán
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QRScanner
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScanSuccess={handleScanSuccess}
      />
    </AppShell>
  )
}
