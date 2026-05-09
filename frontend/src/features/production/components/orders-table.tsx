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
                  {typeof order.products[0]?.product === 'object' 
                    ? order.products[0].product.name 
                    : 'Đang tải...'}
                </td>
                <td className="px-6 py-4 text-card-foreground">
                  {order.products.reduce((sum, p) => sum + p.quantity, 0)}
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
