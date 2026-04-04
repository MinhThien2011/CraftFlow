"use client"

import { useState } from "react"
import {
  Factory,
  Plus,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Pause,
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { productionOrders, products } from "@/lib/mock-data"
import type { ProductionStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const statusConfig: Record<
  ProductionStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  "Đang sản xuất": {
    label: "Đang sản xuất",
    color: "bg-[#17A2B8] text-white",
    icon: Factory,
  },
  "Hoàn thành": {
    label: "Hoàn thành",
    color: "bg-[#4A7C23] text-white",
    icon: CheckCircle,
  },
  "Chờ nguyên liệu": {
    label: "Chờ nguyên liệu",
    color: "bg-[#FFA500] text-white",
    icon: AlertCircle,
  },
  "Tạm dừng": {
    label: "Tạm dừng",
    color: "bg-[#6C757D] text-white",
    icon: Pause,
  },
}

export default function ProductionPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProductionStatus | "All">("All")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const filteredOrders = productionOrders.filter((order) => {
    const matchesSearch = order.productName
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === "All" || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const inProgress = productionOrders.filter(
    (o) => o.status === "Đang sản xuất"
  ).length
  const completed = productionOrders.filter(
    (o) => o.status === "Hoàn thành"
  ).length
  const waiting = productionOrders.filter(
    (o) => o.status === "Chờ nguyên liệu"
  ).length
  const paused = productionOrders.filter((o) => o.status === "Tạm dừng").length

  return (
    <AppShell title="Production" subtitle="Welcome to CRAFTFLOW">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Production Management
            </h2>
            <p className="text-sm text-muted-foreground">
              Track and manage production orders
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Production Order
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Tạo đơn sản xuất mới</DialogTitle>
                <DialogDescription>
                  Chọn sản phẩm và số lượng cần sản xuất
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Sản phẩm</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn sản phẩm" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Số lượng</Label>
                  <Input id="quantity" type="number" placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expectedDate">Ngày dự kiến hoàn thành</Label>
                  <Input id="expectedDate" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="note">Ghi chú</Label>
                  <Input id="note" placeholder="Ghi chú thêm (nếu có)" />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Hủy
                </Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>
                  Tạo đơn sản xuất
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E3F2FD]">
                <Factory className="h-6 w-6 text-[#17A2B8]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đang sản xuất</p>
                <p className="text-2xl font-bold">{inProgress}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E8F5E9]">
                <CheckCircle className="h-6 w-6 text-[#4A7C23]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hoàn thành</p>
                <p className="text-2xl font-bold text-[#4A7C23]">{completed}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FFF3E0]">
                <AlertCircle className="h-6 w-6 text-[#FFA500]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chờ nguyên liệu</p>
                <p className="text-2xl font-bold text-[#FFA500]">{waiting}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F5F5F5]">
                <Pause className="h-6 w-6 text-[#6C757D]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tạm dừng</p>
                <p className="text-2xl font-bold text-[#6C757D]">{paused}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search production orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === "All" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("All")}
            >
              All
            </Button>
            {Object.entries(statusConfig).map(([status, config]) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status as ProductionStatus)}
              >
                {config.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Production Orders */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => {
            const config = statusConfig[order.status]
            const progress = (order.completedQuantity / order.quantity) * 100

            return (
              <Card key={order.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {order.productName}
                      </CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Order #{order.id}
                      </p>
                    </div>
                    <Badge className={config.color}>{config.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">Tiến độ</span>
                      <span className="font-medium">
                        {order.completedQuantity}/{order.quantity}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Bắt đầu</p>
                      <p className="font-medium">{order.startDate}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Dự kiến</p>
                      <p className="font-medium">{order.expectedDate}</p>
                    </div>
                  </div>

                  {order.note && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Ghi chú:</span> {order.note}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Chi tiết
                    </Button>
                    {order.status === "Đang sản xuất" && (
                      <Button size="sm" className="flex-1">
                        Cập nhật
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
