"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { importHistory, materialCategories, products, exportHistory, productCategories } from "@/lib/mock-data"
import type { Material, PaginationData, Product, ExportHistory } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CurrencyDisplay } from "@/components/ui/currency-display"
import { materialApi } from "@/api/material.api"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { Allan } from "next/font/google"

type TabType = "list" | "history" | "products" | "stockOut"

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>("list")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    unit: "Cuộn",
    color: "",
    price: 0,
    currency: "VND",
    currentStock: 0,
    threshold: 10,
    location: "",
    description: "",
    supplier: {
      name: "",
      address: "",
      phone: "",
      email: "",
      contactPerson: "",
      notes: "",
    },
  })

  // API States
  const [materials, setMaterials] = useState<Material[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchMaterials = useCallback(async (search?: string) => {
    setIsLoading(true)
    try {
      const response = await materialApi.getMaterials({ search, limit: 10, page: 1 })
      if (response.success && response.data) {
        setMaterials(response.data.materials || [])
        setPagination(response.data.pagination || null)
      }
    } catch (error: any) {
      toast.error(error.message || "Không thể tải danh sách nguyên liệu")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Debounce search if needed, but for now simple fetch
    const delayDebounceFn = setTimeout(() => {
      fetchMaterials(searchQuery)
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, fetchMaterials])

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await materialApi.createMaterial({
        ...formData,
        isActive: true,
      })
      if (response.success) {
        toast.success("Thêm nguyên liệu thành công")
        setIsAddDialogOpen(false)
        fetchMaterials() // Refresh list
        // Reset form
        setFormData({
          name: "",
          code: "",
          unit: "Cuộn",
          color: "",
          price: 0,
          currency: "VND",
          currentStock: 0,
          threshold: 10,
          location: "",
          description: "",
          supplier: {
            name: "",
            address: "",
            phone: "",
            email: "",
            contactPerson: "",
            notes: "",
          },
        })
      }
    } catch (error: any) {
      toast.error(error.message || "Không thể thêm nguyên liệu")
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeCategoryOptions = activeTab === "products" ? productCategories : materialCategories

  const filteredMaterials = useMemo(
    () =>
      materials?.filter((material) => {
        if (!material || !material.name) return false
        return material.name.toLowerCase().includes(searchQuery.toLowerCase())
      }) || [],
    [materials, searchQuery]
  )

  const filteredProducts = useMemo(
    () =>
      products?.filter((product) => {
        if (!product || !product.name || !product.category) return false
        const matchesSearch =
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.category.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory =
          selectedCategory === "All" || product.category === selectedCategory
        return matchesSearch && matchesCategory
      }) || [],
    [products, searchQuery, selectedCategory]
  )

  const filteredStockOut = useMemo(
    () =>
      exportHistory?.filter((record) => {
        if (!record || !record.productName || !record.destination) return false
        return record.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          record.destination.toLowerCase().includes(searchQuery.toLowerCase())
      }) || [],
    [exportHistory, searchQuery]
  )

  const totalMaterials = pagination?.total || 0

  // Calculate stats from the loaded materials (or API should provide these)
  const lowStockItems = filteredMaterials.filter(
    (m) => m.currentStock <= m.threshold && m.currentStock > 0
  ).length
  const criticalStock = filteredMaterials.filter((m) => m.currentStock === 0).length
  const totalValue = filteredMaterials.reduce(
    (sum, m) => sum + m.currentStock * m.price,
    0
  )

  const getStatusBadge = (material: Material) => {
    if (material.currentStock === 0) {
      return (
        <Badge className="bg-[#DC3545] text-white hover:bg-[#DC3545]/90">
          🔴 Nguy cấp
        </Badge>
      )
    }
    if (material.currentStock <= material.threshold) {
      return (
        <Badge className="bg-[#FFA500] text-white hover:bg-[#FFA500]/90">
          🟠 Sắp hết
        </Badge>
      )
    }
    return (
      <Badge className="bg-[#4A7C23] text-white hover:bg-[#4A7C23]/90">
        🟢 Ổn định
      </Badge>
    )
  }

  return (
    <AppShell title="Kho hàng" subtitle="Chào mừng đến với CRAFTFLOW">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-[#8B7355] to-[#4A7C23] bg-clip-text text-transparent">
              Quản lý kho hàng
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Quản lý nguyên liệu, sản phẩm, tồn kho và lịch sử nhập/xuất
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Thêm nguyên liệu
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Thêm nguyên liệu mới</DialogTitle>
                <DialogDescription>
                  Điền thông tin nguyên liệu cần thêm vào kho
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddMaterial}>
                <div className="grid gap-4 py-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Tên nguyên liệu *</Label>
                      <Input
                        id="name"
                        placeholder="VD: Len cotton cao cấp"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="code">Mã nguyên liệu *</Label>
                      <Input
                        id="code"
                        placeholder="VD: LEN-COTTON-01"
                        required
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="unit">Đơn vị *</Label>
                      <Select
                        value={formData.unit}
                        onValueChange={(value) => setFormData({ ...formData, unit: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn đơn vị" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cuộn">Cuộn</SelectItem>
                          <SelectItem value="Gram">Gram</SelectItem>
                          <SelectItem value="Cái">Cái</SelectItem>
                          <SelectItem value="Bộ">Bộ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="color">Màu sắc</Label>
                      <Input
                        id="color"
                        placeholder="VD: Trắng sữa"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="stock">Số lượng *</Label>
                      <Input
                        id="stock"
                        type="number"
                        placeholder="0"
                        required
                        value={formData.currentStock}
                        onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="minStock">Tồn tối thiểu *</Label>
                      <Input
                        id="minStock"
                        type="number"
                        placeholder="10"
                        required
                        value={formData.threshold}
                        onChange={(e) => setFormData({ ...formData, threshold: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="location">Vị trí kho</Label>
                      <Input
                        id="location"
                        placeholder="VD: Kệ A-01"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="price">Đơn giá (VND) *</Label>
                      <Input
                        id="price"
                        type="number"
                        placeholder="0"
                        required
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Mô tả</Label>
                      <Input
                        id="description"
                        placeholder="Mô tả ngắn gọn"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Supplier Info */}
                  <div className="border-t pt-4">
                    <h3 className="mb-2 text-sm font-medium">Thông tin nhà cung cấp</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="supplierName">Tên NCC *</Label>
                        <Input
                          id="supplierName"
                          placeholder="VD: Tiệm Len Sài Gòn"
                          required
                          value={formData.supplier.name}
                          onChange={(e) => setFormData({
                            ...formData,
                            supplier: { ...formData.supplier, name: e.target.value }
                          })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="supplierPhone">Số điện thoại</Label>
                        <Input
                          id="supplierPhone"
                          placeholder="028..."
                          value={formData.supplier.phone}
                          onChange={(e) => setFormData({
                            ...formData,
                            supplier: { ...formData.supplier, phone: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2 mt-2">
                      <Label htmlFor="supplierAddress">Địa chỉ NCC</Label>
                      <Input
                        id="supplierAddress"
                        placeholder="Địa chỉ chi tiết"
                        value={formData.supplier.address}
                        onChange={(e) => setFormData({
                          ...formData,
                          supplier: { ...formData.supplier, address: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4" />
                        Đang thêm...
                      </>
                    ) : (
                      "Thêm nguyên liệu"
                    )}
                  </Button>
                </DialogFooter>
              </form>
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
                <CurrencyDisplay value={totalValue} />
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
              onClick={() => setActiveTab("products")}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                activeTab === "products"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Danh sách sản phẩm
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

            <button
              onClick={() => setActiveTab("stockOut")}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                activeTab === "stockOut"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Lịch sử xuất kho
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={
                  activeTab === "products"
                    ? "Tìm kiếm sản phẩm..."
                    : activeTab === "stockOut"

                      ? "Tìm kiếm lịch sử xuất kho..."
                      : "Tìm kiếm nguyên liệu..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {(activeTab === "list" || activeTab === "products") && (
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">Tất cả</SelectItem>
                  {activeCategoryOptions.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Content */}
        {activeTab === "list" ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[#8B7355] font-bold">Nguyên liệu</TableHead>
                    <TableHead className="text-[#4A7C23] font-bold">Loại</TableHead>
                    <TableHead className="text-right text-[#FFA500] font-bold">Tồn kho</TableHead>
                    <TableHead className="text-right text-[#007BFF] font-bold">Tối thiểu</TableHead>
                    <TableHead className="text-right text-[#DC3545] font-bold">Đơn giá</TableHead>
                    <TableHead className="text-center text-[#6C757D] font-bold">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Spinner className="h-4 w-4" />
                          <span>Đang tải nguyên liệu...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredMaterials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Không tìm thấy nguyên liệu nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMaterials.map((material) => {
                      if (!material || !material._id || !material.name) return null
                      return (
                        <TableRow key={material._id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{material.name || "N/A"}</p>
                              <p className="text-xs text-muted-foreground">
                                Mã: {material.code || "N/A"} | {material.location || "N/A"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{material.supplier?.name || "N/A"}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium">
                              {material.currentStock || 0}
                            </span>{" "}
                            <span className="text-muted-foreground text-xs uppercase">
                              {material.unit || ""}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {material.threshold || 0} {material.unit || ""}
                          </TableCell>
                          <TableCell className="text-right">
                            <CurrencyDisplay value={material.price || 0} />
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(material)}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : activeTab === "history" ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[#8B7355] font-bold">Nguyên liệu</TableHead>
                    <TableHead className="text-[#4A7C23] font-bold">Nhà cung cấp</TableHead>
                    <TableHead className="text-right text-[#FFA500] font-bold">Số lượng</TableHead>
                    <TableHead className="text-right text-[#DC3545] font-bold">Đơn giá</TableHead>
                    <TableHead className="text-right text-[#007BFF] font-bold">Tổng cộng</TableHead>
                    <TableHead className="text-[#6C757D] font-bold">Ngày</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importHistory?.map((record) => {
                    if (!record || !record.materialName) return null
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.materialName}
                        </TableCell>
                        <TableCell>{record.supplier || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          {record.quantity} {record.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          <CurrencyDisplay value={record.unitPrice} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <CurrencyDisplay value={record.totalPrice} />
                        </TableCell>
                        <TableCell>{record.importDate}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : activeTab === "products" ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[#8B7355] font-bold">Sản phẩm</TableHead>
                    <TableHead className="text-[#4A7C23] font-bold">Danh mục</TableHead>
                    <TableHead className="text-right text-[#FFA500] font-bold">Giá gốc</TableHead>
                    <TableHead className="text-right text-[#DC3545] font-bold">Giá đề xuất</TableHead>
                    <TableHead className="text-[#6C757D] font-bold">Ngày tạo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Không tìm thấy sản phẩm nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => {
                      if (!product || !product._id) return null
                      return (
                        <TableRow key={product._id || product.id}>
                          <TableCell className="font-medium">{product.name || "N/A"}</TableCell>
                          <TableCell>{product.category || "N/A"}</TableCell>
                          <TableCell className="text-right">
                            <CurrencyDisplay value={product.basePrice || 0} />
                          </TableCell>
                          <TableCell className="text-right">
                            <CurrencyDisplay value={product.suggestedPrice ?? product.basePrice ?? 0} />
                          </TableCell>
                          <TableCell>{product.createdAt || "N/A"}</TableCell>
                        </TableRow>
                      )
                    })
                  )}
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
                    <TableHead className="text-[#8B7355] font-bold">Sản phẩm</TableHead>
                    <TableHead className="text-[#4A7C23] font-bold">Điểm đến</TableHead>
                    <TableHead className="text-right text-[#FFA500] font-bold">Số lượng</TableHead>
                    <TableHead className="text-right text-[#DC3545] font-bold">Đơn giá</TableHead>
                    <TableHead className="text-right text-[#007BFF] font-bold">Tổng cộng</TableHead>
                    <TableHead className="text-[#6C757D] font-bold">Ngày xuất</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStockOut?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Không tìm thấy lịch sử xuất kho nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStockOut?.map((record) => {
                      if (!record || !record.productName) return null
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.productName || "N/A"}</TableCell>
                          <TableCell>{record.destination || "N/A"}</TableCell>
                          <TableCell className="text-right">
                            {record.quantity || 0} {record.unit || ""}
                          </TableCell>
                          <TableCell className="text-right">
                            <CurrencyDisplay value={record.unitPrice || 0} />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <CurrencyDisplay value={record.totalPrice || 0} />
                          </TableCell>
                          <TableCell>{record.exportDate || "N/A"}</TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
