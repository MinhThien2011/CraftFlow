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
      <DialogContent size="full" className="max-h-[90vh] overflow-y-auto p-8 sm:p-12 rounded-[2rem] shadow-2xl border-muted/20">
        <DialogHeader className="mb-8">
          <DialogTitle className="text-3xl font-extrabold tracking-tight text-primary">Tạo đơn sản xuất mới</DialogTitle>
          <DialogDescription className="text-lg text-muted-foreground mt-2">
            Điền thông tin chi tiết các sản phẩm cần sản xuất và thời hạn hoàn thành.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-10 py-4">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <Label className="text-xl font-bold text-foreground/90">Danh sách sản phẩm</Label>
              <Button type="button" variant="outline" size="default" onClick={onAddItem} className="w-full sm:w-auto h-12 px-8 rounded-xl border-2 hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                <Plus className="mr-2 h-5 w-5" />
                Thêm sản phẩm
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {selectedItems.map((item, index) => (
                <div key={index} className="flex flex-col lg:flex-row gap-6 items-start lg:items-end bg-card hover:bg-accent/5 transition-colors p-6 rounded-[1.5rem] border border-border shadow-sm relative group">
                  <div className="w-full lg:flex-1 space-y-3">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sản phẩm</Label>
                    <Select
                      value={item.productId}
                      onValueChange={(val) => onUpdateItem(index, 'productId', val)}
                    >
                      <SelectTrigger className="h-12 text-base rounded-xl border-2">
                        <SelectValue placeholder="Chọn sản phẩm..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {products.map(p => (
                          <SelectItem key={p._id} value={p._id} className="rounded-lg">{p.name} ({p.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full lg:w-48 space-y-3">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Số lượng</Label>
                    <Input
                      type="number"
                      className="h-12 text-xl font-bold rounded-xl border-2"
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
                      className="absolute top-4 right-4 lg:static text-destructive hover:text-destructive hover:bg-destructive/10 h-12 w-12 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      onClick={() => onRemoveItem(index)}
                    >
                      <Trash2 className="h-6 w-6" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label htmlFor="deadline" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Hạn hoàn thành</Label>
              <Input
                id="deadline"
                type="date"
                className="h-12 text-lg rounded-xl border-2"
                value={deadline}
                onChange={(e) => onDeadlineChange(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="note" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ghi chú</Label>
            <Textarea
              id="note"
              className="text-lg min-h-[150px] rounded-2xl border-2 p-4"
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Thêm ghi chú chi tiết cho đơn sản xuất này..."
            />
          </div>
        </div>
        <DialogFooter className="gap-4 mt-8">
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)} className="h-14 px-10 rounded-2xl text-lg font-semibold border-2">
            Hủy bỏ
          </Button>
          <Button
            size="lg"
            onClick={onSubmit}
            disabled={isSubmitting || !isValid}
            className="h-14 px-12 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isSubmitting && <Loader2 className="mr-2 h-6 w-6 animate-spin" />}
            Xác nhận tạo đơn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
