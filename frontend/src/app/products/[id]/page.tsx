"use client"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Edit,
  Trash2,
  Plus,
  Send,
  Package,
  CheckCircle,
  Upload,
  Loader2,
  ChevronLeft,
} from "lucide-react"
import Link from "next/link"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useProduct, useUpdateProduct, useDeleteProduct } from "@/features/production/hooks/use-products"
import { useMaterials } from "@/features/inventory/hooks/use-materials"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { productApi } from "@/api/product.api"
import { shelfApi, type Shelf } from "@/api/shelf.api"
import { toast } from "sonner"

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

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const isNew = id === "create" || id === "new"
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { role } = useAuth()
  const isProductionManager = role === 'production_manager'

  const [isEditing, setIsEditing] = useState(isNew)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    category: "",
    unit: "",
    estimatedProductionTime: 0,
    shelf: "",
    threshold: 5,
    isActive: true,
  })

  const [bomItems, setBomItems] = useState<BOMItem[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [shelves, setShelves] = useState<Shelf[]>([])

  const { data: productResponse, isLoading: productLoading } = useProduct(isNew ? "" : id)
  const { data: materialsData } = useMaterials({ limit: 100 })
  const materials = materialsData?.data?.materials || []

  useEffect(() => {
    const fetchShelves = async () => {
      try {
        const res: any = await shelfApi.getAll({ category: 'Product' })
        console.log(res)
        
        if (res.status === "success" || res.success) {
          setShelves(res.data?.shelves || res.data || [])
        }
      } catch (error) {
        console.error("Failed to fetch shelves", error)
      }
    }
    fetchShelves()
  }, [])

  const updateProductMutation = useUpdateProduct()
  const deleteProductMutation = useDeleteProduct()

  useEffect(() => {
    if (isNew) return

    if (productResponse?.data?.product) {
      const p = productResponse.data.product
      setFormData({
        name: p.name,
        code: p.code,
        description: p.description || "",
        category: p.category,
        unit: p.unit,
        estimatedProductionTime: p.estimatedProductionTime,
        shelf: p.shelf?._id || p.shelf || "",
        threshold: p.threshold || 5,
        isActive: p.isActive,
      })

      if (p.estimateMaterialCost) {
        setBomItems(p.estimateMaterialCost.map(item => ({
          id: item._id || Math.random().toString(),
          materialId: (item.material as any)?._id || "",
          materialCode: item.materialCode,
          quantity: item.quantity,
          unit: item.unit
        })))
      }

      if (p.productImage) {
        setImagePreview(p.productImage)
      }
    }
  }, [productResponse, isNew])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation logic
    const errors: string[] = []
    if (!formData.name?.trim()) errors.push("Tên sản phẩm không được để trống")
    if (!formData.code?.trim()) errors.push("Mã sản phẩm không được để trống")
    if (!formData.category) errors.push("Vui lòng chọn danh mục")
    if (!formData.unit?.trim()) errors.push("Đơn vị tính không được để trống")
    if (formData.estimatedProductionTime <= 0) errors.push("Thời gian sản xuất phải lớn hơn 0")

    if (errors.length > 0) {
      errors.forEach(err => toast.error(err))
      return
    }

    // BOM Validation
    const validBomItems = bomItems.filter(item => item.materialId && item.quantity > 0)
    if (bomItems.length > 0 && validBomItems.length === 0) {
      toast.error("Vui lòng hoàn thiện thông tin BOM hoặc xóa các dòng trống")
      return
    }

    // Ensure all rows in BOM are valid if there are any
    const hasInvalidBomRow = bomItems.some(item => !item.materialId || item.quantity <= 0)
    if (hasInvalidBomRow) {
      toast.error("Vui lòng điền đầy đủ thông tin cho tất cả các dòng vật tư trong BOM")
      return
    }

    const payload = new FormData()
    payload.append("name", formData.name)
    payload.append("code", formData.code)
    payload.append("description", formData.description)
    payload.append("category", formData.category)
    payload.append("unit", formData.unit)
    payload.append("estimatedProductionTime", formData.estimatedProductionTime.toString())
    payload.append("shelf", formData.shelf)
    payload.append("threshold", formData.threshold.toString())
    payload.append("isActive", formData.isActive.toString())

    const materialCosts = bomItems
      .filter(item => item.materialId && item.quantity > 0)
      .map(item => ({
        material: item.materialId,
        materialCode: item.materialCode,
        quantity: item.quantity
      }))

    payload.append("estimateMaterialCost", JSON.stringify(materialCosts))

    if (imageFile) {
      payload.append("image", imageFile)
    }

    if (isNew) {
      setIsCreating(true)
      try {
        const res: any = await productApi.createProduct(payload)
        if (res.success || res.status === 'success') {
          toast.success("Đã tạo sản phẩm thành công")
          router.push("/products")
        } else {
          throw new Error(res.message || "Tạo sản phẩm thất bại")
        }
      } catch (error: any) {
        toast.error(error.message || "Đã xảy ra lỗi khi tạo sản phẩm")
      } finally {
        setIsCreating(false)
      }
    } else {
      updateProductMutation.mutate({ id, formData: payload }, {
        onSuccess: () => {
          setIsEditing(false)
        }
      })
    }
  }

  const handleDelete = () => {
    if (confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) {
      deleteProductMutation.mutate(id, {
        onSuccess: () => {
          router.push("/products")
        }
      })
    }
  }

  const addBomItem = () => {
    setBomItems([
      ...bomItems,
      { id: Math.random().toString(), materialId: "", materialCode: "", quantity: 0, unit: "" },
    ])
  }

  const removeBomItem = (id: string) => {
    setBomItems(bomItems.filter((item) => item.id !== id))
  }

  const updateBomItem = (id: string, materialId: string) => {
    // Check if this material is already selected in another BOM item
    const isDuplicate = bomItems.some(item => item.id !== id && item.materialId === materialId)
    if (isDuplicate) {
      toast.error("Vật tư này đã có trong định mức (BOM)")
      return
    }

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

  if (!isNew && productLoading) {
    return (
      <DashboardLayout title="Chi tiết sản phẩm">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title={isNew ? "Thêm sản phẩm mới" : (isEditing ? "Chỉnh sửa sản phẩm" : "Chi tiết sản phẩm")}>
      <form onSubmit={handleUpdate} className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/products")}
            className="w-fit"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Quay lại danh sách
          </Button>

          <div className="flex gap-3">
            {isProductionManager && isNew && (
              <Button
                type="submit"
                disabled={isCreating}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isCreating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Tạo sản phẩm
              </Button>
            )}

            {isProductionManager && !isNew && (
              !isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="border-border"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Chỉnh sửa
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteProductMutation.isPending}
                  >
                    {deleteProductMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Xóa sản phẩm
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateProductMutation.isPending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {updateProductMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Lưu thay đổi
                  </Button>
                </>
              )
            )}
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
                <Label>Ảnh sản phẩm</Label>
                <div
                  className={`relative h-48 w-full border-2 border-dashed border-border rounded-xl overflow-hidden group ${isEditing ? 'cursor-pointer hover:border-primary/50' : ''}`}
                  onClick={() => isEditing && fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <>
                      <Image src={imagePreview} alt="Product" fill className="object-cover" />
                      {isEditing && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Upload className="h-8 w-8" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground bg-muted/30">
                      <Package className="h-10 w-10 mb-2" />
                      <span className="text-sm">Chưa có ảnh</span>
                    </div>
                  )}
                </div>
                {isEditing && (
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Tên sản phẩm</Label>
                <Input
                  id="name"
                  value={formData.name}
                  disabled={!isEditing}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Mã sản phẩm</Label>
                <Input
                  id="code"
                  value={formData.code}
                  disabled={!isEditing}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Danh mục</Label>
                <Select
                  disabled={!isEditing}
                  value={formData.category}
                  onValueChange={v => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Đơn vị</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    disabled={!isEditing}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Thời gian SX (phút)</Label>
                  <Input
                    id="time"
                    type="number"
                    min={1}
                    value={formData.estimatedProductionTime}
                    disabled={!isEditing}
                    onChange={e => setFormData({ ...formData, estimatedProductionTime: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shelf">Vị trí kệ</Label>
                  <Select
                    disabled={!isEditing}
                    value={formData.shelf}
                    onValueChange={v => setFormData({ ...formData, shelf: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn kệ" />
                    </SelectTrigger>
                    <SelectContent>
                      {shelves.length > 0 ? (
                        shelves.map(s => (
                          <SelectItem key={s._id} value={s._id}>
                            {s.shelfCode} ({s.warehouseSection})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>Không có kệ sản phẩm</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="threshold">Ngưỡng tối thiểu</Label>
                  <Input
                    id="threshold"
                    type="number"
                    min={0}
                    value={formData.threshold}
                    disabled={!isEditing}
                    onChange={e => setFormData({ ...formData, threshold: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  disabled={!isEditing}
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
              {isEditing && (
                <Button
                  type="button"
                  onClick={addBomItem}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm vật tư
                </Button>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div className="hidden sm:grid sm:grid-cols-12 gap-4 text-xs font-medium uppercase text-muted-foreground pb-2 border-b border-border">
                <div className="col-span-5">Nguyên vật liệu</div>
                <div className="col-span-3">Số lượng</div>
                <div className="col-span-3">Đơn vị</div>
                <div className="col-span-1"></div>
              </div>

              {bomItems.map((item) => (
                <div
                  key={item.id}
                  className={`grid gap-4 sm:grid-cols-12 p-4 rounded-xl border border-border/50 items-center ${isEditing ? 'bg-muted/20' : 'bg-transparent'}`}
                >
                  <div className="sm:col-span-5">
                    {isEditing ? (
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
                    ) : (
                      <div className="text-sm font-medium text-foreground">
                        {materials.find(m => m._id === item.materialId)?.name || item.materialCode}
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-3">
                    {isEditing ? (
                      <Input
                        type="number"
                        className="bg-card"
                        value={item.quantity || ""}
                        onChange={(e) => updateQuantity(item.id, parseFloat(e.target.value) || 0)}
                      />
                    ) : (
                      <div className="text-sm text-foreground font-semibold">
                        {item.quantity}
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-3">
                    <div className="text-sm text-muted-foreground">
                      {item.unit || "---"}
                    </div>
                  </div>
                  <div className="sm:col-span-1 flex items-center justify-end">
                    {isEditing && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBomItem(item.id)}
                        className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {bomItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  Chưa có vật tư nào trong định mức
                </div>
              )}
            </div>
          </Card>
        </div>
      </form>
    </DashboardLayout>
  )
}
