"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { AlertTriangle, Package, Search, Download, ChevronLeft, ChevronRight, QrCode, Boxes } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { materialApi } from "@/api/material.api"
import { productApi } from "@/api/product.api"
import { withPermission } from "@/components/guards/permission-guard"
import { AlertItem } from "./types"
import { toast } from "sonner"
import { QRScanner } from "@/features/receiving/components/qr-scanner"

const exportAlertsCSV = (data: AlertItem[], title: string) => {
  const headers = "Tên,Mã,Tồn kho,Đơn vị,Ngưỡng\n"
  const rows = data.map(m => `${m.name},${m.code},${m.currentStock},${m.unit},${m.threshold}`).join("\n")
  const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.setAttribute("download", `${title}-${new Date().toLocaleDateString()}.csv`)
  link.click()
}

const CustomPagination = ({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) => {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t p-4 bg-background rounded-b-xl">
      <p className="text-sm text-muted-foreground">
        Hiển thị {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} / {total}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => onChange(p)}>{p}</Button>
        ))}
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function WarehouseAlertsPage() {
  const [activeTab, setActiveTab] = useState("materials")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"All" | "Critical" | "Low Stock">("All")
  const [materials, setMaterials] = useState<AlertItem[]>([])
  const [products, setProducts] = useState<AlertItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  const fetchAlerts = useCallback(async (search?: string) => {
    setIsLoading(true)
    try {
      const [matRes, prodRes] = await Promise.all([
        materialApi.getLowStockMaterials({ search, limit: 100 }),
        productApi.getLowStockProducts({ search, limit: 100 })
      ])

      if (matRes.success || (matRes as any).status === 'success') {
        const data = matRes.data as any
        const items = data?.materials || data?.items || (Array.isArray(data) ? data : [])
        setMaterials(items.map((m: any) => ({ ...m, itemType: 'material', alertType: 'low_stock', alertId: m._id })))
      }

      if (prodRes.success || (prodRes as any).status === 'success') {
        const data = prodRes.data as any
        const items = data?.products || data?.items || (Array.isArray(data) ? data : [])
        setProducts(items.map((p: any) => ({ ...p, itemType: 'product', alertType: 'product_low_stock', alertId: p._id })))
      }
    } catch (error) {
      console.error("Fetch alerts error:", error)
      toast.error("Không thể tải dữ liệu cảnh báo")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchAlerts(searchQuery), 400)
    return () => clearTimeout(timer)
  }, [searchQuery, fetchAlerts])

  const filteredItems = useMemo(() => {
    const source = activeTab === 'materials' ? materials : products
    return source.filter(item => {
      if (statusFilter === "Critical") return item.currentStock === 0
      if (statusFilter === "Low Stock") return item.currentStock > 0 && item.currentStock <= item.threshold
      return true
    })
  }, [activeTab, materials, products, statusFilter])

  const paginatedItems = useMemo(() => {
    return filteredItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  }, [filteredItems, page])

  const getStatusBadge = (item: AlertItem) => {
    if (item.currentStock === 0) return <Badge className="bg-[#DC3545] text-white">Nguy cấp</Badge>
    return <Badge className="bg-[#FFA500] text-white">Sắp hết</Badge>
  }

  const handleScanSuccess = (data: any) => {
    const code = data?.code || data?.id || (typeof data === 'string' ? data : '')
    if (code) {
      setSearchQuery(code)
      toast.success(`Đã quét mã: ${code}`)
    }
  }

  return (
    <AppShell title="Cảnh báo tồn kho" subtitle="Theo dõi vật tư và thành phẩm sắp hết trong kho">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Cảnh báo tồn kho</h2>
            <p className="text-sm text-muted-foreground">Giám sát mức độ dự trữ hàng hóa</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => exportAlertsCSV(filteredItems, activeTab === 'materials' ? 'canh-bao-vat-tu' : 'canh-bao-thanh-pham')}>
            <Download className="h-4 w-4" /> Xuất Excel
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="materials" className="gap-2">
              <Package className="h-4 w-4" />
              Nguyên vật liệu
              {materials.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700">{materials.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Boxes className="h-4 w-4" />
              Thành phẩm
              {products.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-emerald-100 text-emerald-700">{products.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-4">
            <Card>
              <CardContent className="p-4 flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={`Tìm kiếm ${activeTab === 'materials' ? 'nguyên liệu' : 'sản phẩm'}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" onClick={() => setIsScannerOpen(true)}>
                  <QrCode className="mr-2 h-4 w-4" /> Quét QR
                </Button>
                <div className="flex gap-2">
                  {(['All', 'Critical', 'Low Stock'] as const).map((f) => (
                    <Button
                      key={f}
                      variant={statusFilter === f ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter(f)}
                    >
                      {f === 'All' ? 'Tất cả' : f === 'Critical' ? 'Nguy cấp' : 'Sắp hết'}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Thông tin mặt hàng</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Tồn hiện tại</TableHead>
                      <TableHead className="text-right">Ngưỡng tối thiểu</TableHead>
                      <TableHead className="text-right pr-6">Đơn vị</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array(5).fill(0).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={5}><div className="h-8 bg-muted animate-pulse rounded" /></TableCell>
                        </TableRow>
                      ))
                    ) : paginatedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                          Không có cảnh báo nào
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedItems.map((item) => (
                        <TableRow key={item._id}>
                          <TableCell className="pl-6">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.code}</div>
                          </TableCell>
                          <TableCell>{getStatusBadge(item)}</TableCell>
                          <TableCell className={cn(
                            "text-right font-bold",
                            item.currentStock === 0 ? "text-red-600" : "text-amber-600"
                          )}>
                            {item.currentStock.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">{item.threshold.toLocaleString()}</TableCell>
                          <TableCell className="text-right pr-6 text-muted-foreground">{item.unit}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <CustomPagination
                  page={page}
                  total={filteredItems.length}
                  pageSize={ITEMS_PER_PAGE}
                  onChange={setPage}
                />
              </CardContent>
            </Card>
          </div>
        </Tabs>
      </div>
      <QRScanner open={isScannerOpen} onOpenChange={setIsScannerOpen} onScanSuccess={handleScanSuccess} />
    </AppShell>
  )
}

export default withPermission(WarehouseAlertsPage, ['kho_manager'])
