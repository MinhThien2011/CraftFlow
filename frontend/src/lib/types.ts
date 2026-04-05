// Types for CRAFTFLOW - Yarn Craft Management System

export type MaterialCategory = "Len" | "Phụ kiện" | "Dụng cụ"
export type MaterialUnit = "cuộn" | "gram" | "cái" | "bộ" | "mét" | "hộp"
export type StockStatus = "Good" | "Low Stock" | "Critical"
export type ProductionStatus = "Đang sản xuất" | "Hoàn thành" | "Chờ nguyên liệu" | "Tạm dừng"
export type UserRole = "Admin" | "Staff"
export type SystemUserRole = "Admin" | "Warehouse" | "Staff"
export type UserStatus = "Hoạt động" | "Vô hiệu hóa"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
}

export interface SystemUser {
  id: string
  name: string
  email: string
  role: SystemUserRole
  status: UserStatus
  workload?: number // Percentage 0-100, only for Staff
  createdAt: string
}

export interface Material {
  id: string
  name: string
  supplier: string
  category: MaterialCategory
  currentStock: number
  minStock: number
  unit: MaterialUnit
  unitPrice: number
  status: StockStatus
  color?: string
  lastUpdated: string
}

export interface ImportHistory {
  id: string
  materialId: string
  materialName: string
  quantity: number
  unit: MaterialUnit
  unitPrice: number
  totalPrice: number
  supplier: string
  importDate: string
  note?: string
}

export interface Product {
  id: string
  name: string
  description: string
  category: string
  basePrice: number
  suggestedPrice?: number
  image?: string
  createdAt: string
}

export interface BOMItem {
  materialId: string
  materialName: string
  quantity: number
  unit: MaterialUnit
}

export interface BOM {
  id: string
  productId: string
  productName: string
  items: BOMItem[]
  totalCost: number
  createdAt: string
  updatedAt: string
}

export interface ProductionOrder {
  id: string
  productId: string
  productName: string
  quantity: number
  status: ProductionStatus
  startDate: string
  expectedDate: string
  completedDate?: string
  completedQuantity: number
  note?: string
}

export interface StockAlert {
  id: string
  materialId: string
  materialName: string
  currentStock: number
  minStock: number
  unit: MaterialUnit
  status: "Low Stock" | "Critical"
  createdAt: string
}

export interface Activity {
  id: string
  type: "production" | "import" | "alert" | "product"
  title: string
  description: string
  timestamp: string
}

export interface DashboardStats {
  totalMaterials: number
  materialsChange: number
  inProduction: number
  productionChange: number
  completedProducts: number
  completedChange: number
  stockAlerts: number
  alertsChange: number
}

export interface MonthlyProduction {
  month: string
  produced: number
  target: number
}

export interface MaterialConsumption {
  name: string
  value: number
  color: string
}
