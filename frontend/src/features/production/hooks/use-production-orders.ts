import { useProductionOrders, useCreateProductionOrder } from './use-production'
import { useProducts } from './use-products'
import { useState, useMemo } from 'react'

export function useProductionOrdersModule() {
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Form state
  const [selectedItems, setSelectedItems] = useState<{ productId: string, quantity: string }[]>([
    { productId: "", quantity: "" }
  ])
  const [deadline, setDeadline] = useState("")
  const [note, setNote] = useState("")

  const addProductItem = () => {
    setSelectedItems([...selectedItems, { productId: "", quantity: "" }])
  }

  const removeProductItem = (index: number) => {
    if (selectedItems.length > 1) {
      setSelectedItems(selectedItems.filter((_, i) => i !== index))
    }
  }

  const updateProductItem = (index: number, field: 'productId' | 'quantity', value: string) => {
    const newItems = [...selectedItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setSelectedItems(newItems)
  }

  // Fetch orders
  const { data: ordersResponse, isLoading, isError, refetch } = useProductionOrders({
    status: activeFilter === "all" ? undefined : activeFilter,
    search: searchQuery,
  })

  // Fetch products for create modal
  const { data: productsResponse } = useProducts({ isActive: true, limit: 100 })
  const products = useMemo(() => productsResponse?.data?.products || productsResponse?.data?.items || [], [productsResponse])

  const createMutation = useCreateProductionOrder()

  const orders = useMemo(() => ordersResponse?.data?.orders || [], [ordersResponse])

  const resetForm = () => {
    setSelectedItems([{ productId: "", quantity: "" }])
    setDeadline("")
    setNote("")
  }

  const handleCreateOrder = async () => {
    const validItems = selectedItems.filter(item => item.productId && Number(item.quantity) > 0)
    if (validItems.length === 0 || !deadline) return

    createMutation.mutate({
      products: validItems.map(item => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      })),
      deadline: new Date(deadline).toISOString(),
      notes: note,
      priority: 'medium' // Default priority
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
    selectedItems,
    addProductItem,
    removeProductItem,
    updateProductItem,
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
