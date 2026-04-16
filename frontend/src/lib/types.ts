// Types for CRAFTFLOW - Yarn Craft Management System

export type MaterialCategory = "Len" | "Phụ kiện" | "Dụng cụ"
export type MaterialUnit = "cuộn" | "gram" | "cái" | "bộ" | "mét" | "hộp"
export type StockStatus = "Ổn định" | "Sắp hết" | "Nguy cấp"
export type ProductionStatus = "Đang sản xuất" | "Hoàn thành" | "Chờ nguyên liệu" | "Tạm dừng"

export interface User {
  _id: string
  username: string
  email: string
  fullName: string
  phone: string
  role: string | { _id: string; roleName: string }
  isActive: boolean
  avatar?: string
  address?: string
  birthDate?: string
  birthDay?: string // API sometimes returns birthDay
  gender?: "male" | "female" | "other"
  maxDailyCapacity?: number
  currentAssignedQuantity?: number
  hasWarningFlag?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface UserListResponse {
  success: boolean
  message: string
  data: {
    users: User[]
    pagination: PaginationData
  }
}

export interface LoginResponse {
  success: boolean
  message: string
  data: {
    user: User
    accessToken?: string
  }
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface Supplier {
  name: string
  address?: string
  phone?: string
  email?: string
  contactPerson?: string
  notes?: string
}

export interface Material {
  _id: string
  name: string
  code: string
  unit: string
  color?: string
  price: number
  currency?: string
  currentStock: number
  threshold: number
  location?: string
  supplier: Supplier
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  stockLevel?: string
  id?: string
}

export interface MaterialCreateResponse {
  success: boolean
  message: string
  data: {
    material: Material
  }
}

export interface PaginationData {
  total: number
  page: number
  limit: number
  pages: number
}

export interface MaterialListResponse {
  success: boolean
  message: string
  data: {
    materials: Material[]
    pagination: PaginationData
  }
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
export interface ExportHistory {
  id: string
  productId: string
  productName: string
  quantity: number
  unit: MaterialUnit
  destination: string
  unitPrice: number
  totalPrice: number
  exportDate: string
  note?: string
}

export type SystemLogAction =
  | "LOGIN"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "CREATE_MATERIAL"
  | "UPDATE_MATERIAL"
  | "DELETE_MATERIAL"
  | "CREATE_IMPORT"
  | "APPROVE_IMPORT"
  | "STOCK_ADJUSTMENT"
  | "CREATE_PRODUCTION"
  | "UPDATE_SETTINGS"
  | "VIEW_REPORT"
  | "CREATE_USER"
  | "UPDATE_USER"
  | "DELETE_USER"
  | string

export type SystemLogModule =
  | "AUTH"
  | "USER"
  | "MATERIAL"
  | "INVENTORY"
  | "PRODUCTION"
  | "SYSTEM"
  | "ORDER"
  | string

export interface SystemLogAuthor {
  _id: string
  username: string
  fullName: string
  role?: { _id: string; roleName: string }
}

export interface SystemLog {
  _id: string
  author: SystemLogAuthor | null
  action: SystemLogAction
  module: SystemLogModule
  details: string
  targetId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

export interface SystemLogListResponse {
  success: boolean
  message: string
  data: {
    logs: SystemLog[]
    pagination: PaginationData
  }
}

export interface Product {
  id: any
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
  status: "Sắp hết" | "Nguy cấp"
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
