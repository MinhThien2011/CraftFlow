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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface CreateOrderModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  products: any[]
  selectedProduct: string
  onProductChange: (value: string) => void
  quantity: string
  onQuantityChange: (value: string) => void
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
  selectedProduct,
  onProductChange,
  quantity,
  onQuantityChange,
  deadline,
  onDeadlineChange,
  note,
  onNoteChange,
  onSubmit,
  isSubmitting
}: CreateOrderModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Tạo đơn sản xuất mới</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="product">Chọn sản phẩm</Label>
            <Select value={selectedProduct} onValueChange={onProductChange}>
              <SelectTrigger id="product">
                <SelectValue placeholder="Chọn sản phẩm..." />
              </SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p._id} value={p._id}>{p.name} ({p.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qty">Số lượng</Label>
            <Input 
              id="qty" 
              type="number" 
              value={quantity} 
              onChange={(e) => onQuantityChange(e.target.value)} 
              placeholder="Nhập số lượng sản xuất"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">Hạn hoàn thành</Label>
            <Input id="deadline" type="date" value={deadline} onChange={(e) => onDeadlineChange(e.target.value)} />
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
            disabled={isSubmitting || !selectedProduct || !quantity}
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
