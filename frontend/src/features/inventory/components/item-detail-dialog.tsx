'use client'

import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Box, FileText, Layers, MapPin, Package, Tag, Warehouse } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { materialApi } from '@/api/material.api'
import { productApi } from '@/api/product.api'
import { Material, Product } from '@/lib/types'
import { getItemStockLevelMeta } from '../utils/stock-level'
import { useShelves } from '../hooks/use-shelves'
import { useUpdateMaterial } from '../hooks/use-materials'

interface ItemDetailDialogProps {
  item: Material | Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'material' | 'product'
  canEditMaterial?: boolean
  onMaterialUpdated?: () => void
}

const fallbackImage = 'https://res.cloudinary.com/dvjop6kew/image/upload/v1775898313/products/akyfj6xpovcyhaupebmb.jpg'

export function ItemDetailDialog({
  item,
  open,
  onOpenChange,
  type,
  canEditMaterial = false,
  onMaterialUpdated,
}: ItemDetailDialogProps) {
  const itemId = item?._id
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<any>({})
  const updateMaterialMutation = useUpdateMaterial()
  const { data: shelvesResponse } = useShelves()
  const shelves = useMemo(() => shelvesResponse?.data || [], [shelvesResponse])

  const { data: detailData, isFetching } = useQuery({
    queryKey: ['inventory-item-detail', type, itemId],
    enabled: open && !!itemId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!itemId) return null
      if (type === 'product') {
        const response = await productApi.getProductById(itemId)
        return response.data?.product ?? null
      }
      const response = await materialApi.getMaterialById(itemId)
      return response.data ?? null
    },
  })

  const detail = (detailData || item) as Material | Product | null

  const materialDetail = type === 'material' ? (detail as Material) : null

  useEffect(() => {
    if (!open || type !== 'material' || !materialDetail) return
    setIsEditing(false)
    setDraft({
      name: materialDetail.name || '',
      barcode: (materialDetail as any).barcode || '',
      unit: materialDetail.unit || '',
      color: materialDetail.color || '',
      price: materialDetail.price || 0,
      threshold: materialDetail.threshold || 0,
      shelf: materialDetail.shelf?._id || '',
      locationDetails: materialDetail.locationDetails || '',
      description: materialDetail.description || '',
      supplier: {
        name: materialDetail.supplier?.name || '',
        phone: materialDetail.supplier?.phone || '',
        email: materialDetail.supplier?.email || '',
        address: materialDetail.supplier?.address || '',
        contactPerson: materialDetail.supplier?.contactPerson || '',
        notes: materialDetail.supplier?.notes || '',
      },
    })
  }, [open, type, materialDetail?._id])

  if (!detail) return null

  const stock = getItemStockLevelMeta(detail)
  const isLowStock = stock.key === 'out_of_stock' || stock.key === 'critical' || stock.key === 'low'
  const isProduct = type === 'product'
  const stockGap = detail.currentStock - detail.threshold
  const stockGapLabel = stockGap < 0 ? 'Thiếu so với ngưỡng' : stockGap > 0 ? 'Dư so với ngưỡng' : 'Bằng ngưỡng tối thiểu'
  const canEdit = canEditMaterial && type === 'material' && !!materialDetail?._id

  const updateSupplier = (field: string, value: string) => {
    setDraft((prev: any) => ({
      ...prev,
      supplier: {
        ...(prev.supplier || {}),
        [field]: value,
      },
    }))
  }

  const handleSave = () => {
    if (!materialDetail?._id) return
    const payload: any = {
      name: String(draft.name || '').trim(),
      barcode: String(draft.barcode || '').trim(),
      unit: String(draft.unit || '').trim(),
      color: String(draft.color || '').trim(),
      price: Number(draft.price || 0),
      threshold: Number(draft.threshold || 0),
      shelf: draft.shelf || null,
      locationDetails: String(draft.locationDetails || '').trim(),
      description: String(draft.description || '').trim(),
      supplier: draft.supplier || {},
    }

    updateMaterialMutation.mutate(
      { id: materialDetail._id, data: payload },
      {
        onSuccess: () => {
          setIsEditing(false)
          onMaterialUpdated?.()
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="5xl"
        className="!max-w-[1200px] w-[calc(100vw-2rem)] overflow-hidden p-0 bg-background/95 backdrop-blur-xl"
      >
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent -z-10" />

        <DialogHeader className="p-6 pb-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="size-20 rounded-2xl border bg-card shadow-sm overflow-hidden shrink-0">
                {isProduct ? (
                  <Image
                    src={((detail as Product).productImage || fallbackImage)}
                    alt={detail.name}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package className="size-9 text-muted-foreground/60" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <DialogTitle className="text-2xl font-bold leading-tight">{detail.name}</DialogTitle>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Tag className="size-4" />
                    <span className="font-medium uppercase tracking-wide">{detail.code}</span>
                  </span>
                  <span>•</span>
                  <span>{isProduct ? 'Thành phẩm' : 'Nguyên vật liệu'}</span>
                  {isFetching && <span>• Đang đồng bộ chi tiết...</span>}
                </div>
              </div>
            </div>

            <Badge variant="outline" className={`px-3 py-1.5 font-medium ${stock.badgeClass}`}>
              {stock.label}
            </Badge>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2 pt-2">
              {!isEditing ? (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  Chỉnh sửa thông tin
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Hủy
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={updateMaterialMutation.isPending}>
                    {updateMaterialMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[68vh] px-6 pb-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="space-y-3 rounded-2xl border bg-card/50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <Box className="size-4" />
                Thông tin tồn kho
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Tồn hiện tại</p>
                  <p className={`text-xl font-bold ${isLowStock ? 'text-destructive' : 'text-foreground'}`}>
                    {detail.currentStock.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{detail.unit}</p>
                </div>
                <div className="rounded-xl border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Ngưỡng tối thiểu</p>
                  <p className="text-xl font-bold">{detail.threshold.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{detail.unit}</p>
                </div>
                <div className="rounded-xl border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Chênh lệch</p>
                  <p className={`text-xl font-bold ${stockGap < 0 ? 'text-destructive' : stockGap > 0 ? 'text-emerald-600' : 'text-foreground'}`}>
                    {stockGap === 0 ? '0' : Math.abs(stockGap).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{stockGapLabel}</p>
                </div>
              </div>
              {isLowStock && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <p>Mức tồn kho đang thấp hơn ngưỡng an toàn, cần theo dõi và bổ sung.</p>
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-2xl border bg-card/50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <Layers className="size-4" />
                Thông tin phân loại
              </h3>
              <div className="space-y-2 text-sm">
                <InfoRow label="Danh mục" value={isProduct ? (detail as Product).category : 'Nguyên vật liệu'} />
                <InfoRow label="Đơn vị" value={detail.unit || 'N/A'} />
                {type === 'material' && (
                  <InfoRow label="Màu sắc" value={(detail as Material).color || 'N/A'} />
                )}
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border bg-card/50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <Warehouse className="size-4" />
                Vị trí lưu trữ
              </h3>
              <div className="space-y-2 text-sm">
                <InfoRow label="Mã kệ" value={detail.shelf?.shelfCode || 'Chưa xếp kệ'} />
                <InfoRow label="Khu vực" value={detail.shelf?.warehouseSection || 'N/A'} />
                <InfoRow label="Vị trí chi tiết" value={detail.locationDetails || 'N/A'} />
                <InfoRow
                  label="Cập nhật cuối"
                  value={detail.updatedAt ? format(new Date(detail.updatedAt), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A'}
                />
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border bg-card/50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <MapPin className="size-4" />
                Nhà cung cấp
              </h3>
              <div className="space-y-2 text-sm">
                {type === 'material' ? (
                  <>
                    <InfoRow label="Tên NCC" value={(detail as Material).supplier?.name || 'N/A'} />
                    <InfoRow label="Liên hệ" value={(detail as Material).supplier?.phone || 'N/A'} />
                    <InfoRow label="Email" value={(detail as Material).supplier?.email || 'N/A'} />
                  </>
                ) : (
                  <InfoRow label="Thông tin" value="Thành phẩm không sử dụng trường nhà cung cấp trực tiếp." />
                )}
              </div>
            </section>
          </div>

          <section className="mt-6 space-y-3 rounded-2xl border bg-card/50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <FileText className="size-4" />
              Mô tả chi tiết
            </h3>
            <p className="min-h-10 text-sm leading-relaxed text-foreground/85">
              {detail.description || <span className="italic text-muted-foreground">Không có mô tả.</span>}
            </p>
          </section>

          {canEdit && isEditing && (
            <section className="mt-6 space-y-4 rounded-2xl border bg-card/50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Chỉnh sửa</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input value={String(draft.name || '')} onChange={(e) => setDraft((p: any) => ({ ...p, name: e.target.value }))} placeholder="Tên nguyên vật liệu" />
                <Input value={String(draft.barcode || '')} onChange={(e) => setDraft((p: any) => ({ ...p, barcode: e.target.value }))} placeholder="Barcode" />
                <Input value={String(draft.unit || '')} onChange={(e) => setDraft((p: any) => ({ ...p, unit: e.target.value }))} placeholder="Đơn vị" />
                <Input value={String(draft.color || '')} onChange={(e) => setDraft((p: any) => ({ ...p, color: e.target.value }))} placeholder="Màu sắc" />
                <Input type="number" value={Number(draft.price || 0)} onChange={(e) => setDraft((p: any) => ({ ...p, price: Number(e.target.value) }))} placeholder="Đơn giá" />
                <Input type="number" value={Number(draft.threshold || 0)} onChange={(e) => setDraft((p: any) => ({ ...p, threshold: Number(e.target.value) }))} placeholder="Ngưỡng cảnh báo" />
                <Select value={String(draft.shelf || '')} onValueChange={(value) => setDraft((p: any) => ({ ...p, shelf: value }))}>
                  <SelectTrigger><SelectValue placeholder="Chọn kệ" /></SelectTrigger>
                  <SelectContent>
                    {shelves.map((shelf: any) => (
                      <SelectItem key={shelf._id} value={shelf._id}>
                        {shelf.shelfCode} ({shelf.warehouseSection || 'N/A'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={String(draft.locationDetails || '')} onChange={(e) => setDraft((p: any) => ({ ...p, locationDetails: e.target.value }))} placeholder="Vị trí chi tiết" />
                <Input value={String(draft.supplier?.name || '')} onChange={(e) => updateSupplier('name', e.target.value)} placeholder="Tên NCC" />
                <Input value={String(draft.supplier?.phone || '')} onChange={(e) => updateSupplier('phone', e.target.value)} placeholder="Số điện thoại NCC" />
                <Input value={String(draft.supplier?.email || '')} onChange={(e) => updateSupplier('email', e.target.value)} placeholder="Email NCC" />
                <Input value={String(draft.supplier?.address || '')} onChange={(e) => updateSupplier('address', e.target.value)} placeholder="Địa chỉ NCC" />
                <Input value={String(draft.supplier?.contactPerson || '')} onChange={(e) => updateSupplier('contactPerson', e.target.value)} placeholder="Người liên hệ" />
                <Input value={String(draft.supplier?.notes || '')} onChange={(e) => updateSupplier('notes', e.target.value)} placeholder="Ghi chú NCC" />
                <div className="md:col-span-2">
                  <Textarea value={String(draft.description || '')} onChange={(e) => setDraft((p: any) => ({ ...p, description: e.target.value }))} placeholder="Mô tả" />
                </div>
              </div>
            </section>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-2 last:border-none last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
