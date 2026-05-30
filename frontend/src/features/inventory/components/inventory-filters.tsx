'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { INVENTORY_STATUS_OPTIONS, StockFilterKey } from '../utils/stock-level'

interface InventoryFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  categoryFilter: string
  onCategoryChange: (value: string) => void
  statusFilter: StockFilterKey
  onStatusChange: (value: StockFilterKey) => void
  categories: string[]
  statusOptions?: Array<{ value: StockFilterKey; label: string }>
}

export function InventoryFilters({
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  statusFilter,
  onStatusChange,
  categories,
  statusOptions = INVENTORY_STATUS_OPTIONS,
}: InventoryFiltersProps) {
  return (
    <div className="flex flex-col gap-4 mb-6 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Tìm theo mã hoặc tên..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={categoryFilter} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-44"><SelectValue placeholder="Danh mục" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả danh mục</SelectItem>
          {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={(value) => onStatusChange(value as StockFilterKey)}>
        <SelectTrigger className="w-44"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
