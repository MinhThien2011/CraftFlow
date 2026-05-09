"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const approvedProducts = [
  { id: "SP001", name: "Giỏ tre đan tay", category: "Sản phẩm tre" },
  { id: "SP002", name: "Đèn mây thủ công", category: "Đèn trang trí" },
  { id: "SP003", name: "Túi cói thêu hoa", category: "Túi xách" },
  { id: "SP006", name: "Bình gốm men xanh", category: "Gốm sứ" },
]

export default function NewOrderPage() {
  const router = useRouter()
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState("")
  const [startDate, setStartDate] = useState("2026-05-02")
  const [deadline, setDeadline] = useState("")
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const todayLabel = useMemo(() => {
    const date = new Date(startDate)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleDateString("vi-VN")
  }, [startDate])

  const handleCancel = () => {
    router.push("/production-management/orders")
  }

  const handleCreateOrder = async () => {
    if (!selectedProduct) {
      alert("Vui lòng chọn sản phẩm")
      return
    }
    if (!quantity || parseInt(quantity) <= 0) {
      alert("Vui lòng nhập số lượng hợp lệ")
      return
    }
    if (!startDate) {
      alert("Vui lòng chọn ngày bắt đầu")
      return
    }
    if (!deadline) {
      alert("Vui lòng chọn hạn hoàn thành")
      return
    }

    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 800))
    setIsSubmitting(false)
    router.push("/production-management/orders")
  }

  return (
    <DashboardLayout title="Tạo đơn sản xuất mới">
      <div className="flex justify-center">
        <Card className="w-full max-w-[640px] rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-8">
            <h1 className="text-[40px] font-extrabold leading-tight tracking-[-0.03em] text-card-foreground">
              Tạo đơn sản xuất mới
            </h1>
          </div>

          <div className="border-t border-border px-8 py-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="product" className="text-base font-medium text-card-foreground">
                  Chọn sản phẩm
                </Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger id="product" className="h-14 rounded-2xl border-border text-base">
                  </SelectTrigger>
                  <SelectContent>
                    {approvedProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        <div className="flex flex-col">
                          <span>{product.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {product.id} - {product.category}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-base font-medium text-card-foreground">
                  Số lượng
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder=""
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-14 rounded-2xl border-border text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-base font-medium text-card-foreground">
                  Ngày bắt đầu
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-14 rounded-2xl border-border text-base"
                />
                {todayLabel && (
                  <p className="text-xs text-muted-foreground">Mặc định: {todayLabel}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline" className="text-base font-medium text-card-foreground">
                  Hạn hoàn thành
                </Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="h-14 rounded-2xl border-border text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="note" className="text-base font-medium text-card-foreground">
                  Ghi chú
                </Label>
                <Textarea
                  id="note"
                  placeholder="Ghi chú cho đơn sản xuất..."
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-[96px] rounded-2xl border-border text-base"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border px-8 py-6">
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="h-12 min-w-[100px] rounded-2xl border-border px-6 text-base"
              >
                Hủy
              </Button>
              <Button
                onClick={handleCreateOrder}
                disabled={isSubmitting}
                className="h-12 min-w-[132px] rounded-2xl bg-[#2563EB] px-6 text-base font-medium text-white hover:bg-[#1D4ED8]"
              >
                Tạo đơn
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}


