"use client"

import { useState } from "react"
import {
  Package,
  AlertTriangle,
  TrendingDown,
  Plus,
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
import { materials, importHistory, materialCategories } from "@/lib/mock-data"
import type { Material, MaterialCategory } from "@/lib/types"
import { cn } from "@/lib/utils"

type TabType = "list" | "history"

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>("list")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | "All">("All")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const filteredMaterials = materials.filter((material) => {
    const matchesSearch = material.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesCategory =
      selectedCategory === "All" || material.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const totalMaterials = materials.length
  const lowStockItems = materials.filter(
    (m) => m.status === "Low Stock" || m.status === "Critical"
  ).length
  const criticalStock = materials.filter((m) => m.status === "Critical").length
  const totalValue = materials.reduce(
    (sum, m) => sum + m.currentStock * m.unitPrice,
    0
  )

  const getStatusBadge = (status: Material["status"]) => {
  switch (status) {
    case "Good":
      return (
        <Badge className="bg-[#4A7C23] text-white hover:bg-[#4A7C23]/90">
          🟢 Ổn định
        </Badge>
      )
    case "Low Stock":
      return (
        <Badge className="bg-[#FFA500] text-white hover:bg-[#FFA500]/90">
          🟠 Sắp hết
        </Badge>
      )
    case "Critical":
      return (
        <Badge className="bg-[#DC3545] text-white hover:bg-[#DC3545]/90">
          🔴 Nguy cấp
        </Badge>
      )
    default:
      return null
  }
}

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " VND"
  }

  return (
    <AppShell title="Kho hàng" subtitle="Chào mừng đến với CRAFTFLOW">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Quản lý kho hàng
            </h2>
            <p className="text-sm text-muted-foreground">
              Quản lý nguyên liệu, tồn kho và lịch sử nhập hàng
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Thêm nguyên liệu
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-106.25">
              <DialogHeader>
                <DialogTitle>Thêm nguyên liệu mới</DialogTitle>
                <DialogDescription>
                  Điền thông tin nguyên liệu cần thêm vào kho
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Tên nguyên liệu</Label>
                  <Input id="name" placeholder="VD: Len cotton cao cấp" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Danh mục</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      {materialCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="stock">Số lượng</Label>
                    <Input id="stock" type="number" placeholder="0" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="minStock">Tồn tối thiểu</Label>
                    <Input id="minStock" type="number" placeholder="0" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Đơn giá (VND)</Label>
                  <Input id="price" type="number" placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="supplier">Nhà cung cấp</Label>
                  <Input id="supplier" placeholder="VD: Len Việt Nam" />
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
                  Thêm nguyên liệu
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F5F0EB]">
                <Package className="h-6 w-6 text-[#8B7355]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng nguyên liệu</p>
                <p className="text-2xl font-bold">{totalMaterials}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FFF3E0]">
                <TrendingDown className="h-6 w-6 text-[#FFA500]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sắp hết</p>
                <p className="text-2xl font-bold text-[#FFA500]">
                  {lowStockItems}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FFEBEE]">
                <AlertTriangle className="h-6 w-6 text-[#DC3545]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nguy cấp</p>
                <p className="text-2xl font-bold text-[#DC3545]">
                  {criticalStock}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">
                Tổng giá trị tồn kho
              </p>
              <p className="text-xl font-bold text-[#4A7C23]">
                {formatCurrency(totalValue)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex rounded-lg bg-muted p-1">
            <button
              onClick={() => setActiveTab("list")}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                activeTab === "list"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Danh sách nguyên liệu
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                activeTab === "history"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Lịch sử nhập kho
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
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
                variant={selectedCategory === "All" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("All")}
              >
                Tất cả
              </Button>
              {materialCategories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === "list" ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nguyên liệu</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead className="text-right">Tồn kho</TableHead>
                    <TableHead className="text-right">Tối thiểu</TableHead>
                    <TableHead className="text-right">Đơn giá</TableHead>
                    <TableHead className="text-center">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{material.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {material.supplier}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{material.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium">
                          {material.currentStock}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {material.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {material.minStock} {material.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(material.unitPrice)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(material.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nguyên liệu</TableHead>
                    <TableHead>Nhà cung cấp</TableHead>
                    <TableHead className="text-right">Số lượng</TableHead>
                    <TableHead className="text-right">Đơn giá</TableHead>
                    <TableHead className="text-right">Tổng cộng</TableHead>
                    <TableHead>Ngày</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.materialName}
                      </TableCell>
                      <TableCell>{record.supplier}</TableCell>
                      <TableCell className="text-right">
                        {record.quantity} {record.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(record.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(record.totalPrice)}
                      </TableCell>
                      <TableCell>{record.importDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
