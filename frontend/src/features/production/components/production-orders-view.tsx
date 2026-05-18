"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { format } from "date-fns"
import { ArrowRight, CalendarDays, Factory, Package, Plus, RefreshCw, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { productionApi, type ProductionOrder } from "@/api/production.api"
import { productApi } from "@/api/product.api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useCreateProductionOrder } from "@/features/production/hooks/use-production"
import { useProducts } from "@/features/production/hooks/use-products"
import { PRODUCTION_STATUS_FILTERS, getProductionOrderStatusConfig } from "@/features/production/utils/production-status"

const CreateOrderModal = dynamic(
  () => import("@/features/production/components/create-order-modal").then((m) => m.CreateOrderModal),
  { ssr: false },
)


interface ProductionOrdersViewProps {
  detailBasePath: string
  canCreate?: boolean
}

export function ProductionOrdersView({ detailBasePath, canCreate = false }: ProductionOrdersViewProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [productImagesMap, setProductImagesMap] = useState<Record<string, string>>({})
  const fetchedProductsRef = useRef<Set<string>>(new Set())

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: string }[]>([{ productId: "", quantity: "" }])
  const [deadline, setDeadline] = useState("")
  const [note, setNote] = useState("")

  const createMutation = useCreateProductionOrder()
  const { data: productsResponse } = useProducts({ isActive: true, limit: 100 }, { enabled: canCreate })
  const products = useMemo(() => productsResponse?.data?.products || productsResponse?.data?.items || [], [productsResponse])

  const fetchOrders = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const res: any = await productionApi.getOrders({
        search: searchQuery,
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 100,
      })

      if (res.success || res.status === "success") {
        const data = res.data?.orders || res.data?.items || res.data || []
        const nextOrders = Array.isArray(data) ? data : []
        setOrders(nextOrders)

        const uniqueProductIds = new Set<string>()
        nextOrders.forEach((order: any) => {
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
              } catch {
                // Product images are nice-to-have; the order list should still render.
              }
            }),
          )
          setProductImagesMap((prev) => ({ ...prev, ...newImages }))
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
    const timer = window.setTimeout(() => {
      fetchOrders(orders.length === 0)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [fetchOrders, orders.length])

  const addProductItem = () => setSelectedItems((items) => [...items, { productId: "", quantity: "" }])
  const removeProductItem = (index: number) => {
    setSelectedItems((items) => (items.length > 1 ? items.filter((_, itemIndex) => itemIndex !== index) : items))
  }
  const updateProductItem = (index: number, field: "productId" | "quantity", value: string) => {
    setSelectedItems((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)))
  }

  const resetCreateForm = () => {
    setSelectedItems([{ productId: "", quantity: "" }])
    setDeadline("")
    setNote("")
  }

  const handleCreateOrder = () => {
    const validItems = selectedItems.filter((item) => item.productId && Number(item.quantity) > 0)
    if (validItems.length === 0 || !deadline) return

    createMutation.mutate(
      {
        products: validItems.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) })),
        deadline: new Date(deadline).toISOString(),
        notes: note,
        priority: "medium",
      },
      {
        onSuccess: () => {
          setIsCreateOpen(false)
          resetCreateForm()
          fetchOrders(true)
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between w-full bg-card p-3 rounded-2xl border shadow-sm min-h-[72px] gap-3">
        {/* Left: Search Bar */}
        <div className="relative shrink-0 w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm mã đơn, tên sản phẩm..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9 bg-muted/40 border-transparent hover:bg-muted/60 focus-visible:bg-background focus-visible:ring-primary/20 h-11 rounded-xl transition-colors text-sm"
          />
        </div>

        {/* Middle: Scrollable Status Filters */}
        <div className="flex-1 min-w-0 overflow-x-auto px-3 pb-1 md:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] max-w-full sm:max-w-[340px] md:max-w-[480px] lg:max-w-[620px] xl:max-w-[780px]">
          <div className="flex items-center gap-1.5 w-max">
            {PRODUCTION_STATUS_FILTERS.map((filter) => (
              <Button
                key={filter.value}
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter(filter.value)}
                className={cn(
                  "h-10 px-4 text-sm font-semibold rounded-xl transition-all duration-200 shrink-0",
                  statusFilter === filter.value
                    ? "bg-muted text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 shrink-0 pl-4 border-l border-border pr-1">
          {canCreate && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm h-10 px-4 rounded-xl text-sm font-semibold shrink-0"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Tạo đơn mới
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchOrders()}
            disabled={isRefreshing || isLoading}
            className="h-10 w-10 rounded-xl border-gray-200 hover:bg-muted shrink-0"
            title="Làm mới"
          >
            <RefreshCw className={cn("h-4 w-4", (isRefreshing || isLoading) && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <Card key={index} className="min-h-[220px] animate-pulse border-none shadow-sm">
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center py-2 pl-2">
                    <div className="z-10 h-12 w-12 rounded-xl border-2 border-background bg-muted" />
                    <div className="z-[9] -ml-7 h-12 w-12 rounded-xl border-2 border-background bg-muted" />
                  </div>
                  <div className="h-6 w-20 rounded-full bg-muted" />
                </div>
                <div className="mt-1 space-y-2">
                  <div className="h-5 w-3/4 rounded bg-muted" />
                  <div className="h-4 w-1/3 rounded bg-muted" />
                </div>
                <div className="mt-auto space-y-2 pt-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-12 rounded bg-muted" />
                    <div className="h-4 w-16 rounded bg-muted" />
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : orders.length === 0 ? (
          <div className="col-span-full rounded-xl border-2 border-dashed py-12 text-center">
            <Factory className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-foreground">Không có đơn sản xuất nào</h3>
            <p className="mt-1 text-sm text-muted-foreground">Thay đổi bộ lọc hoặc từ khóa tìm kiếm để xem thêm</p>
          </div>
        ) : (
          orders.map((order) => {
            const config = getProductionOrderStatusConfig(order.status)
            const mainProduct = order.products?.[0]
            const productName = mainProduct?.productName || mainProduct?.product?.name || "Sản phẩm không xác định"
            const isMultiple = order.products && order.products.length > 1
            const displayTitle = isMultiple ? `${productName} (+${order.products.length - 1} SP khác)` : productName
            const productImages = order.products?.map((p: any) => {
              const pid = p.product?._id || p.product
              return p.product?.productImage || p.productImage || p.product?.image || productImagesMap[pid]
            }).filter(Boolean) || []
            const displayImages = productImages.slice(0, 3)
            const remainingImages = productImages.length - displayImages.length
            const quantity = order.products?.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0) || 0
            const completedQty = order.assignments?.reduce((sum: number, a: any) => sum + (a.completedQuantity || 0), 0) || 0
            const progress = quantity > 0 ? Math.min(100, (completedQty / quantity) * 100) : 0
            const isUrgent = order.priority === "urgent" || order.priority === "high"
            const progressColor = progress === 100 ? "bg-emerald-500" : progress >= 75 ? "bg-blue-500" : progress >= 25 ? "bg-amber-500" : "bg-red-500"

            return (
              <Card
                key={order._id}
                className={cn("group relative flex cursor-pointer flex-col justify-between overflow-hidden border transition-all duration-500 hover:-translate-y-2 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/20", config.bgClass)}
                onClick={() => router.push(`${detailBasePath}/${order._id}`)}
              >
                <CardContent className="flex h-full min-h-[220px] flex-col gap-4 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex shrink-0 items-center py-2 pl-2">
                      {displayImages.length > 0 ? (
                        displayImages.map((img, idx) => (
                          <div
                            key={`${img}-${idx}`}
                            className={cn("relative h-12 w-12 origin-bottom-left overflow-hidden rounded-xl border-2 border-background bg-muted shadow-sm transition-all duration-500 ease-out group-hover:scale-110 group-hover:shadow-md", idx > 0 && "-ml-7")}
                            style={{ zIndex: 10 - idx }}
                          >
                            <img src={img} alt="Product" className="h-full w-full object-cover" />
                          </div>
                        ))
                      ) : (
                        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border-2 border-background bg-background/50 text-muted-foreground shadow-sm transition-all duration-500 group-hover:-translate-y-2 group-hover:scale-110 group-hover:shadow-md">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                      {remainingImages > 0 && (
                        <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-xl border-2 border-background bg-background/90 text-xs font-bold text-muted-foreground shadow-sm backdrop-blur-sm", displayImages.length > 0 && "-ml-7")} style={{ zIndex: 10 - displayImages.length }}>
                          +{remainingImages}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className={cn("border font-medium shadow-sm", config.color)}>
                      {config.label}
                    </Badge>
                  </div>

                  <div className="mt-1 flex min-w-0 flex-col">
                    <span className="line-clamp-2 text-base font-bold leading-tight text-foreground" title={displayTitle}>
                      {displayTitle}
                    </span>
                    <span className="mt-1 font-mono text-sm font-medium text-muted-foreground">#{order.orderCode || order._id}</span>
                  </div>

                  <div className="mt-auto space-y-4 pt-2">
                    <div>
                      <div className="mb-1.5 flex items-end justify-between text-sm">
                        <span className="font-medium text-muted-foreground">Tiến độ</span>
                        <div className="text-right">
                          <span className="font-bold text-foreground">{completedQty}</span>
                          <span className="text-muted-foreground"> / {quantity}</span>
                        </div>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                        <div className={cn("absolute left-0 top-0 h-full rounded-full transition-all duration-500", progressColor)} style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-black/5 pt-3 dark:border-white/5">
                      <div className="flex flex-col">
                        <span className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <CalendarDays className="h-3 w-3" /> Hạn chót
                        </span>
                        <span className={cn("text-sm font-medium", isUrgent ? "text-red-600" : "text-foreground")}>
                          {order.deadline ? format(new Date(order.deadline), "dd/MM/yyyy") : "---"}
                        </span>
                      </div>

                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-background/50 shadow-sm transition-colors group-hover:bg-primary group-hover:text-primary-foreground" title="Xem chi tiết">
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

      {canCreate && (
        <CreateOrderModal
          isOpen={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          products={products}
          selectedItems={selectedItems}
          onAddItem={addProductItem}
          onRemoveItem={removeProductItem}
          onUpdateItem={updateProductItem}
          deadline={deadline}
          onDeadlineChange={setDeadline}
          note={note}
          onNoteChange={setNote}
          onSubmit={handleCreateOrder}
          isSubmitting={createMutation.isPending}
        />
      )}
    </div>
  )
}
