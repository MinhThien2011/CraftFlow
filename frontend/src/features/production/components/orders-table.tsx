'use client'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { ProductionOrder } from '@/api/production.api'

interface OrdersTableProps {
  orders: ProductionOrder[]
  isLoading: boolean
  onOrderClick: (id: string) => void
}

const statusConfig: Record<string, { label: string, color: string }> = {
  pending: { label: "Chờ xử lý", color: "bg-gray-100 text-gray-700" },
  in_production: { label: "Đang thực hiện", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Hoàn thành", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-700" },
  on_hold: { label: "Tạm dừng", color: "bg-amber-100 text-amber-700" },
  insufficient_materials: { label: "Thiếu vật tư", color: "bg-purple-100 text-purple-700" },
  assigned: { label: "Đã phân công", color: "bg-cyan-100 text-cyan-700" },
}

export function OrdersTable({ orders, isLoading, onOrderClick }: OrdersTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-6 py-4 text-left text-xs font-medium uppercase text-muted-foreground">
              Mã đơn
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase text-muted-foreground">
              Sản phẩm
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase text-muted-foreground">
              Số lượng
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase text-muted-foreground">
              Phân công
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase text-muted-foreground">
              Trạng thái
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase text-muted-foreground">
              Hạn hoàn thành
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            [1, 2, 3, 4, 5].map(i => (
              <tr key={i} className="border-b border-border">
                <td colSpan={5} className="px-6 py-4"><Skeleton className="h-8 w-full" /></td>
              </tr>
            ))
          ) : orders.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                Không tìm thấy đơn sản xuất nào
              </td>
            </tr>
          ) : (
            orders.map((order) => (
              <tr
                key={order._id}
                onClick={() => onOrderClick(order._id)}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <td className="px-6 py-4">
                  <span className="font-medium text-primary">
                    {order.orderCode}
                  </span>
                </td>
                <td className="px-6 py-4 text-card-foreground">
                  {order.products[0]?.productName ||
                    (typeof order.products[0]?.product === 'object'
                      ? order.products[0]?.product?.name
                      : (order.products[0]?.product || 'Đang tải...'))}
                  {order.products.length > 1 && <span className="text-muted-foreground ml-1">(+{order.products.length - 1})</span>}
                </td>
                <td className="px-6 py-4 text-card-foreground">
                  {order.products.reduce((sum, p) => sum + p.quantity, 0)}
                </td>
                <td className="px-6 py-4">
                  {order.assignments && order.assignments.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex -space-x-2 overflow-hidden">
                        {order.assignments.slice(0, 3).map((assign, i) => (
                          <div
                            key={i}
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary"
                            title={assign.staff?.fullName || assign.staff?.username}
                          >
                            {(assign.staff?.fullName || assign.staff?.username || "?").charAt(0)}
                          </div>
                        ))}
                        {order.assignments.length > 3 && (
                          <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            +{order.assignments.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {order.assignments.length} người
                      </span>
                    </div>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 text-[10px]">
                      Chưa phân công
                    </Badge>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Badge
                    className={`${statusConfig[order.status]?.color || 'bg-gray-100'} border-0 shadow-none`}
                  >
                    {statusConfig[order.status]?.label || order.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-card-foreground">
                  {order.deadline ? format(new Date(order.deadline), 'dd/MM/yyyy', { locale: vi }) : 'N/A'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
