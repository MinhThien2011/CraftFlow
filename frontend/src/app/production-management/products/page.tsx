"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/production-management/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Plus, Search } from "lucide-react"
import Link from "next/link"

const products = [
  {
    id: "TT-001",
    name: "Túi tote vải canvas",
    description: "Túi tote thêu tay họa tiết hoa sen",
    bomItems: 4,
    status: "active",
    updatedAt: "2026-04-15",
  },
  {
    id: "DL-002",
    name: "Đèn lồng tre đan",
    description: "Đèn lồng tre đan thủ công, có đế gỗ",
    bomItems: 5,
    status: "active",
    updatedAt: "2026-04-12",
  },
  {
    id: "KM-003",
    name: "Khay mây đựng trái cây",
    description: "Khay mây tròn đường kính 30cm",
    bomItems: 3,
    status: "inactive",
    updatedAt: "2026-04-10",
  },
  {
    id: "HG-004",
    name: "Hộp gỗ khắc",
    description: "Hộp đựng trang sức gỗ thông khắc tên",
    bomItems: 4,
    status: "active",
    updatedAt: "2026-04-16",
  },
  {
    id: "VG-005",
    name: "Vòng tay handmade",
    description: "Vòng tay handmade thiết kế thủ công",
    bomItems: 3,
    status: "active",
    updatedAt: "2026-04-08",
  },
  {
    id: "TT-006",
    name: "Tranh thêu tay phong cảnh",
    description: "Tranh thêu chữ thập khung gỗ 40x50cm",
    bomItems: 6,
    status: "inactive",
    updatedAt: "2026-04-05",
  },
  {
    id: "GT-007",
    name: "Giỏ tre đựng đồ",
    description: "Giỏ tre có nắp đậy, quai xách",
    bomItems: 3,
    status: "active",
    updatedAt: "2026-04-14",
  },
  {
    id: "NL-008",
    name: "Nến thơm handmade",
    description: "Nến đậu nành hương lavender, ly thủy tinh",
    bomItems: 5,
    status: "inactive",
    updatedAt: "2026-04-11",
  },
]

const statusConfig = {
  active: { label: "Đang hoạt động", bgColor: "bg-[#E8F5EE]", textColor: "text-[#2D6A4F]", dotColor: "bg-[#4A9C6B]" },
  inactive: { label: "Không hoạt động", bgColor: "bg-[#FEE2E2]", textColor: "text-[#B91C1C]", dotColor: "bg-[#E04E4E]" },
}

export default function ProductsPage() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredProducts = products.filter((product) => {
    const matchesFilter = activeFilter === "all" || product.status === activeFilter
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.id.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Tính số lượng cho từng trạng thái
  const counts = {
    all: products.length,
    active: products.filter(p => p.status === "active").length,
    inactive: products.filter(p => p.status === "inactive").length,
  }

  const filters = [
    { id: "all", label: "Tất cả", count: counts.all },
    { id: "active", label: "Đang hoạt động", count: counts.active },
    { id: "inactive", label: "Không hoạt động", count: counts.inactive },
  ]

  const handleRowClick = (productId: string) => {
    router.push(`/production-management/products/${productId}`)
  }

  return (
    <DashboardLayout title="Quản lý sản phẩm">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
          <Link href="/production-management/products/new">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Tạo sản phẩm mới
            </Button>
          </Link>
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
              <span className="ml-2 opacity-70">({filter.count})</span>
            </button>
          ))}
        </div>

        {/* Products Table */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                    Mã SP
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                    Tên sản phẩm
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                    Mô tả
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-muted-foreground">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-muted-foreground">
                    Số lượng
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                    Cập nhật
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const status = statusConfig[product.status as keyof typeof statusConfig]

                  return (
                    <tr
                      key={product.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => handleRowClick(product.id)}
                    >
                      <td className="px-6 py-4 font-medium text-primary">
                        {product.id}
                      </td>
                      <td className="px-6 py-4 text-card-foreground font-medium">
                        {product.name}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {product.description}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${status.bgColor} ${status.textColor}`}>
                            <span className={`w-2 h-2 rounded-full ${status.dotColor}`}></span>
                            {status.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-muted-foreground">
                        {product.bomItems} vật tư
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {product.updatedAt}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}


