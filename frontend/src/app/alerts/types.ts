export interface Material {
  _id: string
  name: string
  code: string
  unit: string
  currentStock: number
  threshold: number
  price: number
  supplier?: { name: string }
  alertId?: string
  alertType?: 'low_stock' | 'order_requirement'
  productionOrder?: any
  shortageQuantity?: number
}