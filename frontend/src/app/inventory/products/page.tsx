'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { Download, Plus, AlertTriangle, QrCode } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InventoryStats } from '@/features/inventory/components/inventory-stats'
import { InventoryTable } from '@/features/inventory/components/inventory-table'
import { InventoryFilters } from '@/features/inventory/components/inventory-filters'
import { useInventoryProducts } from '@/features/inventory/hooks/use-inventory-products'
import { Product } from '@/lib/types'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { QRScanner } from "@/features/receiving/components/qr-scanner"
import { TransactionHistoryDialog } from "@/components/shared/transaction-history-dialog"

export default function InventoryProductsPage() {
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [historyItem, setHistoryItem] = useState<Product | null>(null)
  const {
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    isLoading,
    isError,
    products,
    stats,
    categories,
    refetch
  } = useInventoryProducts()

  // Modal Handlers
  const handleView = (product: any) => {
    setHistoryItem(product)
  }

  const handleEdit = (product: any) => {
    toast.info(`Đang chỉnh sửa sản phẩm: ${product.name}`)
  }

  const handleAdd = () => {
    toast.info("Thêm mới sản phẩm")
  }

  const handleExport = () => {
    toast.success("Đang chuẩn bị dữ liệu xuất Excel...")
  }

  const handleScanSuccess = (data: any) => {
    const code = data?.code || data?.id || (typeof data === 'string' ? data : '')
    if (code) {
      setSearchTerm(code)
      toast.success(`Đã quét mã: ${code}`)
    }
  }

  if (isError) {
    return (
      <AppShell title="Tồn kho sản phẩm">
        <div className="flex flex-col items-center justify-center h-64 text-destructive gap-4">
          <AlertTriangle className="size-12" />
          <p>Đã xảy ra lỗi khi tải dữ liệu tồn kho sản phẩm. Vui lòng thử lại sau.</p>
          <Button variant="outline" onClick={() => refetch()}>Thử lại</Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Tồn kho sản phẩm" subtitle="Quản lý tồn kho sản phẩm thành phẩm realtime">
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
              <CardTitle className="text-lg font-semibold">Danh sách sản phẩm thành phẩm</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsScannerOpen(true)}>
                  <QrCode className="mr-2 size-4" /> Quét QR
                </Button>
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
                items={products}
                onView={handleView}
                onEdit={handleEdit}
                onHistory={(item) => setHistoryItem(item as Product)}
              />
            )}
          </CardContent>
        </Card>
      </div>
      <QRScanner
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScanSuccess={handleScanSuccess}
      />
      {historyItem && (
        <TransactionHistoryDialog
          open={!!historyItem}
          onOpenChange={(open) => !open && setHistoryItem(null)}
          itemId={historyItem._id}
          itemName={historyItem.name}
          itemType="product"
        />
      )}
    </AppShell>
  )
}
