"use client"

import { useState } from "react"
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Search,
  Filter,
  Package,
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { stockAlerts, materials } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default function AlertsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"All" | "Critical" | "Low Stock">("All")

  const filteredAlerts = stockAlerts.filter((alert) => {
    const matchesSearch = alert.materialName
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === "All" || alert.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const criticalCount = stockAlerts.filter((a) => a.status === "Critical").length
  const lowStockCount = stockAlerts.filter((a) => a.status === "Low Stock").length

  const getStatusBadge = (status: "Critical" | "Low Stock") => {
    if (status === "Critical") {
      return (
        <Badge className="bg-[#DC3545] text-white hover:bg-[#DC3545]/90">
          Critical
        </Badge>
      )
    }
    return (
      <Badge className="bg-[#FFA500] text-white hover:bg-[#FFA500]/90">
        Low Stock
      </Badge>
    )
  }

  const getMaterial = (materialId: string) => {
    return materials.find((m) => m.id === materialId)
  }

  return (
    <AppShell title="Cảnh báo tồn kho" subtitle="Chào mừng đến với CRAFTFLOW">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Cảnh báo tồn kho
            </h2>
            <p className="text-sm text-muted-foreground">
              Theo dõi nguyên vật liệu sắp hết và mức tồn kho nguy hiểm
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <Bell className="h-4 w-4" />
            Thiết lập cảnh báo
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FFEBEE]">
                <AlertTriangle className="h-6 w-6 text-[#DC3545]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cảnh báo Khẩn cấp</p>
                <p className="text-2xl font-bold text-[#DC3545]">
                  {criticalCount}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FFF3E0]">
                <Package className="h-6 w-6 text-[#FFA500]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sắp hết hàng</p>
                <p className="text-2xl font-bold text-[#FFA500]">
                  {lowStockCount}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E8F5E9]">
                <CheckCircle className="h-6 w-6 text-[#4A7C23]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đã xử lý hôm nay</p>
                <p className="text-2xl font-bold text-[#4A7C23]">3</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm cảnh báo..."
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
              Tất cả ({stockAlerts.length})
            </Button>
            <Button
              variant={statusFilter === "Critical" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("Critical")}
              className={cn(
                statusFilter === "Critical" && "bg-[#DC3545] hover:bg-[#DC3545]/90"
              )}
            >
              Khẩn cấp ({criticalCount})
            </Button>
            <Button
              variant={statusFilter === "Low Stock" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("Low Stock")}
              className={cn(
                statusFilter === "Low Stock" && "bg-[#FFA500] hover:bg-[#FFA500]/90"
              )}
            >
              Sắp hết hàng ({lowStockCount})
            </Button>
          </div>
        </div>

        {/* Alerts Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nguyên liệu</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-right">Tồn kho hiện tại</TableHead>
                  <TableHead className="text-right">Tồn kho tối thiểu</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.map((alert) => {
                  const material = getMaterial(alert.materialId)
                  return (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{alert.materialName}</p>
                          <p className="text-sm text-muted-foreground">
                            {material?.supplier}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {material?.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "font-medium",
                            alert.status === "Critical"
                              ? "text-[#DC3545]"
                              : "text-[#FFA500]"
                          )}
                        >
                          {alert.currentStock}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {alert.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {alert.minStock} {alert.unit}
                      </TableCell>
                      <TableCell>{getStatusBadge(alert.status)}</TableCell>
                      <TableCell>{alert.createdAt}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm">Nhập kho</Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
