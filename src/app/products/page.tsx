"use client"

import { useState } from "react"
import {
  Boxes,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { products, boms, productCategories } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

type TabType = "products" | "bom"

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("products")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [expandedBOM, setExpandedBOM] = useState<string | null>(null)

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesCategory =
      selectedCategory === "All" || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " VND"
  }

  return (
    <AppShell title="Products & BOM" subtitle="Welcome to CRAFTFLOW">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Products & BOM Management
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage your products and bill of materials
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {activeTab === "products" ? "Add Product" : "Create BOM"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {activeTab === "products"
                    ? "Thêm sản phẩm mới"
                    : "Tạo BOM mới"}
                </DialogTitle>
                <DialogDescription>
                  {activeTab === "products"
                    ? "Điền thông tin sản phẩm cần thêm"
                    : "Tạo định mức nguyên vật liệu cho sản phẩm"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {activeTab === "products" ? (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="productName">Tên sản phẩm</Label>
                      <Input id="productName" placeholder="VD: Gấu bông Teddy" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="productCategory">Danh mục</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn danh mục" />
                        </SelectTrigger>
                        <SelectContent>
                          {productCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Mô tả</Label>
                      <Input id="description" placeholder="Mô tả sản phẩm" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="basePrice">Giá cơ bản (VND)</Label>
                      <Input id="basePrice" type="number" placeholder="0" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-2">
                      <Label>Chọn sản phẩm</Label>
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
                      <Label>Nguyên liệu</Label>
                      <p className="text-sm text-muted-foreground">
                        Thêm nguyên liệu và số lượng cần dùng
                      </p>
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Hủy
                </Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>
                  {activeTab === "products" ? "Thêm sản phẩm" : "Tạo BOM"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F5F0EB]">
                <Boxes className="h-6 w-6 text-[#8B7355]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E8F5E9]">
                <Package className="h-6 w-6 text-[#4A7C23]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active BOMs</p>
                <p className="text-2xl font-bold">{boms.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FFF3E0]">
                <Boxes className="h-6 w-6 text-[#D4A574]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{productCategories.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex rounded-lg bg-muted p-1">
            <button
              onClick={() => setActiveTab("products")}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                activeTab === "products"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab("bom")}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                activeTab === "bom"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Bill of Materials
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {activeTab === "products" && (
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  {productCategories.map((cat) => (
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
        {activeTab === "products" ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Base Price</TableHead>
                    <TableHead className="text-right">Suggested Price</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.basePrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-[#4A7C23]">
                        {product.suggestedPrice
                          ? formatCurrency(product.suggestedPrice)
                          : "-"}
                      </TableCell>
                      <TableCell>{product.createdAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {boms.map((bom) => (
              <Card key={bom.id}>
                <Collapsible
                  open={expandedBOM === bom.id}
                  onOpenChange={(open) =>
                    setExpandedBOM(open ? bom.id : null)
                  }
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandedBOM === bom.id ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <CardTitle className="text-base">
                              {bom.productName}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {bom.items.length} nguyên liệu
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            Chi phí sản xuất
                          </p>
                          <p className="font-semibold text-[#8B7355]">
                            {formatCurrency(bom.totalCost)}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nguyên liệu</TableHead>
                            <TableHead className="text-right">
                              Số lượng
                            </TableHead>
                            <TableHead className="text-right">Đơn vị</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bom.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {item.materialName}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.quantity}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.unit}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
