"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Boxes,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Package,
  Filter,
  RefreshCw,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { productCategories } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { CurrencyDisplay } from "@/components/ui/currency-display"
import { productApi } from "@/api/product.api"
import type { Product, PaginationData } from "@/lib/types"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"

type TabType = "products" | "bom"

function ProductSkeleton() {
  return (
    <TableRow>
      <TableCell><div className="h-12 w-48 animate-pulse rounded bg-muted" /></TableCell>
      <TableCell><div className="h-6 w-24 animate-pulse rounded bg-muted" /></TableCell>
      <TableCell><div className="ml-auto h-6 w-20 animate-pulse rounded bg-muted" /></TableCell>
      <TableCell><div className="ml-auto h-6 w-20 animate-pulse rounded bg-muted" /></TableCell>
      <TableCell><div className="h-6 w-24 animate-pulse rounded bg-muted" /></TableCell>
      <TableCell><div className="h-8 w-8 animate-pulse rounded bg-muted" /></TableCell>
    </TableRow>
  )
}

function BOMSkeleton() {
  return (
    <Card className="animate-pulse border-none shadow-sm">
      <div className="p-4 flex items-center gap-4">
        <div className="h-16 w-16 rounded-xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 bg-muted rounded" />
          <div className="h-3 w-1/4 bg-muted rounded" />
        </div>
        <div className="h-10 w-32 bg-muted rounded-xl" />
      </div>
    </Card>
  )
}

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("products")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [currentPage, setCurrentPage] = useState(1)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [expandedBOM, setExpandedBOM] = useState<string | null>(null)

  // API States
  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchProducts = useCallback(async (params: any, showSkeleton = false) => {
    if (showSkeleton) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const response = await productApi.getProducts(params)
      if (response.status === "success" || response.success) {
        setProducts(response.data.items || [])
        // Adapt pagination format if needed
        const apiPagination = response.data.pagination as any
        setPagination({
          total: apiPagination.total,
          pages: apiPagination.totalPages,
          page: apiPagination.currentPage,
          limit: apiPagination.limit
        })
      }
    } catch (error: any) {
      toast.error(error.message || "Không thể tải danh sách sản phẩm")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Fetch on mount and when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts({
        page: currentPage,
        search: searchQuery,
        category: selectedCategory,
        limit: 10
      }, products.length === 0)
    }, 300)

    return () => clearTimeout(timer)
  }, [currentPage, searchQuery, selectedCategory, fetchProducts])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory])

  const handleRefresh = () => {
    fetchProducts({
      page: currentPage,
      search: searchQuery,
      category: selectedCategory,
      limit: 10
    })
  }

  const handleResetFilters = () => {
    setSearchQuery("")
    setSelectedCategory("All")
    setCurrentPage(1)
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return

    try {
      const response = await productApi.deleteProduct(id)
      if (response.success) {
        toast.success("Đã xóa sản phẩm thành công")
        handleRefresh()
      }
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi xóa sản phẩm")
    }
  }

  const stats = useMemo(() => {
    const categories = Array.from(new Set(products.map(p => p.category)))
    return {
      total: pagination?.total || 0,
      withBOM: products.filter(p => p.estimateMaterialCost && p.estimateMaterialCost.length > 0).length,
      categories: categories.length || productCategories.length
    }
  }, [pagination, products])

  const categories = useMemo(() => {
    const apiCategories = Array.from(new Set(products.map(p => p.category))).filter(Boolean)
    const allCategories = Array.from(new Set([...productCategories, ...apiCategories]))
    return allCategories.sort()
  }, [products])

  return (
    <AppShell title="Sản phẩm & Định mức" subtitle="Quản lý danh mục sản phẩm và quy trình định mức">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Quản lý sản phẩm & định mức
            </h2>
            <p className="text-muted-foreground">
              Hệ thống quản lý sản phẩm thủ công và định mức nguyên vật liệu (BOM) chi tiết.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4" />
                  {activeTab === "products" ? "Thêm sản phẩm" : "Tạo BOM"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-xl">
                    {activeTab === "products" ? "Thêm sản phẩm mới" : "Tạo BOM mới"}
                  </DialogTitle>
                  <DialogDescription>
                    {activeTab === "products"
                      ? "Điền thông tin sản phẩm để bắt đầu quản lý trong hệ thống."
                      : "Thiết lập định mức nguyên vật liệu tiêu chuẩn cho một đơn vị sản phẩm."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  {/* Form fields here - truncated for brevity as we are focusing on API call implementation */}
                  <div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground border border-dashed">
                    Chức năng thêm/sửa đang được cập nhật trong Sprint tiếp theo.
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>Hủy</Button>
                  <Button disabled>{activeTab === "products" ? "Thêm sản phẩm" : "Tạo BOM"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-none shadow-sm bg-gradient-to-br from-[#F5F0EB] to-white">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                <Boxes className="h-6 w-6 text-[#8B7355]" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#8B7355]/70">Tổng sản phẩm</p>
                <p className="text-3xl font-bold text-[#8B7355]">{isLoading ? "..." : stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-gradient-to-br from-[#E8F5E9] to-white">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                <Package className="h-6 w-6 text-[#4A7C23]" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#4A7C23]/70">Đã có BOM</p>
                <p className="text-3xl font-bold text-[#4A7C23]">{isLoading ? "..." : stats.withBOM}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-gradient-to-br from-[#FFF3E0] to-white">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                <Boxes className="h-6 w-6 text-[#D4A574]" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#D4A574]/70">Danh mục</p>
                <p className="text-3xl font-bold text-[#D4A574]">{stats.categories}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Tabs Section */}
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex w-fit rounded-xl bg-muted/50 p-1.5 border border-muted">
              <button
                onClick={() => setActiveTab("products")}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-semibold transition-all duration-200",
                  activeTab === "products"
                    ? "bg-white text-primary shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                )}
              >
                <Boxes className="h-4 w-4" />
                Sản phẩm
              </button>
              <button
                onClick={() => setActiveTab("bom")}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-semibold transition-all duration-200",
                  activeTab === "bom"
                    ? "bg-white text-primary shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                )}
              >
                <Package className="h-4 w-4" />
                Định mức (BOM)
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên hoặc mã sản phẩm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-11 rounded-xl bg-white border-muted focus:ring-primary/20"
                />
              </div>
              {activeTab === "products" && (
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-44 h-11 rounded-xl bg-white border-muted">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Danh mục" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="All">Tất cả danh mục</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        {activeTab === "products" ? (
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="font-bold text-foreground py-4">Sản phẩm</TableHead>
                    <TableHead className="font-bold text-foreground">Danh mục</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Giá gốc (BOM)</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Tồn kho</TableHead>
                    <TableHead className="font-bold text-foreground">Trạng thái</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array(5).fill(0).map((_, i) => <ProductSkeleton key={i} />)
                  ) : products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-60 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                          <Boxes className="h-12 w-12 opacity-20" />
                          <p className="text-lg font-medium">Không tìm thấy sản phẩm nào</p>
                          <Button variant="link" onClick={handleResetFilters}>Xóa bộ lọc</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => (
                      <TableRow key={product._id} className="group hover:bg-muted/20 transition-colors">
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden shrink-0 border border-muted">
                              {product.productImage ? (
                                <img src={product.productImage} alt={product.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Package className="h-6 w-6 text-muted-foreground/30" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{product.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{product.code}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-muted/50 text-muted-foreground font-medium">
                            {product.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <CurrencyDisplay value={product.baseCost} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-bold">{product.currentStock}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{product.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-medium",
                              (product.stockLevel === "Nguy cấp" || product.stockLevel === "critical") ? "border-red-200 bg-red-50 text-red-700" :
                                (product.stockLevel === "Sắp hết" || product.stockLevel === "low") ? "border-amber-200 bg-amber-50 text-amber-700" :
                                  "border-green-200 bg-green-50 text-green-700"
                            )}
                          >
                            {product.stockLevel === "critical" ? "Nguy cấp" :
                              product.stockLevel === "low" ? "Sắp hết" :
                                product.stockLevel === "normal" ? "Ổn định" :
                                  (product.stockLevel || "Ổn định")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem className="gap-2"><Edit className="h-4 w-4" /> Chỉnh sửa</DropdownMenuItem>
                              <DropdownMenuItem className="gap-2"><ExternalLink className="h-4 w-4" /> Xem chi tiết</DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 text-destructive focus:text-destructive"
                                onClick={() => handleDeleteProduct(product._id)}
                              >
                                <Trash2 className="h-4 w-4" /> Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
                  <p className="text-sm text-muted-foreground">
                    Hiển thị <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> - <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> trong <span className="font-medium">{pagination.total}</span> sản phẩm
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || isRefreshing}
                      className="rounded-lg h-9"
                    >
                      Trước
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={cn("h-9 w-9 p-0 rounded-lg", currentPage === page ? "shadow-md" : "")}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                      disabled={currentPage === pagination.pages || isRefreshing}
                      className="rounded-lg h-9"
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => <BOMSkeleton key={i} />)
            ) : products.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-white rounded-2xl shadow-sm border border-dashed">
                <Package className="h-12 w-12 opacity-20" />
                <p className="text-lg font-medium">Chưa có dữ liệu định mức</p>
              </div>
            ) : (
              products.map((product) => (
                <Card key={product._id} className="border-none shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
                  <Collapsible
                    open={expandedBOM === product._id}
                    onOpenChange={(open) => setExpandedBOM(open ? product._id : null)}
                  >
                    <div className="p-4 flex flex-col md:flex-row md:items-center gap-6">
                      {/* Image */}
                      <div className="h-20 w-20 rounded-2xl bg-muted overflow-hidden shrink-0 border border-muted shadow-sm">
                        {product.productImage ? (
                          <img src={product.productImage} alt={product.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors">
                            {product.name}
                          </h3>
                          <Badge className="bg-[#4A7C23]/10 text-[#4A7C23] border-[#4A7C23]/20 font-bold shrink-0">
                            {product.estimateMaterialCost?.length || 0} nguyên liệu
                          </Badge>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground uppercase flex items-center gap-2">
                          <Boxes className="h-3 w-3" />
                          {product.code}
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                          {product.category}
                        </p>
                      </div>

                      {/* Cost & Action */}
                      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                        <div className="text-center md:text-right">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Chi phí dự kiến</p>
                          <p className="font-black text-xl text-[#8B7355]">
                            <CurrencyDisplay value={product.baseCost} />
                          </p>
                        </div>

                        <CollapsibleTrigger asChild>
                          <Button variant="outline" className="rounded-xl px-6 h-12 gap-2 border-muted hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group/btn">
                            <span className="text-sm font-bold">
                              {expandedBOM === product._id ? "Đóng chi tiết" : "Xem định mức"}
                            </span>
                            {expandedBOM === product._id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    <CollapsibleContent className="px-4 pb-4">
                      <div className="rounded-2xl bg-muted/30 border border-muted/50 p-6">
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {product.estimateMaterialCost && product.estimateMaterialCost.length > 0 ? (
                            product.estimateMaterialCost.map((item, index) => (
                              <div key={index} className="flex items-center gap-4 p-3 rounded-xl bg-white shadow-sm border border-muted/50 group/item hover:border-primary/30 transition-colors">
                                <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                                  <Package className="h-5 w-5 text-primary/40" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-foreground truncate">
                                    {typeof item.material === 'object' && item.material !== null
                                      ? (item.material as any).name
                                      : item.materialCode}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground font-mono">
                                    {item.materialCode}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-black text-foreground">
                                    {item.quantity} <span className="text-[10px] font-normal text-muted-foreground uppercase ml-0.5">{item.unit}</span>
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    <CurrencyDisplay value={item.priceAtTime * item.quantity} />
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-full py-8 text-center">
                              <p className="text-sm text-muted-foreground italic">Chưa thiết lập định mức nguyên liệu cho sản phẩm này.</p>
                            </div>
                          )}
                        </div>

                        <div className="mt-6 flex justify-end">
                          <Button size="sm" className="rounded-lg gap-2">
                            <Edit className="h-3.5 w-3.5" />
                            Cập nhật định mức
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
