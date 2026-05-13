"use client"

import { useState, useCallback } from "react"
import {
  Package,
  Plus,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Loader2,
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useMaterials, useDeleteMaterial } from "@/features/inventory/hooks/use-materials"
import type { Material } from "@/lib/types"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { cn } from "@/lib/utils"

const STATUS_COLOR: Record<string, string> = {
    'Bình thường': 'bg-emerald-100 text-emerald-700',
    'Sắp hết': 'bg-amber-100 text-amber-700',
    'Nguy cấp': 'bg-red-100 text-red-700',
    'Tồn dư': 'bg-blue-100 text-blue-700',
}

export default function ManageMaterialsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const { data: response, isLoading, isError, refetch } = useMaterials({
    limit: itemsPerPage,
    page: currentPage,
    search: searchTerm,
    category: categoryFilter === "all" ? undefined : categoryFilter,
  })

  const deleteMutation = useDeleteMaterial()

  const materials = response?.data?.materials || []
  const pagination = response?.data?.pagination || { total: 0, pages: 1 }

  const handleRefresh = () => {
    refetch()
    toast.info("Đang cập nhật dữ liệu...")
  }

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa nguyên vật liệu này?")) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <AppShell
      title="Quản lý nguyên vật liệu"
      subtitle="Quản lý danh mục và thông tin nguyên vật liệu sản xuất"
    >
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm mã hoặc tên vật liệu..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả danh mục</SelectItem>
                <SelectItem value="Vải">Vải</SelectItem>
                <SelectItem value="Phụ kiện">Phụ kiện</SelectItem>
                <SelectItem value="Chỉ khâu">Chỉ khâu</SelectItem>
                <SelectItem value="Bông">Bông</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Thêm nguyên liệu
            </Button>
          </div>
        </div>

        {/* Materials Table */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Danh sách nguyên vật liệu
            </CardTitle>
            <CardDescription>
              Tổng số {pagination.total} nguyên vật liệu trong hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Spinner />
              </div>
            ) : isError ? (
              <div className="flex h-64 flex-col items-center justify-center text-destructive gap-2">
                <AlertTriangle className="h-10 w-10" />
                <p>Không thể tải dữ liệu nguyên vật liệu</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Thử lại
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Mã NVL</TableHead>
                      <TableHead>Tên nguyên vật liệu</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead>Đơn vị</TableHead>
                      <TableHead>Tồn kho</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                          Không tìm thấy nguyên vật liệu nào
                        </TableCell>
                      </TableRow>
                    ) : (
                      materials.map((material) => (
                        <TableRow key={material._id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-mono text-xs font-bold text-primary">
                            {material.code}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{material.name}</span>
                              <span className="text-xs text-muted-foreground line-clamp-1">
                                {material.description || "Không có mô tả"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-normal">
                              {(material as any).category?.[0] || "Chưa phân loại"}
                            </Badge>
                          </TableCell>
                          <TableCell>{material.unit}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className={cn(
                                "font-bold",
                                material.currentStock <= material.threshold ? "text-destructive" : "text-foreground"
                              )}>
                                {material.currentStock.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                Ngưỡng: {material.threshold}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "border-none shadow-none text-[10px] font-bold",
                              STATUS_COLOR[material.stockLevel || 'Bình thường']
                            )}>
                              {material.stockLevel || 'Bình thường'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="gap-2">
                                  <Edit className="h-4 w-4 text-amber-600" /> Chỉnh sửa
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2">
                                  <ExternalLink className="h-4 w-4 text-blue-600" /> Xem chi tiết
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="gap-2 text-destructive focus:text-destructive"
                                  onClick={() => handleDelete(material._id)}
                                >
                                  <Trash2 className="h-4 w-4" /> Xóa
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {!isLoading && !isError && pagination.pages > 1 && (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Trước
            </Button>
            <div className="text-sm font-medium">
              Trang {currentPage} / {pagination.pages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
              disabled={currentPage === pagination.pages}
            >
              Sau
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
