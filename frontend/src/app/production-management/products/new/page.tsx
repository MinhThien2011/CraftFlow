"use client"

import { useState } from "react"
import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Trash2,
  Save,
  Send,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const categories = [
  "Sản phẩm tre",
  "Đèn trang trí",
  "Túi xách",
  "Sản phẩm gỗ",
  "Phụ kiện",
  "Mây tre đan",
  "Thêu tay",
  "Nến thơm",
]

interface BOMItem {
  id: number
  name: string
  quantity: number
  unit: string
  note: string
}

export default function NewProductPage() {
  const [bomItems, setBomItems] = useState<BOMItem[]>([
    { id: 1, name: "", quantity: 0, unit: "", note: "" },
  ])

  const addBomItem = () => {
    setBomItems([
      ...bomItems,
      { id: Date.now(), name: "", quantity: 0, unit: "", note: "" },
    ])
  }

  const removeBomItem = (id: number) => {
    if (bomItems.length > 1) {
      setBomItems(bomItems.filter((item) => item.id !== id))
    }
  }

  const updateBomItem = (id: number, field: keyof BOMItem, value: string | number) => {
    setBomItems(
      bomItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  return (
    <DashboardLayout title="Tạo sản phẩm mới">
      <div className="space-y-6">
        {/* Breadcrumb & Actions */}
        <div className="flex justify-end">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="border-border">
              <Save className="mr-2 h-4 w-4" />
              Lưu bản nháp
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Send className="mr-2 h-4 w-4" />
              Tạo và gửi duyệt
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Product Info */}
          <Card className="p-6 bg-card border-border lg:col-span-1">
            <h3 className="text-lg font-semibold text-card-foreground mb-6">
              Thông tin sản phẩm
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product-name">Tên sản phẩm *</Label>
                <Input
                  id="product-name"
                  placeholder="Nhập tên sản phẩm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Danh mục *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dimensions">Kích thước</Label>
                <Input
                  id="dimensions"
                  placeholder="VD: 30x20x15cm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Nhập mô tả sản phẩm"
                  rows={4}
                />
              </div>
            </div>
          </Card>

          {/* BOM Form */}
          <Card className="bg-card border-border lg:col-span-2">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-card-foreground">
                Định mức nguyên vật liệu
              </h3>
              <Button
                onClick={addBomItem}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="mr-2 h-4 w-4" />
                Thêm vật tư
              </Button>
            </div>

            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="hidden sm:grid sm:grid-cols-12 gap-4 text-xs font-medium uppercase text-muted-foreground pb-2">
                <div className="col-span-4">Tên vật tư</div>
                <div className="col-span-2">Số lượng</div>
                <div className="col-span-2">Đơn vị</div>
                <div className="col-span-3">Ghi chú</div>
                <div className="col-span-1"></div>
              </div>

              {/* BOM Items */}
              {bomItems.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-4 sm:grid-cols-12 p-4 bg-muted/30 rounded-lg"
                >
                  <div className="sm:col-span-4">
                    <Label className="sm:hidden text-xs text-muted-foreground mb-1 block">
                      Tên vật tư
                    </Label>
                    <Input
                      placeholder="Nhập tên vật tư"
                      value={item.name}
                      onChange={(e) => updateBomItem(item.id, "name", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="sm:hidden text-xs text-muted-foreground mb-1 block">
                      Số lượng
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={item.quantity || ""}
                      onChange={(e) => updateBomItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="sm:hidden text-xs text-muted-foreground mb-1 block">
                      Đơn vị
                    </Label>
                    <Select
                      value={item.unit}
                      onValueChange={(value) => updateBomItem(item.id, "unit", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="m">m</SelectItem>
                        <SelectItem value="m²">m²</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="cái">cái</SelectItem>
                        <SelectItem value="cuộn">cuộn</SelectItem>
                        <SelectItem value="sợi">sợi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-3">
                    <Label className="sm:hidden text-xs text-muted-foreground mb-1 block">
                      Ghi chú
                    </Label>
                    <Input
                      placeholder="Ghi chú (tùy chọn)"
                      value={item.note}
                      onChange={(e) => updateBomItem(item.id, "note", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-1 flex items-end sm:items-center justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBomItem(item.id)}
                      disabled={bomItems.length === 1}
                      className="h-9 w-9"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-border bg-muted/30">
              <p className="text-sm text-muted-foreground">
                Tổng cộng: {bomItems.length} loại vật tư
              </p>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}


