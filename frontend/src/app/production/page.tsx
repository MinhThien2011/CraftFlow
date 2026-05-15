"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { format } from "date-fns"

import {
  Factory,
  Search,
  RefreshCw,
  CalendarDays,
  Package,
  Eye,
  ArrowRight
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { productionApi, type ProductionOrder } from "@/api/production.api"
import { productApi } from "@/api/product.api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { OrdersTable } from "@/features/production/components/orders-table"

const statusFilters = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ xử lý" },
  { value: "in_progress", label: "Đang sản xuất" },
  { value: "completed", label: "Hoàn thành" },
  { value: "paused", label: "Tạm dừng" },
]

const getStatusConfig = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'pending': return { label: 'Chờ xử lý', color: 'text-gray-700 border-gray-300 bg-gray-100/50', bgClass: 'bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-800' }
    case 'in_progress': return { label: 'Đang sản xuất', color: 'text-blue-700 border-blue-300 bg-blue-100/50', bgClass: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50' }
    case 'completed': return { label: 'Hoàn thành', color: 'text-emerald-700 border-emerald-300 bg-emerald-100/50', bgClass: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/50' }
    case 'paused': return { label: 'Tạm dừng', color: 'text-amber-700 border-amber-300 bg-amber-100/50', bgClass: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50' }
    case 'waiting_material': return { label: 'Chờ nguyên liệu', color: 'text-orange-700 border-orange-300 bg-orange-100/50', bgClass: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/50' }
    case 'cancelled': return { label: 'Đã hủy', color: 'text-red-700 border-red-300 bg-red-100/50', bgClass: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50' }
    default: return { label: status || 'Chưa xác định', color: 'text-gray-700 border-gray-300 bg-gray-100/50', bgClass: 'bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-800' }
  }
}

export default function ProductionPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const router = useRouter()
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [productImagesMap, setProductImagesMap] = useState<Record<string, string>>({})
  const fetchedProductsRef = useRef<Set<string>>(new Set())

  const fetchOrders = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const res: any = await productionApi.getOrders({
        search: searchQuery,
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100
      })

      if (res.success || res.status === 'success') {
        const data = res.data?.orders || res.data?.items || res.data || []
        setOrders(Array.isArray(data) ? data : [])

        // Tự động gọi API bổ sung để lấy ảnh các sản phẩm chưa có
        const uniqueProductIds = new Set<string>()
        data.forEach((order: any) => {
          order.products?.forEach((p: any) => {
            const pid = p.product?._id || p.product
            if (pid && !p.product?.productImage && !fetchedProductsRef.current.has(pid)) {
              uniqueProductIds.add(pid)
              fetchedProductsRef.current.add(pid)
            }
          })
        })

        if (uniqueProductIds.size > 0) {
          const newImages: Record<string, string> = {}
          await Promise.all(
            Array.from(uniqueProductIds).map(async (pid) => {
              try {
                const pRes: any = await productApi.getProductById(pid)
                const img = pRes.data?.product?.productImage || pRes.data?.productImage
                if (img) newImages[pid] = img
              } catch (e) { /* Bỏ qua lỗi nếu không lấy được ảnh */ }
            })
          )
          setProductImagesMap(prev => ({ ...prev, ...newImages }))
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Không thể tải danh sách đơn sản xuất")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [searchQuery, statusFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders(orders.length === 0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, statusFilter, fetchOrders])

  return (
    <AppShell title="Sản xuất" subtitle="Xem và theo dõi các đơn sản xuất">
      <div className="space-y-6">
        {/* Header */}
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-transparent p-6 border border-purple-100 dark:border-purple-900/30">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-pink-400 to-purple-500"></div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Thông tin đơn sản xuất
              </h2>
            </div>
            <p className="text-muted-foreground">
              Theo dõi tiến độ và trạng thái các đơn sản xuất trong hệ thống
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={() => fetchOrders()} disabled={isRefreshing || isLoading}>
            <RefreshCw className={cn("h-4 w-4", (isRefreshing || isLoading) && "animate-spin")} />
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm mã đơn hoặc tên sản phẩm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={statusFilter === filter.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(filter.value)}
                  className={cn(
                    "transition-all duration-200",
                    statusFilter === filter.value ? "shadow-md" : "hover:bg-muted"
                  )}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Production Orders Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading ? (
            Array(8).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse border-none shadow-sm min-h-[220px]">
                <CardContent className="p-5 flex flex-col gap-4 h-full">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center pl-2 py-2">
                      <div className="h-12 w-12 rounded-xl bg-muted border-2 border-background z-10"></div>
                      <div className="h-12 w-12 rounded-xl bg-muted border-2 border-background -ml-7 z-[9]"></div>
                    </div>
                    <div className="h-6 w-20 bg-muted rounded-full"></div>
                  </div>
                  <div className="space-y-2 mt-1">
                    <div className="h-5 w-3/4 bg-muted rounded"></div>
                    <div className="h-4 w-1/3 bg-muted rounded"></div>
                  </div>
                  <div className="mt-auto space-y-2 pt-2">
                    <div className="flex justify-between">
                      <div className="h-4 w-12 bg-muted rounded"></div>
                      <div className="h-4 w-16 bg-muted rounded"></div>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full"></div>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t">
                    <div className="h-4 w-24 bg-muted rounded"></div>
                    <div className="h-8 w-8 bg-muted rounded-lg"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : orders.length === 0 ? (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl">
              <Factory className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-medium text-foreground">Không có đơn sản xuất nào</h3>
              <p className="text-muted-foreground text-sm mt-1">Thay đổi bộ lọc hoặc từ khóa tìm kiếm để xem thêm</p>
            </div>
          ) : (
            orders.map((order) => {
              const config = getStatusConfig(order.status)

              // Extract info based on ProductionOrder interface
              const mainProduct = order.products?.[0]
              const productName = mainProduct?.productName || mainProduct?.product?.name || 'Sản phẩm không xác định'
              const isMultiple = order.products && order.products.length > 1
              const displayTitle = isMultiple ? `${productName} (+${order.products.length - 1} SP khác)` : productName

              // Lấy tối đa 3 ảnh sản phẩm để hiển thị avatar group
              const productImages = order.products?.map((p: any) => {
                const pid = p.product?._id || p.product
                return p.product?.productImage || p.productImage || p.product?.image || productImagesMap[pid]
              }).filter(Boolean) || []
              const displayImages = productImages.slice(0, 3)
              const remainingImages = productImages.length - displayImages.length

              const quantity = order.products?.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0) || 0
              const completedQty = order.assignments?.reduce((sum: number, a: any) => sum + (a.completedQuantity || 0), 0) || 0
              const progress = quantity > 0 ? Math.min(100, (completedQty / quantity) * 100) : 0
              const isUrgent = order.priority === 'urgent' || order.priority === 'high'

              // Xác định màu Progress Bar theo %
              const progressColor =
                progress === 100 ? "bg-emerald-500" :
                  progress >= 75 ? "bg-blue-500" :
                    progress >= 25 ? "bg-amber-500" :
                      "bg-red-500";

              return (
                <Card
                  key={order._id}
                  className={cn(
                    "group relative flex flex-col justify-between overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-primary/20 hover:border-primary/50 border cursor-pointer",
                    config.bgClass
                  )}
                  onClick={() => router.push(`/production/${order._id}`)}
                >
                  <CardContent className="p-5 flex flex-col gap-4 h-full min-h-[220px]">
                    {/* Top: Avatar & Badge */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center pl-2 py-2 shrink-0">
                        {displayImages.length > 0 ? (
                          displayImages.map((img, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "relative h-12 w-12 rounded-xl overflow-hidden border-2 border-background bg-muted shadow-sm transition-all duration-500 ease-out origin-bottom-left",
                                idx > 0 && "-ml-7",
                                "group-hover:shadow-md group-hover:scale-110",
                                idx === 0 && "group-hover:-rotate-12 group-hover:-translate-x-3 group-hover:-translate-y-2",
                                idx === 1 && "group-hover:-rotate-3 group-hover:-translate-y-4 group-hover:translate-x-1",
                                idx === 2 && "group-hover:rotate-6 group-hover:translate-x-5 group-hover:-translate-y-2"
                              )}
                              style={{ zIndex: 10 - idx }}
                            >
                              <img src={img} alt="Product" className="h-full w-full object-cover" />
                            </div>
                          ))
                        ) : (
                          <div className="relative h-12 w-12 rounded-xl bg-background/50 border-2 border-background flex items-center justify-center text-muted-foreground shadow-sm group-hover:scale-110 group-hover:-translate-y-2 group-hover:shadow-md transition-all duration-500">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                        {remainingImages > 0 && (
                          <div
                            className={cn(
                              "relative h-12 w-12 rounded-xl bg-background/90 backdrop-blur-sm border-2 border-background flex items-center justify-center text-xs font-bold text-muted-foreground shadow-sm transition-all duration-500 ease-out origin-bottom-left",
                              displayImages.length > 0 && "-ml-7",
                              "group-hover:shadow-md group-hover:scale-110",
                              displayImages.length === 1 && "group-hover:-rotate-3 group-hover:-translate-y-4 group-hover:translate-x-1",
                              displayImages.length === 2 && "group-hover:rotate-6 group-hover:translate-x-5 group-hover:-translate-y-2",
                              displayImages.length === 3 && "group-hover:rotate-12 group-hover:translate-x-9 group-hover:-translate-y-1"
                            )}
                            style={{ zIndex: 10 - displayImages.length }}
                          >
                            +{remainingImages}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className={cn("font-medium border shadow-sm", config.color)}>
                        {config.label}
                      </Badge>
                    </div>

                    {/* Middle: Title & ID */}
                    <div className="flex flex-col min-w-0 mt-1">
                      <span className="font-bold text-base line-clamp-2 text-foreground leading-tight" title={displayTitle}>
                        {displayTitle}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground font-mono mt-1">
                        #{order.orderCode || order._id}
                      </span>
                    </div>

                    {/* Bottom: Progress & Dates */}
                    <div className="mt-auto pt-2 space-y-4">
                      {/* Progress */}
                      <div>
                        <div className="mb-1.5 flex justify-between items-end text-sm">
                          <span className="text-muted-foreground font-medium">Tiến độ</span>
                          <div className="text-right">
                            <span className="font-bold text-foreground">{completedQty}</span>
                            <span className="text-muted-foreground"> / {quantity}</span>
                          </div>
                        </div>
                        <div className="relative h-2 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={cn("absolute top-0 left-0 h-full transition-all duration-500 rounded-full", progressColor)}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Dates & Action */}
                      <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-[10px] uppercase font-semibold tracking-wider flex items-center gap-1 mb-0.5">
                            <CalendarDays className="h-3 w-3" /> Hạn chót
                          </span>
                          <span className={cn("font-medium text-sm", isUrgent ? "text-red-600" : "text-foreground")}>
                            {order.deadline ? format(new Date(order.deadline), 'dd/MM/yyyy') : '---'}
                          </span>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg bg-background/50 group-hover:bg-primary group-hover:text-primary-foreground shadow-sm transition-colors"
                          title="Xem chi tiết"
                        >
                          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </AppShell>
  )
}