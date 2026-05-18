"use client"

import { ProductionOrder } from "@/api/production.api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getProductionOrderStatusConfig } from "@/features/production/utils/production-status"
import { format } from "date-fns"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

interface RecentOrdersProps {
  orders: ProductionOrder[]
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  return (
    <Card className="border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-6">
        <h3 className="text-lg font-semibold text-card-foreground">Đơn sản xuất gần đây</h3>
        <Link href="/production-management/orders">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
            Xem tất cả
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Mã đơn</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Sản phẩm</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Số lượng</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Trạng thái</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Hạn hoàn thành</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                  Không có đơn sản xuất nào gần đây
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const mainProduct = order.products[0]
                const productName = mainProduct
                  ? mainProduct.productName || (typeof mainProduct.product === "object" ? mainProduct.product?.name : mainProduct.product)
                  : "N/A"
                const productDisplay = `${productName}${order.products.length > 1 ? ` (+${order.products.length - 1})` : ""}`
                const totalQuantity = order.products.reduce((sum, product) => sum + product.quantity, 0)
                const statusConfig = getProductionOrderStatusConfig(order.status)

                return (
                  <tr key={order._id} className="border-b border-border transition-colors last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{order.orderCode}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{productDisplay}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{totalQuantity}</td>
                    <td className="px-6 py-4">
                      <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {order.deadline ? format(new Date(order.deadline), "dd/MM/yyyy") : "N/A"}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
