"use client"

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Boxes,
  Plus,
  Search,
  Package,
  Filter,
  RefreshCw,
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { productCategories } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { productApi } from "@/api/product.api"
import type { Product, PaginationData } from "@/lib/types"
import { toast } from "sonner"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { TransactionHistoryDialog } from "@/components/shared/transaction-history-dialog"

type TabType = "products" | "bom"

// Lazy load sub-components để giảm tải bundle đầu tiên
const ProductTable = dynamic(() => import('@/components/product/product-table').then(m => m.ProductTable), {
  ssr: false, loading: () => <div className="p-8 text-center text-muted-foreground animate-pulse">Đang tải danh sách...</div>
})
const BOMList = dynamic(() => import('@/components/product/bom-list').then(m => m.BOMList), {
  ssr: false, loading: () => <div className="p-8 text-center text-muted-foreground animate-pulse">Đang tải định mức...</div>
})
const CreateBomDialog = dynamic(() => import('@/components/product/create-bom-dialog').then(m => m.CreateBomDialog), {
  ssr: false
})

export default function ProductsPage() {
  const router = useRouter()
  const { role } = useAuth()
  const isProductionManager = role === 'production_manager'
  const [activeTab, setActiveTab] = useState<TabType>("products")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [currentPage, setCurrentPage] = useState(1)
  const [historyItem, setHistoryItem] = useState<Product | null>(null)

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
      const res: any = response
      if (res.status === "success" || res.success) {
        const data = res.data?.products || res.data?.items || res.data || []
        setProducts(Array.isArray(data) ? data : [])

        const apiPagination = res.data?.pagination || res.pagination
        if (apiPagination) {
          setPagination({
            total: apiPagination.total,
            pages: apiPagination.totalPages,
            page: apiPagination.currentPage,
            limit: apiPagination.limit,
          })
        }
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
        category: selectedCategory === "All" ? '' : selectedCategory,
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
      category: selectedCategory === "All" ? '' : selectedCategory,
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
    <AppShell title="Quản lý sản phẩm & định mức" subtitle="Hệ thống quản lý danh mục sản phẩm và định mức nguyên vật liệu (BOM) chi tiết.">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
            {isProductionManager && (
              activeTab === "products" ? (
                <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={() => router.push('/products/create')}>
                  <Plus className="h-4 w-4" />
                  Thêm sản phẩm
                </Button>
              ) : (
                <CreateBomDialog />
              )
            )}
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
          <ProductTable
            products={products}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            pagination={pagination}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            handleResetFilters={handleResetFilters}
            handleDeleteProduct={handleDeleteProduct}
            isProductionManager={isProductionManager}
            onViewHistory={setHistoryItem}
          />
        ) : (
          <BOMList products={products} isLoading={isLoading} isProductionManager={isProductionManager} />
        )}

        {historyItem && (
          <TransactionHistoryDialog
            open={!!historyItem}
            onOpenChange={(open) => !open && setHistoryItem(null)}
            itemId={historyItem._id}
            itemName={historyItem.name}
            itemType="product"
          />
        )}
      </div>
    </AppShell>
  )
}
