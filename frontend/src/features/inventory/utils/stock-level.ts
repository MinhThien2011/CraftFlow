export type StockLevelKey = 'out_of_stock' | 'critical' | 'low' | 'normal' | 'overstock'

export type StockFilterKey = 'all' | StockLevelKey

type StockTrackedItem = {
  currentStock?: number | null
  threshold?: number | null
  stockLevel?: string
}

type StockLevelMeta = {
  key: StockLevelKey
  label: string
  badgeClass: string
}

const STOCK_LEVEL_META: Record<StockLevelKey, StockLevelMeta> = {
  out_of_stock: {
    key: 'out_of_stock',
    label: 'Hết hàng',
    badgeClass: 'bg-red-200 text-red-800 border-red-300',
  },
  critical: {
    key: 'critical',
    label: 'Nguy cấp',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
  },
  low: {
    key: 'low',
    label: 'Sắp hết',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  normal: {
    key: 'normal',
    label: 'Bình thường',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  overstock: {
    key: 'overstock',
    label: 'Tồn dư',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
  },
}

const STOCK_LEVEL_ALIASES: Record<string, StockLevelKey> = {
  out_of_stock: 'out_of_stock',
  outofstock: 'out_of_stock',
  'hết hàng': 'out_of_stock',

  critical: 'critical',
  'nguy cấp': 'critical',

  low: 'low',
  'sắp hết': 'low',

  normal: 'normal',
  'bình thường': 'normal',
  'ổn định': 'normal',

  overstock: 'overstock',
  'tồn dư': 'overstock',
}

const normalizeText = (value?: string) =>
  (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

export const getStockLevelKey = (value?: string): StockLevelKey => {
  const raw = (value || '').trim().toLowerCase()
  if (STOCK_LEVEL_ALIASES[raw]) return STOCK_LEVEL_ALIASES[raw]

  const normalized = normalizeText(value)
  return STOCK_LEVEL_ALIASES[normalized] || 'normal'
}

export const getStockLevelMeta = (value?: string): StockLevelMeta =>
  STOCK_LEVEL_META[getStockLevelKey(value)]

export const getCalculatedStockLevelKey = (
  currentStock?: number | null,
  threshold?: number | null
): StockLevelKey => {
  const stock = Number(currentStock || 0)
  const minimum = Number(threshold || 0)

  if (stock <= 0) return 'out_of_stock'
  if (stock <= minimum * 0.25) return 'critical'
  if (stock <= minimum) return 'low'
  if (stock >= minimum * 10) return 'overstock'

  return 'normal'
}

export const getItemStockLevelKey = (item: StockTrackedItem): StockLevelKey => {
  const calculatedLevel = getCalculatedStockLevelKey(item.currentStock, item.threshold)
  const providedLevel = getStockLevelKey(item.stockLevel)

  return item.stockLevel && providedLevel === calculatedLevel ? providedLevel : calculatedLevel
}

export const getItemStockLevelMeta = (item: StockTrackedItem): StockLevelMeta =>
  STOCK_LEVEL_META[getItemStockLevelKey(item)]

export const INVENTORY_STATUS_OPTIONS: Array<{ value: StockFilterKey; label: string }> = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'out_of_stock', label: 'Hết hàng' },
  { value: 'critical', label: 'Nguy cấp' },
  { value: 'low', label: 'Sắp hết' },
  { value: 'normal', label: 'Bình thường' },
  { value: 'overstock', label: 'Tồn dư' },
]
