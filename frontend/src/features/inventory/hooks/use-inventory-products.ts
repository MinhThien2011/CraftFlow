import { useProductsStock } from './use-inventory'
import { useMemo, useState } from 'react'

export function useInventoryProducts() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data: response, isLoading, isError, refetch } = useProductsStock({
    search: searchTerm,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
  })

  const products = useMemo(() => response?.data?.items || [], [response])

  const stats = useMemo(() => ({
    total: products.length,
    normal: products.filter((i) => (i as any).stockLevel === 'Bình thường').length,
    low: products.filter((i) => (i as any).stockLevel === 'Sắp hết').length,
    critical: products.filter((i) => (i as any).stockLevel === 'Nguy cấp').length,
  }), [products])

  const categories = useMemo(() => 
    Array.from(new Set(products.map((i) => (i as any).category || ''))).filter(Boolean)
  , [products])

  const filteredProducts = useMemo(() => 
    products.filter((item) => statusFilter === 'all' || (item as any).stockLevel === statusFilter)
  , [products, statusFilter])

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
    refetch
  }
}
