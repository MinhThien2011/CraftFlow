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
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Tạo đơn sản xuất mới</DialogTitle>
          <DialogDescription>
            Điền thông tin chi tiết các sản phẩm cần sản xuất và thời hạn hoàn thành.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <Label className="text-base font-semibold">Danh sách sản phẩm</Label>
              <Button type="button" variant="outline" size="sm" onClick={onAddItem} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Thêm sản phẩm
              </Button>
            </div>
            
            {selectedItems.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-4 items-start sm:items-end bg-muted/30 p-3 rounded-lg border border-border relative">
                <div className="w-full sm:flex-1 space-y-2">
                  <Label>Sản phẩm</Label>
                  <Select 
                    value={item.productId} 
                    onValueChange={(val) => onUpdateItem(index, 'productId', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn sản phẩm..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p._id} value={p._id}>{p.name} ({p.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-32 space-y-2">
                  <Label>Số lượng</Label>
                  <Input 
                    type="number" 
                    value={item.quantity} 
                    onChange={(e) => onUpdateItem(index, 'quantity', e.target.value)} 
                    placeholder="SL"
                  />
                </div>
                {selectedItems.length > 1 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 sm:static text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                    onClick={() => onRemoveItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deadline">Hạn hoàn thành</Label>
              <Input id="deadline" type="date" value={deadline} onChange={(e) => onDeadlineChange(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              rows={3}
              placeholder="Thêm ghi chú nếu có..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !isValid}
            className="bg-primary text-primary-foreground"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Tạo đơn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
