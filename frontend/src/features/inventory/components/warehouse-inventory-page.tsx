'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Boxes,
  Download,
  Edit,
  Eye,
  History,
  MoreVertical,
  Package,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  TrendingDown,
} from 'lucide-react'
import { toast } from 'sonner'

import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { cn } from '@/lib/utils'
import { inventoryApi } from '@/api/inventory.api'
import type { InventoryOverview, InventoryTransaction, Material, PaginationData, Product } from '@/lib/types'
import { materialCategories, productCategories } from '@/lib/mock-data'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { QRScanner } from '@/features/receiving/components/qr-scanner'
import { ItemDetailDialog } from './item-detail-dialog'
import { TransactionHistoryDialog } from '@/components/shared/transaction-history-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDeleteMaterial } from '@/features/inventory/hooks/use-materials'
import { getItemStockLevelMeta } from '../utils/stock-level'

type InventoryTab = 'materials' | 'products' | 'history-import' | 'history-export'

type WarehouseInventoryPageProps = {
  mode: 'admin' | 'materials' | 'products'
  title: string
  subtitle: string
  enableMaterialManagement?: boolean
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="h-12 w-12 rounded-lg bg-muted animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
          <div className="h-6 w-16 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

function getLevelBadge(item: Material | Product) {
  const level = getItemStockLevelMeta(item)
  return (
    <Badge variant="outline" className={`${level.badgeClass} border shadow-none`}>
      {level.label}
    </Badge>
  )
}

function getLocation(item: Material | Product) {
  return item.locationDetails || item.shelf?.shelfCode || 'Chưa gán vị trí'
}

export function WarehouseInventoryPage({ mode, title, subtitle, enableMaterialManagement = false }: WarehouseInventoryPageProps) {
  const { user } = useAuth()
  const role = (typeof user?.role === 'string' ? user.role : user?.role?.roleName || '').toLowerCase()
  const isKhoManager = role === 'kho_manager'
  const isProductionManager = role === 'production_manager'

  const availableTabs: InventoryTab[] = useMemo(() => {
    if (mode === 'materials') return ['materials']
    if (mode === 'products') return ['products']
    return ['materials', 'products', 'history-import', 'history-export']
  }, [mode])

  const [activeTab, setActiveTab] = useState<InventoryTab>(availableTabs[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [overview, setOverview] = useState<InventoryOverview | null>(null)
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [materialHistory, setMaterialHistory] = useState<InventoryTransaction[]>([])
  const [productHistory, setProductHistory] = useState<InventoryTransaction[]>([])

  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<Material | Product | null>(null)
  const [historyItem, setHistoryItem] = useState<Material | Product | null>(null)


  const deleteMaterialMutation = useDeleteMaterial()

  const fetchOverview = useCallback(async () => {
    try {
      const response = await inventoryApi.getOverview()
      if (response.success) setOverview(response.data)
    } catch {
      // non-blocking
    }
  }, [])

  const wrapFetch = useCallback(async (fn: () => Promise<void>, skeleton = false) => {
    if (skeleton) setIsLoading(true)
    else setIsRefreshing(true)
    try {
      await fn()
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  const fetchMaterials = useCallback(
    async (skeleton = false) =>
      wrapFetch(async () => {
        const response = await inventoryApi.getMaterialsStock({
          search: searchQuery,
          category: selectedCategory,
          page: currentPage,
          limit: 10,
        })
        if (response.success && response.data) {
          setMaterials(response.data.items || [])
          setPagination(response.data.pagination)
        }
      }, skeleton),
    [currentPage, searchQuery, selectedCategory, wrapFetch]
  )

  const fetchProducts = useCallback(
    async (skeleton = false) =>
      wrapFetch(async () => {
        const response = await inventoryApi.getProductsStock({
          search: searchQuery,
          category: selectedCategory,
          page: currentPage,
          limit: 10,
        })
        if (response.success && response.data) {
          setProducts(response.data.items || [])
          setPagination(response.data.pagination)
        }
      }, skeleton),
    [currentPage, searchQuery, selectedCategory, wrapFetch]
  )

  const fetchImportHistory = useCallback(
    async (skeleton = false) =>
      wrapFetch(async () => {
        const response = await inventoryApi.getMaterialHistory({ page: currentPage, limit: 10, direction: 'in' })
        if (response.success && response.data) {
          setMaterialHistory(response.data.history || [])
          setPagination(response.data.pagination)
        }
      }, skeleton),
    [currentPage, wrapFetch]
  )

  const fetchExportHistory = useCallback(
    async (skeleton = false) =>
      wrapFetch(async () => {
        const response = await inventoryApi.getProductHistory({ page: currentPage, limit: 10, direction: 'out' })
        if (response.success && response.data) {
          setProductHistory(response.data.history || [])
          setPagination(response.data.pagination)
        }
      }, skeleton),
    [currentPage, wrapFetch]
  )

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'materials') fetchMaterials(materials.length === 0)
      else if (activeTab === 'products') fetchProducts(products.length === 0)
      else if (activeTab === 'history-import') fetchImportHistory(materialHistory.length === 0)
      else fetchExportHistory(productHistory.length === 0)
    }, 250)
    return () => clearTimeout(timer)
  }, [
    activeTab,
    fetchExportHistory,
    fetchImportHistory,
    fetchMaterials,
    fetchProducts,
    materialHistory.length,
    materials.length,
    productHistory.length,
    products.length,
  ])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, selectedCategory])

  const handleRefresh = () => {
    fetchOverview()
    if (activeTab === 'materials') fetchMaterials()
    else if (activeTab === 'products') fetchProducts()
    else if (activeTab === 'history-import') fetchImportHistory()
    else fetchExportHistory()
  }

  const categories = activeTab === 'materials' ? materialCategories : productCategories
  const canShowFilters = activeTab === 'materials' || activeTab === 'products'
  const canOpenDialogs = canShowFilters
  const canManageMaterial = enableMaterialManagement && isProductionManager && activeTab === 'materials'

  const handleDeleteMaterial = (material: Material) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa nguyên vật liệu "${material.name}" không?`)) return
    deleteMaterialMutation.mutate(material._id, {
      onSuccess: () => fetchMaterials(),
    })
  }

  return (
    <AppShell title={title} subtitle={subtitle}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-[#8B7355] to-[#4A7C23] bg-clip-text text-transparent">
              Quản lý kho hàng
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Theo dõi tồn kho và biến động theo vai trò</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
            {canOpenDialogs && (
              <>
                <Button variant="outline" onClick={() => setIsScannerOpen(true)}>
                  <QrCode className="mr-2 h-4 w-4" /> Quét QR
                </Button>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" /> Xuất Excel
                </Button>
              </>
            )}
            {!isKhoManager && !canManageMaterial && (
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Thêm mới
              </Button>
            )}
            {canManageMaterial && (
              <Button onClick={() => toast.info('Tạo mới nguyên vật liệu đang dùng quy trình riêng.')}>
                <Plus className="mr-2 h-4 w-4" /> Thêm nguyên liệu
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {!overview ? (
            Array(4).fill(0).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <Card><CardContent className="p-5"><div className="flex items-center gap-3"><Package className="h-5 w-5 text-[#8B7355]" /><div><p className="text-xs text-muted-foreground">Tổng nguyên liệu</p><p className="text-2xl font-bold">{overview.materials.totalItems}</p></div></div></CardContent></Card>
              <Card><CardContent className="p-5"><div className="flex items-center gap-3"><Boxes className="h-5 w-5 text-[#4A7C23]" /><div><p className="text-xs text-muted-foreground">Tổng thành phẩm</p><p className="text-2xl font-bold">{overview.products.totalItems}</p></div></div></CardContent></Card>
              <Card><CardContent className="p-5"><div className="flex items-center gap-3"><TrendingDown className="h-5 w-5 text-[#FFA500]" /><div><p className="text-xs text-muted-foreground">Sắp hết hàng</p><p className="text-2xl font-bold">{(overview.materials.lowStockItems || 0) + (overview.products.lowStockItems || 0)}</p></div></div></CardContent></Card>
              <Card><CardContent className="p-5"><div className="flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-[#DC3545]" /><div><p className="text-xs text-muted-foreground">Giá trị tồn kho</p><p className="text-xl font-bold"><CurrencyDisplay value={(overview.materials.totalValue || 0) + (overview.products.totalValue || 0)} /></p></div></div></CardContent></Card>
            </>
          )}
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-2">
          <div className="flex rounded-xl bg-muted/50 p-1 border border-muted">
            {availableTabs.includes('materials') && (
              <button onClick={() => setActiveTab('materials')} className={cn('rounded-lg px-4 py-2 text-sm font-semibold', activeTab === 'materials' ? 'bg-white shadow-sm' : 'text-muted-foreground')}>
                <span className="flex items-center gap-2"><Package className="h-4 w-4" /> Nguyên liệu</span>
              </button>
            )}
            {availableTabs.includes('products') && (
              <button onClick={() => setActiveTab('products')} className={cn('rounded-lg px-4 py-2 text-sm font-semibold', activeTab === 'products' ? 'bg-white shadow-sm' : 'text-muted-foreground')}>
                <span className="flex items-center gap-2"><Boxes className="h-4 w-4" /> Thành phẩm</span>
              </button>
            )}
            {availableTabs.includes('history-import') && (
              <button onClick={() => setActiveTab('history-import')} className={cn('rounded-lg px-4 py-2 text-sm font-semibold', activeTab === 'history-import' ? 'bg-white shadow-sm' : 'text-muted-foreground')}>
                <span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Lịch sử nhập</span>
              </button>
            )}
            {availableTabs.includes('history-export') && (
              <button onClick={() => setActiveTab('history-export')} className={cn('rounded-lg px-4 py-2 text-sm font-semibold', activeTab === 'history-export' ? 'bg-white shadow-sm' : 'text-muted-foreground')}>
                <span className="flex items-center gap-2"><History className="h-4 w-4" /> Lịch sử xuất</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm theo tên hoặc mã..." className="pl-9 h-11" />
            </div>
            {canShowFilters && (
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48 h-11">
                  <SelectValue placeholder="Tất cả danh mục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">Tất cả danh mục</SelectItem>
                  {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead>{activeTab === 'products' || activeTab === 'history-export' ? 'Thành phẩm' : 'Nguyên liệu'}</TableHead>
                  <TableHead>{activeTab === 'materials' ? 'Nhà cung cấp' : activeTab === 'products' ? 'Danh mục' : activeTab === 'history-import' ? 'Nguồn nhập' : 'Nơi xuất'}</TableHead>
                  <TableHead className="text-right">{activeTab.startsWith('history') ? 'Số lượng' : 'Tồn'}</TableHead>
                  {!activeTab.startsWith('history') && <TableHead className="text-right">Ngưỡng</TableHead>}
                  <TableHead className="text-right">Giá trị</TableHead>
                  <TableHead>{activeTab.startsWith('history') ? 'Ngày giao dịch' : 'Cập nhật'}</TableHead>
                  {!activeTab.startsWith('history') && <TableHead className="text-center">Trạng thái</TableHead>}
                  {(canOpenDialogs && canShowFilters) || canManageMaterial ? <TableHead className="text-right">Thao tác</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={activeTab.startsWith('history') ? 5 : 8} className="h-24 text-center">Đang tải...</TableCell></TableRow>
                ) : activeTab === 'materials' ? (
                  materials.length === 0 ? <TableRow><TableCell colSpan={8} className="h-24 text-center">Không có dữ liệu</TableCell></TableRow> :
                    materials.map((m) => (
                      <TableRow key={m._id}>
                        <TableCell><div className="font-bold text-[15px] text-foreground">{m.name}<div className="text-xs text-muted-foreground font-medium mt-0.5">{m.code} • {getLocation(m)}</div></div></TableCell>
                        <TableCell>{m.supplier?.name || 'N/A'}</TableCell>
                        <TableCell className="text-right font-medium">{m.currentStock}</TableCell>
                        <TableCell className="text-right font-medium">{m.threshold}</TableCell>
                        <TableCell className="text-right font-medium"><CurrencyDisplay value={(m.currentStock || 0) * (m.price || 0)} /></TableCell>
                        <TableCell>{m.updatedAt ? new Date(m.updatedAt).toLocaleDateString('vi-VN') : 'N/A'}</TableCell>
                        <TableCell className="text-center">{getLevelBadge(m)}</TableCell>
                        {(canOpenDialogs || canManageMaterial) && (
                          <TableCell className="text-right">
                            {canManageMaterial ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setDetailItem(m)} className="gap-2">
                                    <Eye className="h-4 w-4 text-blue-600" /> Xem chi tiết
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setDetailItem(m)} className="gap-2">
                                    <Edit className="h-4 w-4 text-amber-600" /> Chỉnh sửa
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteMaterial(m)}
                                    className="gap-2 text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" /> Xóa
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <div className="flex justify-end gap-1">
                                <Button size="icon" variant="ghost" onClick={() => setDetailItem(m)}><Eye className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => setHistoryItem(m)}><History className="h-4 w-4" /></Button>
                              </div>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                ) : activeTab === 'products' ? (
                  products.length === 0 ? <TableRow><TableCell colSpan={8} className="h-24 text-center">Không có dữ liệu</TableCell></TableRow> :
                    products.map((p) => (
                      <TableRow key={p._id}>
                        <TableCell><div className="font-bold text-[15px] text-foreground">{p.name}<div className="text-xs text-muted-foreground font-medium mt-0.5">{p.code} • {getLocation(p)}</div></div></TableCell>
                        <TableCell>{p.category}</TableCell>
                        <TableCell className="text-right font-medium">{p.currentStock}</TableCell>
                        <TableCell className="text-right font-medium">{p.threshold}</TableCell>
                        <TableCell className="text-right font-medium"><CurrencyDisplay value={(p.currentStock || 0) * (p.baseCost || 0)} /></TableCell>
                        <TableCell>{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('vi-VN') : 'N/A'}</TableCell>
                        <TableCell className="text-center">{getLevelBadge(p)}</TableCell>
                        {canOpenDialogs && <TableCell className="text-right"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => setDetailItem(p)}><Eye className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setHistoryItem(p)}><History className="h-4 w-4" /></Button></div></TableCell>}
                      </TableRow>
                    ))
                ) : activeTab === 'history-import' ? (
                  materialHistory.length === 0 ? <TableRow><TableCell colSpan={5} className="h-24 text-center">Không có dữ liệu</TableCell></TableRow> :
                    materialHistory.map((h) => (
                      <TableRow key={h._id}>
                        <TableCell className="font-bold text-[15px] text-foreground">{h.material?.name || 'N/A'}</TableCell>
                        <TableCell>{h.sender || h.material?.supplier?.name || 'N/A'}</TableCell>
                        <TableCell className="text-right font-medium">{h.quantity}</TableCell>
                        <TableCell className="text-right font-medium"><CurrencyDisplay value={Math.abs((h.quantity || 0) * (h.material?.price || 0))} /></TableCell>
                        <TableCell>{new Date(h.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                      </TableRow>
                    ))
                ) : (
                  productHistory.length === 0 ? <TableRow><TableCell colSpan={5} className="h-24 text-center">Không có dữ liệu</TableCell></TableRow> :
                    productHistory.map((h) => (
                      <TableRow key={h._id}>
                        <TableCell className="font-bold text-[15px] text-foreground">{h.product?.name || 'N/A'}</TableCell>
                        <TableCell>{h.receiver || h.customer || 'N/A'}</TableCell>
                        <TableCell className="text-right font-medium">{h.quantity}</TableCell>
                        <TableCell className="text-right font-medium"><CurrencyDisplay value={Math.abs((h.quantity || 0) * (h.product?.baseCost || 0))} /></TableCell>
                        <TableCell>{new Date(h.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <p className="text-sm text-muted-foreground">Trang {pagination.page}/{pagination.pages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>Trước</Button>
                  <Button variant="outline" size="sm" disabled={currentPage >= pagination.pages} onClick={() => setCurrentPage((p) => p + 1)}>Sau</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {canOpenDialogs && (
        <>
          <QRScanner open={isScannerOpen} onOpenChange={setIsScannerOpen} onScanSuccess={(data: any) => {
            const code = data?.code || data?.id || (typeof data === 'string' ? data : '')
            if (code) {
              setSearchQuery(code)
              toast.success(`Đã quét mã: ${code}`)
            }
          }} />

          {historyItem && (
            <TransactionHistoryDialog
              open={!!historyItem}
              onOpenChange={(open) => !open && setHistoryItem(null)}
              itemId={historyItem._id}
              itemName={historyItem.name}
              itemType={activeTab === 'products' ? 'product' : 'material'}
            />
          )}
        </>
      )}

      <ItemDetailDialog
        item={detailItem}
        open={!!detailItem}
        onOpenChange={(open) => !open && setDetailItem(null)}
        type={activeTab === 'products' ? 'product' : 'material'}
        canEditMaterial={canManageMaterial}
        onMaterialUpdated={() => {
          fetchMaterials()
          fetchOverview()
        }}
      />
    </AppShell>
  )
}
