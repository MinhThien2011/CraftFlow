'use client'

import { WarehouseInventoryPage } from '@/features/inventory/components/warehouse-inventory-page'

export default function InventoryPage() {
  return (
    <WarehouseInventoryPage
      mode="admin"
      title="Kho hàng"
      subtitle="Quản lý tồn kho nguyên vật liệu và thành phẩm"
    />
  )
}

