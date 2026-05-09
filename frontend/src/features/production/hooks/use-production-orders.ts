import { useProductionOrders, useCreateProductionOrder } from './use-production'
import { useProducts } from './use-products'
import { useState, useMemo } from 'react'

export function useProductionOrdersModule() {
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  
  // Form state
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState("")
  const [deadline, setDeadline] = useState("")
  const [note, setNote] = useState("")

  // Fetch orders
  const { data: ordersResponse, isLoading, isError, refetch } = useProductionOrders({
    status: activeFilter === "all" ? undefined : activeFilter,
    search: searchQuery,
  })

  // Fetch products for create modal
  const { data: productsResponse } = useProducts({ isActive: true, limit: 100 })
  const products = productsResponse?.data?.items || []

  const createMutation = useCreateProductionOrder()

  const orders = useMemo(() => ordersResponse?.data?.items || [], [ordersResponse])

  const resetForm = () => {
    setSelectedProduct("")
    setQuantity("")
    setDeadline("")
    setNote("")
  }

  const handleCreateOrder = async () => {
    if (!selectedProduct || !quantity || Number(quantity) <= 0) return

    createMutation.mutate({
      productId: selectedProduct,
      quantity: Number(quantity),
      deadline,
      notes: note,
    }, {
      onSuccess: () => {
        setIsCreateOpen(false)
        resetForm()
      }
    })
  }

  return {
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    isCreateOpen,
    setIsCreateOpen,
    selectedProduct,
    setSelectedProduct,
    quantity,
    setQuantity,
    deadline,
    setDeadline,
    note,
    setNote,
    isLoading,
    isError,
    orders,
    products,
    createMutation,
    handleCreateOrder,
    refetch
  }
}
