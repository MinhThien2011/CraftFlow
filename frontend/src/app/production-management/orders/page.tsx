"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/production-management/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Plus,
  Search,
} from "lucide-react"
import Link from "next/link"
import { productionOrders } from "@/lib/production-management/orders-data"

const filters = [
  { id: "all", label: "Tất cả", count: 85 },
  { id: "in-progress", label: "Đang thực hiện", count: 25 },
  { id: "complete", label: "Hoàn thành", count: 45 },
  { id: "cancelled", label: "Đã hủy", count: 3 },
]

const statusConfig = {
  "in-progress": { label: "Đang thực hiện", color: "bg-[#2B8BE8] text-white" },
  complete: { label: "Hoàn thành", color: "bg-[#4A9C6B] text-white" },
  cancelled: { label: "Đã hủy", color: "bg-[#E04E4E] text-white" },
}

export default function OrdersPage() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState("")
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0,10))
  const [deadline, setDeadline] = useState("")
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const orders = productionOrders

  const filteredOrders = orders.filter((order) => {
    const matchesFilter = activeFilter === "all" || order.status === activeFilter
    const matchesSearch =
      order.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Calculate dynamic counts based on actual data
  const getFilterCount = (filterId: string) => {
    if (filterId === "all") return orders.length
    return productionOrders.filter(o => o.status === filterId).length
  }

  return (
    <DashboardLayout title="Đơn sản xuất">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo mã đơn hoặc sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Tạo đơn mới
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === filter.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {filter.label}
              <span className="ml-2 opacity-70">({getFilterCount(filter.id)})</span>
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <Card className="bg-card border-border overflow-hidden">
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
                    Tiến độ
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
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/production-management/orders/${order.id}`)}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-primary">
                        {order.id}
                      </span>
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
                        <span className="text-sm text-muted-foreground w-10">
                          {order.progress}%
                        </span>
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
      </div>
      {/* Create Order Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Tạo đơn sản xuất mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product">Chọn sản phẩm</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger id="product">
                  <SelectValue placeholder="Chọn sản phẩm..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SP001">Giỏ tre đan tay</SelectItem>
                  <SelectItem value="SP002">Đèn mây thủ công</SelectItem>
                  <SelectItem value="SP003">Túi cói thêu hoa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qty">Số lượng</Label>
              <Input id="qty" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start">Ngày bắt đầu</Label>
                <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Hạn hoàn thành</Label>
                <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
              <Button onClick={async () => {
                if (!selectedProduct) { alert('Vui lòng chọn sản phẩm'); return }
                if (!quantity || Number(quantity) <= 0) { alert('Số lượng không hợp lệ'); return }
                setIsSubmitting(true)
                await new Promise(r => setTimeout(r, 800))
                setIsSubmitting(false)
                setIsCreateOpen(false)
                router.push('/production-management/orders')
              }} disabled={isSubmitting} className="bg-primary text-primary-foreground">{isSubmitting ? 'Đang tạo...' : 'Tạo đơn'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}


