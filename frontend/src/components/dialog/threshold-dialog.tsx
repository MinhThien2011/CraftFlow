import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2 } from "lucide-react"
import { Material } from "@/app/alerts/types"
import { FieldError } from "./restock-dialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: Material
  onSuccess: (newThreshold: number) => void
}

export function ThresholdDialog({ open, onOpenChange, material, onSuccess }: Props) {
  const [threshold, setThreshold] = useState("")
  const [error, setError] = useState("")
  const [isDone, setIsDone] = useState(false)

  useEffect(() => {
    if (open) {
      setThreshold(String(material?.threshold ?? ''))
      setError("")
      setIsDone(false)
    }
  }, [open, material])

  const handleThreshold = () => {
    const val = Number(threshold)
    if (!threshold || val < 0) { setError('Vui lòng nhập ngưỡng hợp lệ'); return }
    onSuccess(val)
    setIsDone(true)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setIsDone(false) }}>
      <DialogContent className="sm:max-w-sm w-[95vw]">
        <DialogHeader>
          <DialogTitle>Thiết lập ngưỡng cảnh báo</DialogTitle>
          <DialogDescription>{material?.name} · Ngưỡng hiện tại: <strong>{material?.threshold} {material?.unit}</strong></DialogDescription>
        </DialogHeader>
        {isDone ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm"><CheckCircle2 className="size-4"/> Đã cập nhật thành công</div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Ngưỡng mới <span className="text-destructive">*</span></Label>
              <Input type="number" value={threshold} onChange={(e) => { setThreshold(e.target.value); setError('') }} min={0} />
              <FieldError msg={error} />
            </div>
          </div>
        )}
        <DialogFooter>{isDone ? <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button> : <><Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button onClick={handleThreshold}>Lưu ngưỡng</Button></>}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}