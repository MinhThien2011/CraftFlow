"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { ProductionOrder } from "@/api/production.api"
import { format } from "date-fns"

interface RecentOrdersProps {
  orders: ProductionOrder[]
}

const statusConfig: Record<string, { label: string; color: string }> = {
  "in_production": { label: "Đang sản xuất", color: "bg-[#2B8BE8] text-white" },
  "completed": { label: "Hoàn thành", color: "bg-[#4A9C6B] text-white" },
  "cancelled": { label: "Đã hủy", color: "bg-[#E04E4E] text-white" },
  "pending": { label: "Chờ xử lý", color: "bg-amber-500 text-white" },
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  return (
    <Card className="bg-card border-border">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-card-foreground">
          Đơn sản xuất gần đây
        </h3>
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
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Mã đơn
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Sản phẩm
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Số lượng
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Hạn hoàn thành
              </th>
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
                const mainProduct = order.products[0];
                const productDisplay = mainProduct
                  ? `${mainProduct.product || (mainProduct.product as any)?.name}${order.products.length > 1 ? ` (+${order.products.length - 1})` : ''}`
                  : 'N/A';

                const totalQuantity = order.products.reduce((sum, p) => sum + p.quantity, 0);
                const config = statusConfig[order.status] || { label: order.status, color: "bg-gray-500 text-white" };

                return (
                  <tr
                    key={order._id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      {order.orderCode}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {productDisplay}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {totalQuantity}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={config.color}>
                        {config.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {order.deadline ? format(new Date(order.deadline), "dd/MM/yyyy") : "N/A"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}


