'use client'

import { AlertTriangle, Trash2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  title?: string
  description?: string
  itemName?: string
  itemCode?: string
  isLoading?: boolean
  className?: string
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Xác nhận xóa dữ liệu',
  description = 'Bạn có chắc chắn muốn xóa mục này không? Hành động này sẽ loại bỏ hoàn toàn dữ liệu khỏi hệ thống và không thể hoàn tác.',
  itemName,
  itemCode,
  isLoading = false,
  className,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !isLoading && onOpenChange(val)}>
      <DialogContent className={cn('sm:max-w-[460px] p-0 border border-red-100/50 shadow-2xl rounded-2xl overflow-hidden bg-background/95 backdrop-blur-md', className)}>
        {/* Decorative Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 animate-gradient-x" />

        <div className="p-6 space-y-6">
          <DialogHeader className="space-y-4">
            {/* Animated Warning Icon with Glowing Backdrop */}
            <div className="mx-auto sm:mx-0 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50/80 border border-red-100/60 shadow-inner relative group shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-red-400/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <AlertTriangle className="h-7 w-7 text-red-500 animate-pulse" />
            </div>

            <div className="text-center sm:text-left space-y-2">
              <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight flex items-center justify-center sm:justify-start gap-2">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground/90 leading-relaxed font-medium">
                {description}
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Highlight Card for the Item being deleted */}
          {itemName && (
            <div className="p-4 rounded-xl bg-muted/40 border border-muted-foreground/10 space-y-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-red-500/5 to-transparent pointer-events-none" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Đối tượng bị tác động</p>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 pt-0.5">
                <span className="text-[15px] font-bold text-red-600 break-words group-hover:text-red-700 transition-colors">
                  {itemName}
                </span>
                {itemCode && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted border text-muted-foreground w-fit shrink-0">
                    {itemCode}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="h-11 rounded-xl font-semibold border-gray-200 hover:bg-muted text-gray-700 hover:text-foreground transition-all duration-200"
            >
              Hủy yêu cầu
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="h-11 rounded-xl font-semibold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-md shadow-red-200/50 hover:shadow-red-300/60 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                  Đang tiến hành xóa...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4 text-white/95" />
                  Đồng ý xóa dữ liệu
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
