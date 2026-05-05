"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

const orders = [
  {
    id: "PO-2024-001",
    product: "Giỏ tre đan tay",
    quantity: 150,
    status: "in-progress",
    deadline: "25/04/2026",
    progress: 65,
  },
  {
    id: "PO-2024-002",
    product: "Đèn mây thủ công",
    quantity: 80,
    status: "in-progress",
    deadline: "28/04/2026",
    progress: 12,
  },
  {
    id: "PO-2024-003",
    product: "Túi cói thêu hoa",
    quantity: 200,
    status: "complete",
    deadline: "20/04/2026",
    progress: 100,
  },
  {
    id: "PO-2024-004",
    product: "Khay gỗ chạm khắc",
    quantity: 50,
    status: "in-progress",
    deadline: "30/04/2026",
    progress: 40,
  },
  {
    id: "PO-2024-005",
    product: "Lọ hoa gốm sứ",
    quantity: 100,
    status: "cancelled",
    deadline: "22/04/2026",
    progress: 0,
  },
]

const statusConfig = {
  "in-progress": { label: "Đang thực hiện", color: "bg-[#2B8BE8] text-white" },
  complete: { label: "Hoàn thành", color: "bg-[#4A9C6B] text-white" },
  cancelled: { label: "Đã hủy", color: "bg-[#E04E4E] text-white" },
}

export function RecentOrders() {
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
                Tiến độ
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
            {orders.slice(0, 4).map((order) => (
              <tr
                key={order.id}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-6 py-4">
                  <Link
                    href={`/production-management/orders/${order.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {order.id}
                  </Link>
                </td>
                <td className="px-6 py-4 text-card-foreground">{order.product}</td>
                <td className="px-6 py-4 text-card-foreground">{order.quantity}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                      <div
                        className="h-full bg-[#4A9C6B] rounded-full transition-all"
                        style={{ width: `${order.progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-10">{order.progress}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge
                    className={`${statusConfig[order.status as keyof typeof statusConfig].color} border-0`}
                  >
                    {statusConfig[order.status as keyof typeof statusConfig].label}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-card-foreground">{order.deadline}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}


