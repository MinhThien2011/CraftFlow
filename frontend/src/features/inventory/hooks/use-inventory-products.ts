import { useProductsStock } from './use-inventory'
import { useMemo, useState } from 'react'
import { getItemStockLevelKey, INVENTORY_STATUS_OPTIONS, StockFilterKey } from '../utils/stock-level'

export function useInventoryProducts() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StockFilterKey>('all')

  const { data: response, isLoading, isError, refetch } = useProductsStock({
    search: searchTerm,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
  })

  const products = useMemo(() => response?.data?.items || [], [response])

  const stats = useMemo(() => ({
    total: products.length,
    normal: products.filter((i) => getItemStockLevelKey(i) === 'normal').length,
    low: products.filter((i) => getItemStockLevelKey(i) === 'low').length,
    critical: products.filter((i) => {
      const level = getItemStockLevelKey(i)
      return level === 'critical' || level === 'out_of_stock'
    }).length,
  }), [products])

  const categories = useMemo(() =>
    Array.from(new Set(products.map((i) => (i as any).category || ''))).filter(Boolean)
  , [products])

  const filteredProducts = useMemo(() =>
    products.filter((item) => statusFilter === 'all' || getItemStockLevelKey(item) === statusFilter)
  , [products, statusFilter])

  const statusOptions = useMemo(() => INVENTORY_STATUS_OPTIONS, [])

  return {
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    isLoading,
    isError,
    products: filteredProducts,
    stats,
    categories,
    statusOptions,
    refetch
  }
}
