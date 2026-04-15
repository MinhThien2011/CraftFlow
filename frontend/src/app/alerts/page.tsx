"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  AlertTriangle,
  Bell,
  Package,
  Search,
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent } from "@/components/ui/card"
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
import type { Material } from "@/lib/types"
import { cn } from "@/lib/utils"
import { materialApi } from "@/api/material.api"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { CurrencyDisplay } from "@/components/ui/currency-display"

export default function AlertsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"All" | "Critical" | "Low Stock">("All")

  // API States
  const [lowStockMaterials, setLowStockMaterials] = useState<Material[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchLowStock = useCallback(async (search?: string) => {
    setIsLoading(true)
    try {
      const response = await materialApi.getLowStockMaterials({ search, limit: 50, page: 1 })
      if (response.success) {
        setLowStockMaterials(response.data.materials)
      }
    } catch (error: any) {
      toast.error(error.message || "Không thể tải cảnh báo tồn kho")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLowStock(searchQuery)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, fetchLowStock])

  // Filter materials based on status
  const filteredMaterials = useMemo(() => {
    return lowStockMaterials.filter((material) => {
      const isCritical = material.currentStock === 0
      const isLow = material.currentStock <= material.threshold && material.currentStock > 0

      if (statusFilter === "Critical") return isCritical
      if (statusFilter === "Low Stock") return isLow
      return true
    })
  }, [lowStockMaterials, statusFilter])

  const criticalCount = useMemo(() =>
    lowStockMaterials.filter((m) => m.currentStock === 0).length,
    [lowStockMaterials])

  const lowStockCount = useMemo(() =>
    lowStockMaterials.filter((m) => m.currentStock <= m.threshold && m.currentStock > 0).length,
    [lowStockMaterials])

  const getStatusBadge = (material: Material) => {
    if (material.currentStock === 0) {
      return (
        <Badge className="bg-[#DC3545] text-white hover:bg-[#DC3545]/90">
          Nguy cấp
        </Badge>
      )
    }
    return (
      <Badge className="bg-[#FFA500] text-white hover:bg-[#FFA500]/90">
        Sắp hết
      </Badge>
    )
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
                <AlertTriangle className="h-6 w-6 text-[#FFA500]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cảnh báo Sắp hết</p>
                <p className="text-2xl font-bold text-[#FFA500]">
                  {lowStockCount}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F5F0EB]">
                <Package className="h-6 w-6 text-[#8B7355]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng cảnh báo</p>
                <p className="text-2xl font-bold text-foreground">
                  {lowStockMaterials.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm nguyên liệu..."
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
                  Tất cả
                </Button>
                <Button
                  variant={statusFilter === "Critical" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("Critical")}
                  className={cn(statusFilter === "Critical" && "bg-[#DC3545] hover:bg-[#DC3545]/90")}
                >
                  Nguy cấp
                </Button>
                <Button
                  variant={statusFilter === "Low Stock" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("Low Stock")}
                  className={cn(statusFilter === "Low Stock" && "bg-[#FFA500] hover:bg-[#FFA500]/90")}
                >
                  Sắp hết
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nguyên liệu</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Tồn kho hiện tại</TableHead>
                  <TableHead className="text-right">Mức tối thiểu</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Spinner className="h-4 w-4" />
                        <span>Đang tải cảnh báo...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredMaterials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Không có cảnh báo nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMaterials.map((material) => (
                    <TableRow key={material._id}>
                      <TableCell>
                        <div className="font-medium">{material.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {material.supplier.name}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(material)}</TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        material.currentStock === 0 ? "text-[#DC3545]" : "text-[#FFA500]"
                      )}>
                        {material.currentStock} {material.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {material.threshold} {material.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay value={material.price} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                          Nhập hàng
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
