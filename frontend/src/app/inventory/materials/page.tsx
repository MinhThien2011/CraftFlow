'use client'

import { WarehouseInventoryPage } from '@/features/inventory/components/warehouse-inventory-page'

export default function InventoryMaterialsPage() {
  return (
    <WarehouseInventoryPage
      mode="materials"
      title="Tồn kho nguyên vật liệu"
      subtitle="Giao diện kho hàng dùng chung theo vai trò"
    />
  )
}

