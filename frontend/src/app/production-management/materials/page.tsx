'use client'

import { WarehouseInventoryPage } from '@/features/inventory/components/warehouse-inventory-page'

export default function ManageMaterialsPage() {
  return (
    <WarehouseInventoryPage
      mode="materials"
      title="Quản lý nguyên vật liệu"
      subtitle="Quản lý danh mục và thông tin nguyên vật liệu sản xuất"
      enableMaterialManagement
    />
  )
}

