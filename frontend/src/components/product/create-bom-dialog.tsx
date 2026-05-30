import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export function CreateBomDialog() {
  const [open, setOpen] = useState(false)
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Tạo BOM
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Tạo BOM mới
          </DialogTitle>
          <DialogDescription>
            Thiết lập định mức nguyên vật liệu tiêu chuẩn cho một đơn vị sản phẩm.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground border border-dashed">
            Vui lòng sử dụng tính năng "Xem chi tiết / Sửa" ở từng sản phẩm để cập nhật, hoặc truy cập trang tạo mới.
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}