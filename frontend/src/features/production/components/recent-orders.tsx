"use client"

import { ProductionOrder } from "@/api/production.api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getProductionOrderStatusConfig } from "@/features/production/utils/production-status"
import { format } from "date-fns"
import { ArrowRight, ClipboardList, TrendingUp } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"
import { cn } from "@/lib/utils"

interface RecentOrdersProps {
  orders: ProductionOrder[]
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/40 dark:border-white/10 bg-gradient-to-br from-card/85 to-card/35 backdrop-blur-3xl shadow-sm transition-all hover:shadow-lg flex flex-col">
      <div className="absolute top-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -z-10"></div>

      <div className="flex items-center justify-between border-b border-border/50 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="size-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">Tiến độ lệnh sản xuất gần đây</h3>
            <p className="text-xs text-muted-foreground">Theo dõi thời gian thực tiến độ hoàn thành các lệnh</p>
          </div>
        </div>
        <Link href="/production-management/orders">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 font-semibold group flex items-center gap-1.5 transition-all">
            Xem tất cả
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-muted/20">
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Mã lệnh sản xuất</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Sản phẩm chính</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Sản lượng</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Tiến độ sản xuất</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Trạng thái</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Hạn hoàn thành</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-medium">
                  Không có lệnh sản xuất nào gần đây
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const mainProduct = order.products[0]
                const productName = mainProduct
                  ? mainProduct.productName || (typeof mainProduct.product === "object" ? mainProduct.product?.name : mainProduct.product)
                  : "N/A"
                const productDisplay = `${productName}${order.products.length > 1 ? ` (+${order.products.length - 1})` : ""}`

                // Calculate actual and requested quantities to track completion progress
                const totalRequested = order.products.reduce((sum, p) => sum + p.quantity, 0)
                const totalCompleted = order.assignments?.reduce((sum, ass) => sum + ass.completedQuantity, 0) || 0

                // If status is completed, force 100% progress for visual reliability
                const progressPercent = order.status === "completed"
                  ? 100
                  : totalRequested > 0
                    ? Math.min(Math.round((totalCompleted / totalRequested) * 100), 100)
                    : 0

                const statusConfig = getProductionOrderStatusConfig(order.status)

                return (
                  <tr key={order._id} className="group transition-colors hover:bg-muted/30">
                    <td className="px-6 py-4 font-bold text-foreground group-hover:text-primary transition-colors">
                      <Link href={`/production-management/orders/${order._id}`}>
                        <span className="hover:underline cursor-pointer">{order.orderCode}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">{productDisplay}</td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {totalCompleted.toLocaleString()} / {totalRequested.toLocaleString()}
                    </td>

                    {/* Dynamic visual progress column */}
                    <td className="px-6 py-4 min-w-[180px]">
                      <div className="flex flex-col space-y-1 w-full max-w-[200px]">
                        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <TrendingUp className="size-3 text-emerald-500" />
                            Tỷ lệ đạt
                          </span>
                          <span className="text-foreground">{progressPercent}%</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden shadow-inner">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700 bg-gradient-to-r",
                              progressPercent === 100
                                ? "from-emerald-500 to-teal-500"
                                : progressPercent > 50
                                  ? "from-primary to-emerald-500"
                                  : "from-amber-500 to-primary"
                            )}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Badge className={`${statusConfig.color} px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border-0 shadow-sm`}>
                        {statusConfig.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-semibold">
                      {order.deadline ? format(new Date(order.deadline), "dd/MM/yyyy") : "N/A"}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
