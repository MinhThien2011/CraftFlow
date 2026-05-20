'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Loader2, Plus, Trash2 } from 'lucide-react'

interface CreateOrderModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  products: any[]
  selectedItems: { productId: string, quantity: string }[]
  onAddItem: () => void
  onRemoveItem: (index: number) => void
  onUpdateItem: (index: number, field: 'productId' | 'quantity', value: string) => void
  deadline: string
  onDeadlineChange: (value: string) => void
  note: string
  onNoteChange: (value: string) => void
  onSubmit: () => void
  isSubmitting: boolean
}

export function CreateOrderModal({
  isOpen,
  onOpenChange,
  products,
  selectedItems,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  deadline,
  onDeadlineChange,
  note,
  onNoteChange,
  onSubmit,
  isSubmitting
}: CreateOrderModalProps) {
  const isValid = selectedItems.some(item => item.productId && Number(item.quantity) > 0) && deadline;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent size="3xl" className="max-h-[88vh] p-0">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="text-2xl font-bold tracking-tight text-primary">Tạo lệnh sản xuất mới</DialogTitle>
          <DialogDescription className="text-sm">
            Chọn sản phẩm, số lượng cần sản xuất và hạn hoàn thành.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Label className="text-base font-semibold">Danh sách sản phẩm</Label>
              <Button type="button" variant="outline" size="sm" onClick={onAddItem} className="h-9 gap-2">
                <Plus className="h-4 w-4" />
                Thêm sản phẩm
              </Button>
            </div>

            <div className="space-y-3">
              {selectedItems.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_150px_auto] md:items-end">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Sản phẩm</Label>
                    <Select
                      value={item.productId}
                      onValueChange={(val) => onUpdateItem(index, 'productId', val)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Chọn sản phẩm..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(p => (
                          <SelectItem key={p._id} value={p._id}>
                            {p.name} ({p.code}) - Tồn kho: {p.currentStock ?? 0}{p.unit ? ` ${p.unit}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Số lượng</Label>
                    <Input
                      type="number"
                      min="1"
                      className="h-10 font-semibold"
                      value={item.quantity}
                      onChange={(e) => onUpdateItem(index, 'quantity', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  {selectedItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onRemoveItem(index)}
                      aria-label="Xóa sản phẩm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-5 md:grid-cols-[260px_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="deadline" className="text-xs font-semibold uppercase text-muted-foreground">Hạn hoàn thành</Label>
              <Input
                id="deadline"
                type="date"
                className="h-10"
                value={deadline}
                onChange={(e) => onDeadlineChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note" className="text-xs font-semibold uppercase text-muted-foreground">Ghi chú</Label>
              <Textarea
                id="note"
                className="min-h-[88px] resize-none"
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                placeholder="Thêm ghi chú chi tiết cho lệnh sản xuất này..."
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-w-[96px]">
            Hủy bỏ
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !isValid}
            className="min-w-[150px] font-semibold"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Xác nhận tạo đơn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
