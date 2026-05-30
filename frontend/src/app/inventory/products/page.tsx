'use client'

import { WarehouseInventoryPage } from '@/features/inventory/components/warehouse-inventory-page'

export default function InventoryProductsPage() {
  return (
    <WarehouseInventoryPage
      mode="products"
      title="Tồn kho thành phẩm"
      subtitle="Giao diện kho hàng dùng chung theo vai trò"
    />
  )
}

