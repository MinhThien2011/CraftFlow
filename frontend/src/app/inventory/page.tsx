"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Package,
  AlertTriangle,
  TrendingDown,
  Plus,
  Search,
  RefreshCw,
  History,
  ShoppingCart,
  Boxes,
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { materialCategories, productCategories } from "@/lib/mock-data"
import type { Material, PaginationData, Product, InventoryOverview, InventoryTransaction } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CurrencyDisplay } from "@/components/ui/currency-display"
import { inventoryApi } from "@/api/inventory.api"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { PermissionGuard } from "@/components/guards/permission-guard"

type TabType = "materials" | "products" | "history-import" | "history-export"

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <TableRow>
      {Array(cols).fill(0).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-muted animate-pulse rounded" />
        </TableCell>
      ))}
    </TableRow>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="h-12 w-12 rounded-lg bg-muted animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 w-20 bg-muted animate-pulse rounded" />
          <div className="h-6 w-12 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>("materials")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [currentPage, setCurrentPage] = useState(1)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // API States
  const [materials, setMaterials] = useState<Material[]>([])
  const [productsStock, setProductsStock] = useState<Product[]>([])
  const [materialHistory, setMaterialHistory] = useState<InventoryTransaction[]>([])
  const [productHistory, setProductHistory] = useState<InventoryTransaction[]>([])
  const [overview, setOverview] = useState<InventoryOverview | null>(null)
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchOverview = useCallback(async () => {
    try {
      const response = await inventoryApi.getOverview()
      if (response.success) {
        setOverview(response.data)
      }
    } catch (error) {
      console.log("Failed to fetch inventory overview", error)
    }
  }, [])

  const fetchMaterials = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const response = await inventoryApi.getMaterialsStock({
        search: searchQuery,
        category: selectedCategory,
        page: currentPage,
        limit: 10
      })
      if (response.success && response.data) {
        setMaterials(response.data.items || [])
        setPagination(response.data.pagination)
      }
    } catch (error: any) {
      toast.error(error.message || "Không thể tải danh sách nguyên liệu")
      setMaterials([])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [searchQuery, selectedCategory, currentPage])

  const fetchProducts = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const response = await inventoryApi.getProductsStock({
        search: searchQuery,
        category: selectedCategory,
        page: currentPage,
        limit: 10
      })
      if (response.success && response.data) {
        setProductsStock(response.data.items || [])
        setPagination(response.data.pagination)
      }
    } catch (error: any) {
      toast.error(error.message || "Không thể tải danh sách sản phẩm")
      setProductsStock([])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [searchQuery, selectedCategory, currentPage])

  const fetchMaterialHistory = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const response = await inventoryApi.getMaterialHistory({
        page: currentPage,
        limit: 10,
        direction: 'in' // Import history
      })
      if (response.success && response.data) {
        setMaterialHistory(response.data.history || [])
        setPagination(response.data.pagination)
      }
    } catch (error: any) {
      toast.error(error.message || "Không thể tải lịch sử nhập nguyên liệu")
      setMaterialHistory([])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [currentPage])

  const fetchProductHistory = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const response = await inventoryApi.getProductHistory({
        page: currentPage,
        limit: 10,
        direction: 'out' // Export history
      })
      if (response.success && response.data) {
        setProductHistory(response.data.history || [])
        setPagination(response.data.pagination)
      }
    } catch (error: any) {
      toast.error(error.message || "Không thể tải lịch sử xuất sản phẩm")
      setProductHistory([])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [currentPage])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "materials") {
        fetchMaterials((materials?.length || 0) === 0)
      } else if (activeTab === "products") {
        fetchProducts((productsStock?.length || 0) === 0)
      } else if (activeTab === "history-import") {
        fetchMaterialHistory((materialHistory?.length || 0) === 0)
      } else if (activeTab === "history-export") {
        fetchProductHistory((productHistory?.length || 0) === 0)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [activeTab, fetchMaterials, fetchProducts, fetchMaterialHistory, fetchProductHistory, materials?.length, productsStock?.length, materialHistory?.length, productHistory?.length])

  // Reset page when switching tabs or filtering
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, selectedCategory])

  const handleRefresh = () => {
    fetchOverview()
    if (activeTab === "materials") fetchMaterials()
    else if (activeTab === "products") fetchProducts()
    else if (activeTab === "history-import") fetchMaterialHistory()
    else if (activeTab === "history-export") fetchProductHistory()
  }

  const getStatusBadge = (item: Material | Product) => {
    if (item.stockLevelInfo) {
      return (
        <Badge
          className="text-white border-none shadow-sm"
          style={{ backgroundColor: item.stockLevelInfo.color }}
        >
          {item.stockLevelInfo.label}
        </Badge>
      )
    }

    const stock = item.currentStock || 0
    const threshold = item.threshold || 0

    if (stock === 0) {
      return (
        <Badge className="bg-[#DC3545] text-white hover:bg-[#DC3545]/90 border-none shadow-sm">
          🔴 Nguy cấp
        </Badge>
      )
    }
    if (stock <= threshold) {
      return (
        <Badge className="bg-[#FFA500] text-white hover:bg-[#FFA500]/90 border-none shadow-sm">
          🟠 Sắp hết
        </Badge>
      )
    }
    return (
      <Badge className="bg-[#4A7C23] text-white hover:bg-[#4A7C23]/90 border-none shadow-sm">
        🟢 Ổn định
      </Badge>
    )
  }

  return (
    <AppShell title="Kho hàng" subtitle="Quản lý tồn kho nguyên liệu và sản phẩm">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-[#8B7355] to-[#4A7C23] bg-clip-text text-transparent">
              Quản lý kho hàng
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Theo dõi biến động tồn kho thực tế của xưởng
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
            <PermissionGuard allowedRoles={['admin', 'kho_manager']}>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Tạo phiếu nhập
              </Button>
            </PermissionGuard>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {!overview ? (
            Array(4).fill(0).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <Card className="border-none shadow-sm bg-white">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5F0EB]">
                    <Package className="h-6 w-6 text-[#8B7355]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tổng nguyên liệu</p>
                    <p className="text-2xl font-bold text-[#8B7355]">{overview.materials.totalItems}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-white">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF3E0]">
                    <TrendingDown className="h-6 w-6 text-[#FFA500]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sắp hết hàng</p>
                    <p className="text-2xl font-bold text-[#FFA500]">{(overview.materials.lowStockCount || 0) + (overview.products.lowStockCount || 0)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-white">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFEBEE]">
                    <AlertTriangle className="h-6 w-6 text-[#DC3545]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mức nguy cấp</p>
                    <p className="text-2xl font-bold text-[#DC3545]">{overview.materials.criticalCount || 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-white">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F5E9]">
                    <Boxes className="h-6 w-6 text-[#4A7C23]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Giá trị tồn kho</p>
                    <p className="text-xl font-bold text-[#4A7C23]">
                      <CurrencyDisplay value={(overview.materials.totalValue || 0) + (overview.products.totalValue || 0)} />
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Tabs and Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex rounded-xl bg-muted/50 p-1 border border-muted">
            <button
              onClick={() => setActiveTab("materials")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                activeTab === "materials"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Nguyên liệu
              </div>
            </button>

            <button
              onClick={() => setActiveTab("products")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                activeTab === "products"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4" />
                Sản phẩm
              </div>
            </button>

            <button
              onClick={() => setActiveTab("history-import")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                activeTab === "history-import"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Lịch sử nhập
              </div>
            </button>

            <button
              onClick={() => setActiveTab("history-export")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                activeTab === "history-export"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Lịch sử xuất
              </div>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo tên hoặc mã..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl border-muted bg-white h-11"
              />
            </div>
            {(activeTab === "materials" || activeTab === "products") && (
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48 rounded-xl border-muted bg-white h-11">
                  <SelectValue placeholder="Tất cả danh mục" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="All">Tất cả danh mục</SelectItem>
                  {(activeTab === "materials" ? materialCategories : productCategories).map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Content Table */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-none">
                  {activeTab === "materials" ? (
                    <>
                      <TableHead className="font-bold py-4">Nguyên liệu</TableHead>
                      <TableHead className="font-bold">Nhà cung cấp</TableHead>
                      <TableHead className="text-right font-bold">Tồn kho</TableHead>
                      <TableHead className="text-right font-bold">Tối thiểu</TableHead>
                      <TableHead className="text-right font-bold">Giá trị tồn</TableHead>
                      <TableHead className="font-bold">Cập nhật</TableHead>
                      <TableHead className="text-center font-bold">Trạng thái</TableHead>
                    </>
                  ) : activeTab === "products" ? (
                    <>
                      <TableHead className="font-bold py-4">Sản phẩm</TableHead>
                      <TableHead className="font-bold">Danh mục</TableHead>
                      <TableHead className="text-right font-bold">Tồn kho</TableHead>
                      <TableHead className="text-right font-bold">Tối thiểu</TableHead>
                      <TableHead className="text-right font-bold">Giá trị tồn</TableHead>
                      <TableHead className="font-bold">Cập nhật</TableHead>
                      <TableHead className="text-center font-bold">Trạng thái</TableHead>
                    </>
                  ) : activeTab === "history-import" ? (
                    <>
                      <TableHead className="font-bold py-4">Nguyên liệu</TableHead>
                      <TableHead className="font-bold">Nhà cung cấp</TableHead>
                      <TableHead className="text-right font-bold">Số lượng</TableHead>
                      <TableHead className="text-right font-bold">Đơn giá</TableHead>
                      <TableHead className="text-right font-bold">Tổng cộng</TableHead>
                      <TableHead className="font-bold">Ngày nhập</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="font-bold py-4">Sản phẩm</TableHead>
                      <TableHead className="font-bold">Điểm đến</TableHead>
                      <TableHead className="text-right font-bold">Số lượng</TableHead>
                      <TableHead className="text-right font-bold">Đơn giá</TableHead>
                      <TableHead className="text-right font-bold">Tổng cộng</TableHead>
                      <TableHead className="font-bold">Ngày xuất</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => <SkeletonRow key={i} cols={7} />)
                ) : activeTab === "materials" ? (
                  materials.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">Không tìm thấy nguyên liệu nào</TableCell></TableRow>
                  ) : (
                    materials.map((m) => (
                      <TableRow key={m._id} className="group hover:bg-muted/20 transition-colors">
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground group-hover:text-primary transition-colors">{m.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">Mã: {m.code} | {m.location || "Chưa gán vị trí"}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="font-medium text-muted-foreground">{m.supplier?.name || "N/A"}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-bold">{m.currentStock}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{m.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{m.threshold} {m.unit}</TableCell>
                        <TableCell className="text-right font-bold text-[#4A7C23]"><CurrencyDisplay value={(m.currentStock || 0) * (m.price || 0)} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.updatedAt ? new Date(m.updatedAt).toLocaleDateString("vi-VN") : "N/A"}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(m)}</TableCell>
                      </TableRow>
                    ))
                  )
                ) : activeTab === "products" ? (
                  productsStock.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">Không tìm thấy sản phẩm nào</TableCell></TableRow>
                  ) : (
                    productsStock.map((p) => (
                      <TableRow key={p._id} className="group hover:bg-muted/20 transition-colors">
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground group-hover:text-primary transition-colors">{p.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">Mã: {p.code} | {p.location || "Chưa gán vị trí"}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="font-medium text-muted-foreground">{p.category}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-bold">{p.currentStock}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{p.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{p.threshold} {p.unit}</TableCell>
                        <TableCell className="text-right font-bold text-[#4A7C23]"><CurrencyDisplay value={(p.currentStock || 0) * (p.baseCost || 0)} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("vi-VN") : "N/A"}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(p)}</TableCell>
                      </TableRow>
                    ))
                  )
                ) : activeTab === "history-import" ? (
                  materialHistory.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">Không có lịch sử nhập nguyên liệu</TableCell></TableRow>
                  ) : (
                    materialHistory.map((record) => (
                      <TableRow key={record._id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-bold py-4">
                          <div className="flex flex-col">
                            <span>{record.material?.name || "N/A"}</span>
                            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">Loại: {record.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="max-w-[150px] truncate">
                            {record.sender || record.material?.supplier?.name || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn("text-right font-bold", record.quantity > 0 ? "text-[#4A7C23]" : "text-[#DC3545]")}>
                          {record.quantity > 0 ? "+" : ""}{record.quantity} {record.material?.unit}
                        </TableCell>
                        <TableCell className="text-right"><CurrencyDisplay value={record.material?.price || 0} /></TableCell>
                        <TableCell className="text-right font-bold text-[#4A7C23]">
                          <CurrencyDisplay value={Math.abs(record.quantity * (record.material?.price || 0))} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(record.createdAt).toLocaleDateString("vi-VN", {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  )
                ) : (
                  productHistory.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">Không có lịch sử xuất sản phẩm</TableCell></TableRow>
                  ) : (
                    productHistory.map((record) => (
                      <TableRow key={record._id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-bold py-4">
                          <div className="flex flex-col">
                            <span>{record.product?.name || "N/A"}</span>
                            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">Loại: {record.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="max-w-[150px] truncate">
                            {record.receiver || record.customer || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn("text-right font-bold", record.quantity > 0 ? "text-[#4A7C23]" : "text-[#DC3545]")}>
                          {record.quantity > 0 ? "+" : ""}{record.quantity} {record.product?.unit}
                        </TableCell>
                        <TableCell className="text-right"><CurrencyDisplay value={record.product?.baseCost || 0} /></TableCell>
                        <TableCell className="text-right font-bold text-[#4A7C23]">
                          <CurrencyDisplay value={Math.abs(record.quantity * (record.product?.baseCost || 0))} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(record.createdAt).toLocaleDateString("vi-VN", {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  )
                )}
              </TableBody>
            </Table>

            {/* Pagination for Materials and Products */}
            {(activeTab === "materials" || activeTab === "products") && pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
                <p className="text-sm text-muted-foreground">
                  Trang <span className="font-medium">{pagination.page}</span> / {pagination.pages} • Tổng <span className="font-medium">{pagination.total}</span> mục
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1 || isRefreshing}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="rounded-lg"
                  >
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === pagination.pages || isRefreshing}
                    onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                    className="rounded-lg"
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
