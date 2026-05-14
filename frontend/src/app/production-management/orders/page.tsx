'use client'

import dynamic from 'next/dynamic'
import { DashboardLayout } from '@/features/production/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Plus, Search, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useProductionOrdersModule } from '@/features/production/hooks/use-production-orders'
import { withPermission } from '@/components/guards/permission-guard'

// Lazy load các components nặng để tối ưu initial load
const OrdersTable = dynamic(() => import('@/features/production/components/orders-table').then(m => m.OrdersTable), {
  ssr: false, loading: () => <div className="p-8 text-center text-muted-foreground animate-pulse">Đang tải danh sách đơn hàng...</div>
})
const CreateOrderModal = dynamic(() => import('@/features/production/components/create-order-modal').then(m => m.CreateOrderModal), {
  ssr: false
})

const filters = [
  { id: "all", label: "Tất cả" },
  { id: "pending", label: "Chờ xử lý" },
  { id: "in_production", label: "Đang thực hiện" },
  { id: "completed", label: "Hoàn thành" },
  { id: "cancelled", label: "Đã hủy" },
]

function OrdersPage() {
  const router = useRouter()
  const {
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    isCreateOpen,
    setIsCreateOpen,
    selectedItems,
    addProductItem,
    removeProductItem,
    updateProductItem,
    deadline,
    setDeadline,
    note,
    setNote,
    isLoading,
    isError,
    orders,
    products,
    createMutation,
    handleCreateOrder,
    refetch
  } = useProductionOrdersModule()

  if (isError) {
    return (
      <DashboardLayout title="Đơn sản xuất">
        <div className="flex flex-col items-center justify-center h-64 text-destructive gap-4">
          <AlertTriangle className="size-12" />
          <p>Đã xảy ra lỗi khi tải danh sách đơn hàng.</p>
          <Button variant="outline" onClick={() => refetch()}>Thử lại</Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Đơn sản xuất">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo mã đơn hoặc sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Tạo đơn mới
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeFilter === filter.id
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted"
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <Card className="bg-card border-border overflow-hidden">
          <OrdersTable
            orders={orders}
            isLoading={isLoading}
            onOrderClick={(id) => router.push(`/production-management/orders/${id}`)}
          />
        </Card>
      </div>

      <CreateOrderModal
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        products={products}
        selectedItems={selectedItems}
        onAddItem={addProductItem}
        onRemoveItem={removeProductItem}
        onUpdateItem={updateProductItem}
        deadline={deadline}
        onDeadlineChange={setDeadline}
        note={note}
        onNoteChange={setNote}
        onSubmit={handleCreateOrder}
        isSubmitting={createMutation.isPending}
      />
    </DashboardLayout>
  )
}

export default withPermission(OrdersPage, ['admin', 'production_manager'])
