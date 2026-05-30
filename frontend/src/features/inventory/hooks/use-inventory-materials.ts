import { useMaterials } from './use-materials'
import { useMemo, useState } from 'react'
import { getItemStockLevelKey, INVENTORY_STATUS_OPTIONS, StockFilterKey } from '../utils/stock-level'

export function useInventoryMaterials() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StockFilterKey>('all')

  const { data: response, isLoading, isError, refetch } = useMaterials({
    search: searchTerm,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
  })

  const materials = useMemo(() => response?.data?.materials || [], [response])

  const stats = useMemo(() => ({
    total: materials.length,
    normal: materials.filter((i) => getItemStockLevelKey(i) === 'normal').length,
    low: materials.filter((i) => getItemStockLevelKey(i) === 'low').length,
    critical: materials.filter((i) => {
      const level = getItemStockLevelKey(i)
      return level === 'critical' || level === 'out_of_stock'
    }).length,
  }), [materials])

  const categories = useMemo(() =>
    Array.from(new Set(materials.map((i) => (i as any).category?.[0] || ''))).filter(Boolean)
  , [materials])

  const filteredMaterials = useMemo(() =>
    materials.filter((item) => statusFilter === 'all' || getItemStockLevelKey(item) === statusFilter)
  , [materials, statusFilter])

  const statusOptions = useMemo(
    () => INVENTORY_STATUS_OPTIONS.filter((option) => option.value !== 'out_of_stock'),
    []
  )

  return {
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    isLoading,
    isError,
    materials: filteredMaterials,
    stats,
    categories,
    statusOptions,
    refetch
  }
}
