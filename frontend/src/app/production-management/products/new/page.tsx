"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
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
  Upload,
  Loader2,
  X,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateProduct } from "@/features/production/hooks/use-products"
import { useMaterials } from "@/features/inventory/hooks/use-materials"

const categories = [
  "Amigurumi",
  "Fashion",
  "Home Decor",
  "Jewelry",
  "Accessories",
  "Other",
]

interface BOMItem {
  id: string
  materialId: string
  materialCode: string
  quantity: number
  unit: string
}

export default function NewProductPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    category: "",
    unit: "con",
    estimatedProductionTime: 0,
    isActive: true,
  })

  const [bomItems, setBomItems] = useState<BOMItem[]>([
    { id: Math.random().toString(), materialId: "", materialCode: "", quantity: 0, unit: "" },
  ])

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const { data: materialsData } = useMaterials({ limit: 100 })
  const materials = materialsData?.data?.materials || []

  const createProductMutation = useCreateProduct()

  const addBomItem = () => {
    setBomItems([
      ...bomItems,
      { id: Math.random().toString(), materialId: "", materialCode: "", quantity: 0, unit: "" },
    ])
  }

  const removeBomItem = (id: string) => {
    if (bomItems.length > 1) {
      setBomItems(bomItems.filter((item) => item.id !== id))
    }
  }

  const updateBomItem = (id: string, materialId: string) => {
    const material = materials.find(m => m._id === materialId)
    if (!material) return

    setBomItems(
      bomItems.map((item) =>
        item.id === id ? {
          ...item,
          materialId: material._id,
          materialCode: material.code,
          unit: material.unit
        } : item
      )
    )
  }

  const updateQuantity = (id: string, quantity: number) => {
    setBomItems(
      bomItems.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    )
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.category || !formData.code) {
      return
    }

    const payload = new FormData()
    payload.append("name", formData.name)
    payload.append("code", formData.code)
    payload.append("description", formData.description)
    payload.append("category", formData.category)
    payload.append("unit", formData.unit)
    payload.append("estimatedProductionTime", formData.estimatedProductionTime.toString())
    payload.append("isActive", formData.isActive.toString())

    // Convert BOM items to the expected backend format
    const materialCosts = bomItems
      .filter(item => item.materialCode && item.quantity > 0)
      .map(item => ({
        materialCode: item.materialCode,
        quantity: item.quantity
      }))

    payload.append("estimateMaterialCost", JSON.stringify(materialCosts))

    if (imageFile) {
      payload.append("image", imageFile)
    }

    createProductMutation.mutate(payload, {
      onSuccess: () => {
        router.push("/production-management/products")
      }
    })
  }

  return (
    <DashboardLayout title="Tạo sản phẩm mới">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Actions */}
        <div className="flex justify-end">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="border-border"
              onClick={() => router.back()}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={createProductMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {createProductMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Tạo sản phẩm
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
                <Label htmlFor="product-image">Ảnh sản phẩm</Label>
                <div 
                  className="relative h-48 w-full border-2 border-dashed border-border rounded-xl overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <>
                      <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="h-8 w-8 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground">
                      <Upload className="h-10 w-10 mb-2" />
                      <span className="text-sm font-medium">Tải ảnh lên</span>
                      <span className="text-xs">PNG, JPG up to 5MB</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-name">Tên sản phẩm *</Label>
                <Input
                  id="product-name"
                  placeholder="Nhập tên sản phẩm"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-code">Mã sản phẩm *</Label>
                <Input
                  id="product-code"
                  placeholder="VD: PROD-BEAR-001"
                  required
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Danh mục *</Label>
                <Select
                  value={formData.category}
                  onValueChange={v => setFormData({ ...formData, category: v })}
                >
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Đơn vị</Label>
                  <Input
                    id="unit"
                    placeholder="VD: cái, con..."
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Thời gian SX (phút)</Label>
                  <Input
                    id="time"
                    type="number"
                    placeholder="180"
                    value={formData.estimatedProductionTime || ""}
                    onChange={e => setFormData({ ...formData, estimatedProductionTime: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Nhập mô tả sản phẩm"
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          </Card>

          {/* BOM Form */}
          <Card className="bg-card border-border lg:col-span-2">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-card-foreground">
                Định mức nguyên vật liệu (BOM)
              </h3>
              <Button
                type="button"
                onClick={addBomItem}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="mr-2 h-4 w-4" />
                Thêm vật tư
              </Button>
            </div>

            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="hidden sm:grid sm:grid-cols-12 gap-4 text-xs font-medium uppercase text-muted-foreground pb-2 border-b border-border">
                <div className="col-span-5">Nguyên vật liệu</div>
                <div className="col-span-3">Số lượng</div>
                <div className="col-span-3">Đơn vị</div>
                <div className="col-span-1"></div>
              </div>

              {/* BOM Items */}
              {bomItems.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-4 sm:grid-cols-12 p-4 bg-muted/20 rounded-xl border border-border/50 items-center"
                >
                  <div className="sm:col-span-5">
                    <Label className="sm:hidden text-xs text-muted-foreground mb-1 block">
                      Vật tư
                    </Label>
                    <Select
                      value={item.materialId}
                      onValueChange={(v) => updateBomItem(item.id, v)}
                    >
                      <SelectTrigger className="bg-card">
                        <SelectValue placeholder="Chọn vật tư" />
                      </SelectTrigger>
                      <SelectContent>
                        {materials.map(m => (
                          <SelectItem key={m._id} value={m._id}>
                            {m.name} ({m.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-3">
                    <Label className="sm:hidden text-xs text-muted-foreground mb-1 block">
                      Số lượng
                    </Label>
                    <Input
                      type="number"
                      placeholder="0.0"
                      className="bg-card"
                      value={item.quantity || ""}
                      onChange={(e) => updateQuantity(item.id, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Label className="sm:hidden text-xs text-muted-foreground mb-1 block">
                      Đơn vị
                    </Label>
                    <div className="px-3 py-2 bg-muted rounded-lg text-sm text-muted-foreground border border-border/50">
                      {item.unit || "---"}
                    </div>
                  </div>
                  <div className="sm:col-span-1 flex items-center justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBomItem(item.id)}
                      disabled={bomItems.length === 1}
                      className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {bomItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  Chưa có vật tư nào được thêm vào định mức
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border bg-muted/30 rounded-b-xl">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-card-foreground">Tổng cộng vật tư</span>
                <span className="text-lg font-bold text-primary">{bomItems.length}</span>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </DashboardLayout>
  )
}


