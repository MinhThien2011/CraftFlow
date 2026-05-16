export interface AlertItem {
  _id: string
  name: string
  code: string
  unit: string
  currentStock: number
  threshold: number
  price: number
  supplier?: { name: string }
  alertId?: string
  alertType?: 'low_stock' | 'order_requirement' | 'product_low_stock'
  productionOrder?: any
  shortageQuantity?: number
  itemType?: 'material' | 'product'
}

export type Material = AlertItem;
