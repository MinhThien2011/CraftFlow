import { useMaterials } from './use-materials'
import { useMemo, useState } from 'react'

export function useInventoryMaterials() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data: response, isLoading, isError, refetch } = useMaterials({
    search: searchTerm,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
  })

  const materials = useMemo(() => response?.data?.materials || [], [response])

  const stats = useMemo(() => ({
    total: materials.length,
    normal: materials.filter((i) => i.stockLevel === 'Bình thường').length,
    low: materials.filter((i) => i.stockLevel === 'Sắp hết').length,
    critical: materials.filter((i) => i.stockLevel === 'Nguy cấp').length,
  }), [materials])

  const categories = useMemo(() => 
    Array.from(new Set(materials.map((i) => (i as any).category?.[0] || ''))).filter(Boolean)
  , [materials])

  const filteredMaterials = useMemo(() => 
    materials.filter((item) => statusFilter === 'all' || item.stockLevel === statusFilter)
  , [materials, statusFilter])

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
    refetch
  }
}
