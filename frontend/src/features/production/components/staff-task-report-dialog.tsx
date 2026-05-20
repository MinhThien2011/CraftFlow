"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { CheckCircle2, ChevronRight, Package } from "lucide-react"
import { format, isToday } from "date-fns"
import { vi } from "date-fns/locale"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUpdateAssignmentStatus } from "@/features/production/hooks/use-production"


const reportSchema = z.object({
  completedQuantity: z.coerce
    .number({ invalid_type_error: "Vui lòng nhập số hợp lệ" })
    .int("Số lượng phải là số nguyên")
    .min(0, "Số lượng không được âm"),
})

type ReportFormValues = z.infer<typeof reportSchema>

interface StaffTaskReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: any | null
}

export function StaffTaskReportDialog({ open, onOpenChange, task }: StaffTaskReportDialogProps) {
  // ⚠️ All hooks MUST be called unconditionally — no early returns before this point
  const { mutate: updateStatus, isPending } = useUpdateAssignmentStatus()

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      completedQuantity: 0,
    },
  })

  // Sync form values whenever the selected task changes
  useEffect(() => {
    if (!task) return
    form.reset({
      completedQuantity: task.completedQuantity ?? 0,
    })
  }, [task, form])

  // Derived values — safe to compute even when task is null (Dialog won't render body)
  const maxQuantity: number = task?.assignedQuantity ?? 0
  const product = task?.productDetails ?? task?.product ?? {}
  const isCompleted = task?.status === "completed"
  const reportedToday = task?.lastReportedAt ? isToday(new Date(task.lastReportedAt)) : false

  const onSubmit = (values: ReportFormValues) => {
    if (!task) return

    if (values.completedQuantity > maxQuantity) {
      form.setError("completedQuantity", {
        type: "manual",
        message: `Không được vượt quá số lượng được giao (${maxQuantity})`,
      })
      return
    }
    updateStatus(
      { id: task._id, data: { completedQuantity: values.completedQuantity } },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] overflow-hidden">
        <DialogHeader className="bg-muted/50 -mx-6 -mt-6 p-6 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Báo cáo tiến độ cuối ngày
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Cập nhật số lượng <strong>của bạn</strong> đã hoàn thành. Mỗi ngày chỉ được gửi báo cáo
            <strong> 1 lần</strong> — hãy báo cáo trung thực vào cuối ca làm việc.
          </DialogDescription>
        </DialogHeader>

        {/* Guard: render body only when task is set */}
        {task && (
          <div className="grid gap-6 py-4">
            {/* Task Info Card */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Package className="w-4 h-4" />
                    Sản phẩm
                  </p>
                  <p className="font-semibold text-base mt-1">
                    {product.name}
                    {product.code && (
                      <span className="text-muted-foreground ml-2 text-sm font-normal">
                        ({product.code})
                      </span>
                    )}
                  </p>
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 shrink-0">
                  Chỉ tiêu: {maxQuantity} {product.unit}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Mã đơn hàng</p>
                  <p className="text-sm font-medium font-mono">{task.orderCode ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Thời gian giao</p>
                  <p className="text-sm font-medium">
                    {task.createdAt
                      ? format(new Date(task.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Form, Completed or Already Reported State */}
            {isCompleted ? (
              <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto" />
                <p className="font-semibold text-green-700 dark:text-green-400">Công việc này đã hoàn thành!</p>
                <p className="text-sm text-green-600/80">
                  Bạn đã hoàn thành đủ {maxQuantity} {product.unit} được giao.
                </p>
              </div>
            ) : reportedToday ? (
              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/50 text-center space-y-2 py-5 shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-amber-600 mx-auto animate-pulse" />
                <p className="font-bold text-amber-800 dark:text-amber-400">Đã báo cáo tiến độ hôm nay!</p>
                <p className="text-xs text-amber-700/90 dark:text-amber-300 leading-relaxed px-2">
                  Bạn đã thực hiện báo cáo cho nhiệm vụ này hôm nay lúc{" "}
                  <strong className="text-amber-900 dark:text-amber-200">
                    {task.lastReportedAt ? format(new Date(task.lastReportedAt), "HH:mm") : ""}
                  </strong>
                  .<br />Theo quy định, mỗi ngày chỉ được báo cáo tối đa <strong>1 lần</strong>. Vui lòng quay lại vào ngày mai!
                </p>
              </div>
            ) : (
              <Form {...form}>
                <form id="report-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="completedQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Số lượng hoàn thành hôm nay{product.unit ? ` (${product.unit})` : ""}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={maxQuantity}
                            placeholder="Nhập số lượng..."
                            {...field}
                            className="text-lg font-semibold h-12"
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormDescription className="flex justify-between">
                          <span>Đã làm trước đó: <strong>{task.completedQuantity ?? 0}</strong></span>
                          <span className="font-medium text-primary">
                            Còn lại: {Math.max(0, maxQuantity - (field.value || 0))}
                          </span>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
                    Trang thai cong viec se duoc he thong tu xac dinh dua tren so luong da hoan thanh.
                  </div>
                </form>
              </Form>
            )}
          </div>
        )}

        <DialogFooter className="bg-muted/50 -mx-6 -mb-6 p-4 sm:justify-between border-t items-center mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          {task && !isCompleted && !reportedToday && (
            <Button type="submit" form="report-form" disabled={isPending} className="gap-2">
              {isPending ? "Đang cập nhật..." : "Cập nhật tiến độ"}
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


