'use client'

import { AppShell } from '@/components/app-shell'
import { Download, Plus, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InventoryStats } from '@/features/inventory/components/inventory-stats'
import { InventoryTable } from '@/features/inventory/components/inventory-table'
import { InventoryFilters } from '@/features/inventory/components/inventory-filters'
import { useInventoryMaterials } from '@/features/inventory/hooks/use-inventory-materials'
import { Material } from '@/lib/types'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

export default function InventoryMaterialsPage() {
  const {
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    isLoading,
    isError,
    materials,
    stats,
    categories,
    refetch
  } = useInventoryMaterials()

  // Modal Handlers
  const handleView = (material: Material) => {
    toast.info(`Đang xem chi tiết: ${material.name}`)
  }

  const handleEdit = (material: Material) => {
    toast.info(`Đang chỉnh sửa: ${material.name}`)
  }

  const handleAdd = () => {
    toast.info("Thêm mới nguyên vật liệu")
  }

  const handleExport = () => {
    toast.success("Đang chuẩn bị dữ liệu xuất Excel...")
  }

  if (isError) {
    return (
      <AppShell title="Tồn kho nguyên vật liệu">
        <div className="flex flex-col items-center justify-center h-64 text-destructive gap-4">
          <AlertTriangle className="size-12" />
          <p>Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.</p>
          <Button variant="outline" onClick={() => refetch()}>Thử lại</Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Tồn kho nguyên vật liệu" subtitle="Quản lý tồn kho realtime">
      <div className="space-y-6">

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : (
          <InventoryStats stats={stats} />
        )}

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-semibold">Danh sách nguyên vật liệu</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="mr-2 size-4" /> Xuất Excel
                </Button>
                <Button size="sm" onClick={handleAdd}>
                  <Plus className="mr-2 size-4" /> Thêm mới
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <InventoryFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              categories={categories}
            />

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <InventoryTable
                materials={materials}
                onView={handleView}
                onEdit={handleEdit}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
