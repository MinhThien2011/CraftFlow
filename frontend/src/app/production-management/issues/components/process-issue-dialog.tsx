import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Issue } from "@/app/production-management/issues/mock"
import { toast } from "sonner"

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    issue: Issue | null
    onSuccess: (issueId: string, status: string, note: string) => void
}

export function ProcessIssueDialog({ open, onOpenChange, issue, onSuccess }: Props) {
    const [status, setStatus] = useState("")
    const [note, setNote] = useState("")

    useEffect(() => {
        if (open && issue) {
            setStatus(issue.status)
            setNote(issue.note)
        }
    }, [open, issue])

    const handleSave = () => {
        if (!issue) return
        onSuccess(issue.id, status, note)
        onOpenChange(false)
    }

    if (!issue) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-primary">
                        Xử lý vấn đề {issue.id}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                        <p className="font-medium text-card-foreground">{issue.type}</p>
                        <p className="text-sm text-muted-foreground">{issue.description}</p>
                        <p className="text-sm text-destructive font-medium">Hao hụt: {issue.quantity}</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Cập nhật trạng thái</Label>
                        <select
                            className="w-full h-10 px-3 rounded-md border border-border bg-card text-sm"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="pending">Chờ xử lý</option>
                            <option value="processing">Đang xử lý</option>
                            <option value="resolved">Đã giải quyết</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label>Ghi chú xử lý</Label>
                        <Textarea placeholder="Nhập ghi chú về cách xử lý vấn đề..." rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave}>
                            Lưu thay đổi
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}