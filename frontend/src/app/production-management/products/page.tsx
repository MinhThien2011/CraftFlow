"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Plus, Search, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useProducts } from "@/features/production/hooks/use-products"
import { format } from "date-fns"

const statusConfig = {
  active: { label: "Đang hoạt động", bgColor: "bg-[#E8F5EE]", textColor: "text-[#2D6A4F]", dotColor: "bg-[#4A9C6B]" },
  inactive: { label: "Không hoạt động", bgColor: "bg-[#FEE2E2]", textColor: "text-[#B91C1C]", dotColor: "bg-[#E04E4E]" },
}

export default function ProductsPage() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)

  const { data: response, isLoading } = useProducts({
    search: searchQuery,
    isActive: activeFilter === "all" ? "all" : activeFilter === "active" ? "true" : "false",
    page,
    limit: 10
  })

  const products = response?.data?.items || (response?.data as any)?.products || []
  const pagination = response?.data?.pagination

  const filters = [
    { id: "all", label: "Tất cả", count: activeFilter === "all" ? pagination?.total : undefined },
    { id: "active", label: "Đang hoạt động", count: activeFilter === "active" ? pagination?.total : undefined },
    { id: "inactive", label: "Không hoạt động", count: activeFilter === "inactive" ? pagination?.total : undefined },
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
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
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
              onClick={() => {
                setActiveFilter(filter.id)
                setPage(1)
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeFilter === filter.id
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted"
                }`}
            >
              {filter.label}
              {filter.count !== undefined && <span className="ml-2 opacity-70">({filter.count})</span>}
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
                    Định mức
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                    Cập nhật
                  </th>
                </tr>
              </thead>
              <tbody className="relative">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Đang tải dữ liệu...
                      </div>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      Không tìm thấy sản phẩm nào
                    </td>
                  </tr>
                ) : (
                  products.map((product: any) => {
                    const status = product.isActive ? statusConfig.active : statusConfig.inactive

                    return (
                      <tr
                        key={product._id}
                        className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => handleRowClick(product._id)}
                      >
                        <td className="px-6 py-4 font-medium text-primary">
                          {product.code}
                        </td>
                        <td className="px-6 py-4 text-card-foreground font-medium">
                          <div className="flex items-center gap-3">
                            {product.productImage && (
                              <div className="h-8 w-8 rounded overflow-hidden bg-muted flex-shrink-0 relative">
                                <Image src={product.productImage} alt={product.name} fill className="object-cover" />
                              </div>
                            )}
                            {product.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground truncate max-w-xs">
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
                          {product.estimateMaterialCost?.length || 0} vật tư
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {product.updatedAt ? format(new Date(product.updatedAt), "dd/MM/yyyy") : "N/A"}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
              <div className="text-sm text-muted-foreground">
                Hiển thị {(page - 1) * 10 + 1} - {Math.min(page * 10, pagination.total)} trong tổng số {pagination.total}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}


