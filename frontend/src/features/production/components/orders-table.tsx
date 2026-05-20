"use client"

import { ProductionOrder } from "@/api/production.api"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getProductionOrderStatusConfig } from "@/features/production/utils/production-status"
import { format } from "date-fns"
import { vi } from "date-fns/locale"

interface OrdersTableProps {
  orders: ProductionOrder[]
  isLoading: boolean
  onOrderClick: (id: string) => void
}

export function OrdersTable({ orders, isLoading, onOrderClick }: OrdersTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-6 py-4 text-left text-xs font-medium uppercase text-muted-foreground">Mã đơn</th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase text-muted-foreground">Sản phẩm</th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase text-muted-foreground">Số lượng</th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase text-muted-foreground">Phân công</th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase text-muted-foreground">Trạng thái</th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase text-muted-foreground">Hạn hoàn thành</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            [1, 2, 3, 4, 5].map((item) => (
              <tr key={item} className="border-b border-border">
                <td colSpan={6} className="px-6 py-4">
                  <Skeleton className="h-8 w-full" />
                </td>
              </tr>
            ))
          ) : orders.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                Không tìm thấy lệnh sản xuất nào
              </td>
            </tr>
          ) : (
            orders.map((order) => {
              const firstProduct = order.products[0]
              const productName =
                firstProduct?.productName ||
                (typeof firstProduct?.product === "object" ? firstProduct?.product?.name : firstProduct?.product) ||
                "Đang tải..."
              const statusConfig = getProductionOrderStatusConfig(order.status)

              return (
                <tr
                  key={order._id}
                  onClick={() => onOrderClick(order._id)}
                  className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="px-6 py-4">
                    <span className="font-medium text-primary">{order.orderCode}</span>
                  </td>
                  <td className="px-6 py-4 text-card-foreground">
                    {productName}
                    {order.products.length > 1 && <span className="ml-1 text-muted-foreground">(+{order.products.length - 1})</span>}
                  </td>
                  <td className="px-6 py-4 text-card-foreground">
                    {order.products.reduce((sum, product) => sum + product.quantity, 0)}
                  </td>
                  <td className="px-6 py-4">
                    {order.assignments && order.assignments.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex -space-x-2 overflow-hidden">
                          {order.assignments.slice(0, 3).map((assignment, index) => (
                            <div
                              key={index}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary ring-2 ring-white"
                              title={assignment.staff?.fullName || assignment.staff?.username}
                            >
                              {(assignment.staff?.fullName || assignment.staff?.username || "?").charAt(0)}
                            </div>
                          ))}
                          {order.assignments.length > 3 && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground ring-2 ring-white">
                              +{order.assignments.length - 3}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{order.assignments.length} người</span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="border-gray-200 bg-gray-50 text-[10px] text-gray-500">
                        Chưa phân công
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={`${statusConfig.color} border-0 shadow-none`}>{statusConfig.label}</Badge>
                  </td>
                  <td className="px-6 py-4 text-card-foreground">
                    {order.deadline ? format(new Date(order.deadline), "dd/MM/yyyy", { locale: vi }) : "N/A"}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
