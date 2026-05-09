"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
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
} from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const unitOptions = [
  "kg", "g", "m", "m²", "ml", "cái", "cuộn", "sợi", "tấm", "bộ", "hộp", "hạt"
]

const productsData: Record<string, {
  id: string
  name: string
  category: string
  description: string
  status: string
  createdAt: string
  updatedAt: string
  createdBy: string
  bom: { id: number; name: string; unit: string; quantity: number; note: string }[]
}> = {
  "TT-001": {
    id: "TT-001",
    name: "Túi tote vải canvas",
    category: "Túi xách",
    description: "Túi tote thêu tay họa tiết hoa sen",
    status: "active",
    createdAt: "2026-04-10",
    updatedAt: "2026-04-15",
    createdBy: "Nguyễn Văn A",
    bom: [
      { id: 1, name: "Vải canvas", unit: "m", quantity: 0.8, note: "Canvas 12oz" },
      { id: 2, name: "Chỉ thêu", unit: "cuộn", quantity: 3, note: "Chỉ DMC nhiều màu" },
      { id: 3, name: "Dây kéo", unit: "cái", quantity: 1, note: "Dây kéo 20cm" },
      { id: 4, name: "Khóa túi", unit: "cái", quantity: 2, note: "Khóa nam châm" },
    ],
  },
  "DL-002": {
    id: "DL-002",
    name: "Đèn lồng tre đan",
    category: "Đèn trang trí",
    description: "Đèn lồng tre đan thủ công, có đế gỗ",
    status: "active",
    createdAt: "2026-04-08",
    updatedAt: "2026-04-12",
    createdBy: "Nguyễn Văn A",
    bom: [
      { id: 1, name: "Nan tre", unit: "cái", quantity: 50, note: "Nan tre vót mỏng" },
      { id: 2, name: "Đế gỗ thông", unit: "cái", quantity: 1, note: "Đế tròn D15cm" },
      { id: 3, name: "Đui đèn E27", unit: "cái", quantity: 1, note: "Đui sứ" },
      { id: 4, name: "Dây điện", unit: "m", quantity: 2, note: "Dây bọc vải" },
      { id: 5, name: "Sơn bóng", unit: "ml", quantity: 50, note: "Sơn PU trong" },
    ],
  },
  "KM-003": {
    id: "KM-003",
    name: "Khay mây đựng trái cây",
    category: "Mây tre đan",
    description: "Khay mây tròn đường kính 30cm",
    status: "inactive",
    createdAt: "2026-04-05",
    updatedAt: "2026-04-10",
    createdBy: "Nguyễn Văn A",
    bom: [
      { id: 1, name: "Mây tự nhiên", unit: "sợi", quantity: 100, note: "Mây nước" },
      { id: 2, name: "Khung tre", unit: "cái", quantity: 1, note: "Khung tròn 30cm" },
      { id: 3, name: "Sơn bảo vệ", unit: "ml", quantity: 30, note: "Sơn chống nước" },
    ],
  },
  "HG-004": {
    id: "HG-004",
    name: "Hộp gỗ khắc",
    category: "Sản phẩm gỗ",
    description: "Hộp đựng trang sức gỗ thông khắc tên",
    status: "active",
    createdAt: "2026-04-14",
    updatedAt: "2026-04-16",
    createdBy: "Nguyễn Văn A",
    bom: [
      { id: 1, name: "Gỗ thông", unit: "tấm", quantity: 1, note: "Gỗ thông 10mm" },
      { id: 2, name: "Bản lề mini", unit: "cái", quantity: 2, note: "Bản lề đồng" },
      { id: 3, name: "Nhung lót", unit: "m", quantity: 0.1, note: "Nhung đỏ" },
      { id: 4, name: "Sơn dầu", unit: "ml", quantity: 20, note: "Sơn trong suốt" },
    ],
  },
  "VG-005": {
    id: "VG-005",
    name: "Vòng tay handmade",
    category: "Phụ kiện",
    description: "Vòng tay handmade thiết kế thủ công",
    status: "active",
    createdAt: "2026-04-01",
    updatedAt: "2026-04-08",
    createdBy: "Nguyễn Văn A",
    bom: [
      { id: 1, name: "Hạt nhựa/đá", unit: "hạt", quantity: 14, note: "Hạt trang trí nhiều màu" },
      { id: 2, name: "Dây đàn hồi", unit: "m", quantity: 0.3, note: "Dây co giãn" },
      { id: 3, name: "Charm trang trí", unit: "cái", quantity: 1, note: "Charm kim loại hoặc nhựa" },
    ],
  },
  "TT-006": {
    id: "TT-006",
    name: "Tranh thêu tay phong cảnh",
    category: "Thêu tay",
    description: "Tranh thêu chữ thập khung gỗ 40x50cm",
    status: "inactive",
    createdAt: "2026-03-28",
    updatedAt: "2026-04-05",
    createdBy: "Nguyễn Văn A",
    bom: [
      { id: 1, name: "Vải thêu Aida", unit: "tấm", quantity: 1, note: "Aida 14CT" },
      { id: 2, name: "Chỉ thêu", unit: "cuộn", quantity: 20, note: "Chỉ DMC đủ màu" },
      { id: 3, name: "Kim thêu", unit: "cái", quantity: 3, note: "Kim số 24" },
      { id: 4, name: "Khung gỗ", unit: "cái", quantity: 1, note: "Khung 40x50cm" },
      { id: 5, name: "Khung thêu", unit: "cái", quantity: 1, note: "Khung tròn 20cm" },
      { id: 6, name: "Kính bảo vệ", unit: "tấm", quantity: 1, note: "Kính 2mm" },
    ],
  },
  "GT-007": {
    id: "GT-007",
    name: "Giỏ tre đựng đồ",
    category: "Mây tre đan",
    description: "Giỏ tre có nắp đậy, quai xách",
    status: "active",
    createdAt: "2026-04-10",
    updatedAt: "2026-04-14",
    createdBy: "Nguyễn Văn A",
    bom: [
      { id: 1, name: "Nan tre", unit: "cái", quantity: 80, note: "Nan tre dày 3mm" },
      { id: 2, name: "Mây buộc", unit: "sợi", quantity: 30, note: "Mây nhuộm màu" },
      { id: 3, name: "Vải lót", unit: "m", quantity: 0.3, note: "Vải cotton kẻ" },
    ],
  },
  "NL-008": {
    id: "NL-008",
    name: "Nến thơm handmade",
    category: "Nến thơm",
    description: "Nến đậu nành hương lavender, ly thủy tinh",
    status: "inactive",
    createdAt: "2026-04-06",
    updatedAt: "2026-04-11",
    createdBy: "Nguyễn Văn A",
    bom: [
      { id: 1, name: "Sáp đậu nành", unit: "g", quantity: 200, note: "Sáp 100% tự nhiên" },
      { id: 2, name: "Tinh dầu lavender", unit: "ml", quantity: 15, note: "Tinh dầu nguyên chất" },
      { id: 3, name: "Bấc nến", unit: "cái", quantity: 1, note: "Bấc cotton" },
      { id: 4, name: "Ly thủy tinh", unit: "cái", quantity: 1, note: "Ly 250ml" },
      { id: 5, name: "Nhãn dán", unit: "cái", quantity: 1, note: "Nhãn kraft" },
    ],
  },
}

const availableMaterials = [
  "Vải canvas",
  "Chỉ thêu",
  "Nan tre",
  "Mây tự nhiên",
  "Gỗ thông",
  "Đất sét trắng",
  "Sáp đậu nành",
  "Tinh dầu lavender",
  "Dây kéo",
  "Bản lề mini",
  "Sơn bóng",
  "Nhung lót",
]

const statusConfig = {
  active: { label: "Đang hoạt động", bgColor: "bg-[#E8F5EE]", textColor: "text-[#2D6A4F]", dotColor: "bg-[#4A9C6B]" },
  inactive: { label: "Không hoạt động", bgColor: "bg-[#FEE2E2]", textColor: "text-[#B91C1C]", dotColor: "bg-[#E04E4E]" },
}

const statusOptions = [
  { value: "active", label: "Đang hoạt động" },
  { value: "inactive", label: "Không hoạt động" },
]

const warehouseReceipts: Record<string, {
  id: number
  receiptCode: string
  productId: string
  quantity: number
  date: string
  status: "pending" | "completed" | "sent"
  relatedOrders: string[]
  createdBy: string
}[]> = {
  "TT-001": [
    {
      id: 1,
      receiptCode: "NK-TT-001-001",
      productId: "TT-001",
      quantity: 50,
      date: "2026-04-20",
      status: "completed",
      relatedOrders: ["ĐH-001", "ĐH-002"],
      createdBy: "Nguyễn Văn A",
    },
    {
      id: 2,
      receiptCode: "NK-TT-001-002",
      productId: "TT-001",
      quantity: 30,
      date: "2026-04-22",
      status: "completed",
      relatedOrders: ["ĐH-003"],
      createdBy: "Trần Thị B",
    },
  ],
  "DL-002": [
    {
      id: 3,
      receiptCode: "NK-DL-002-001",
      productId: "DL-002",
      quantity: 20,
      date: "2026-04-19",
      status: "completed",
      relatedOrders: ["ĐH-004"],
      createdBy: "Nguyễn Văn A",
    },
  ],
  "KM-003": [],
  "HG-004": [],
  "VG-005": [],
  "TT-006": [],
  "GT-007": [],
  "NL-008": [],
}

const receiptStatusConfig = {
  pending: { label: "Chờ xác nhận", bgColor: "bg-[#FEF3C7]", textColor: "text-[#92400E]", dotColor: "bg-[#F59E0B]" },
  completed: { label: "Hoàn thành", bgColor: "bg-[#E8F5EE]", textColor: "text-[#2D6A4F]", dotColor: "bg-[#4A9C6B]" },
  sent: { label: "Đã gửi kho", bgColor: "bg-[#EBF8FF]", textColor: "text-[#0369A1]", dotColor: "bg-[#0EA5E9]" },
}

export default function ProductDetailPage() {
  const params = useParams()
  const productId = params.id as string
  const product = productsData[productId] || productsData["TT-001"]
  
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [currentProduct, setCurrentProduct] = useState(product)
  const [materials, setMaterials] = useState(product.bom)
  
  // Edit form state
  const [editName, setEditName] = useState(product.name)
  const [editCode, setEditCode] = useState(product.id)
  const [editDescription, setEditDescription] = useState(product.description)
  const [editStatus, setEditStatus] = useState(product.status)
  const [editMaterials, setEditMaterials] = useState(product.bom)
  const [newMaterial, setNewMaterial] = useState("")
  const [newQuantity, setNewQuantity] = useState("")
  const [newUnit, setNewUnit] = useState("")
  const [warehouseReceiptsList, setWarehouseReceiptsList] = useState(warehouseReceipts[productId] || [])
  const [isCreateReceiptOpen, setIsCreateReceiptOpen] = useState(false)

  const status = statusConfig[currentProduct.status as keyof typeof statusConfig]

  const handleAddMaterialInEdit = () => {
    if (newMaterial && newQuantity && newUnit) {
      setEditMaterials([
        ...editMaterials,
        {
          id: Date.now(),
          name: newMaterial,
          quantity: parseFloat(newQuantity),
          unit: newUnit,
          note: "",
        },
      ])
      setNewMaterial("")
      setNewQuantity("")
      setNewUnit("")
    }
  }

  const handleRemoveMaterialInEdit = (id: number) => {
    setEditMaterials(editMaterials.filter((m) => m.id !== id))
  }

  const handleSaveEdit = () => {
    setCurrentProduct({
      ...currentProduct,
      id: editCode,
      name: editName,
      description: editDescription,
      status: editStatus,
      bom: editMaterials,
    })
    setMaterials(editMaterials)
    setIsEditOpen(false)
  }

  return (
    <DashboardLayout title="Chi tiết sản phẩm">
      <div className="space-y-6">
        {/* Breadcrumb & Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3 ml-auto">
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-border">
                  <Edit className="mr-2 h-4 w-4" />
                  Chỉnh sửa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-primary">
                    Chỉnh sửa sản phẩm
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Product Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Tên sản phẩm</Label>
                      <Input
                        id="edit-name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nhập tên sản phẩm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-code">Mã sản phẩm</Label>
                      <Input
                        id="edit-code"
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                        placeholder="Nhập mã sản phẩm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Trạng thái</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger id="edit-status">
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Mô tả</Label>
                    <Textarea
                      id="edit-description"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Nhập mô tả sản phẩm"
                      rows={3}
                    />
                  </div>

                  {/* BOM Section */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Định mức nguyên vật liệu</Label>
                    
                    {/* Add Material Row */}
                    <div className="flex gap-3">
                      <Input
                        placeholder="Nhập tên vật tư..."
                        value={newMaterial}
                        onChange={(e) => setNewMaterial(e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Số lượng"
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(e.target.value)}
                        className="w-24"
                      />
                      <Select value={newUnit} onValueChange={setNewUnit}>
                        <SelectTrigger className="w-28">
                          <SelectValue placeholder="Đơn vị" />
                        </SelectTrigger>
                        <SelectContent>
                          {unitOptions.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleAddMaterialInEdit}
                        className="bg-[#2B8BE8] hover:bg-[#2B8BE8]/90 text-white px-4"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Materials List */}
                    <div className="space-y-2">
                      {editMaterials.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div>
                            <span className="font-medium text-card-foreground">
                              {item.name}
                            </span>
                            <span className="text-muted-foreground ml-2">
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMaterialInEdit(item.id)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditOpen(false)}
                    >
                      Hủy
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                      className="bg-[#2B8BE8] hover:bg-[#2B8BE8]/90 text-white"
                    >
                      Cập nhật
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa
            </Button>
          </div>
        </div>

        {/* Product Info Card */}
        <Card className="p-6 bg-card border-border">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Mã sản phẩm</p>
              <p className="font-semibold text-card-foreground">{currentProduct.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tên sản phẩm</p>
              <p className="font-semibold text-card-foreground">{currentProduct.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Danh mục</p>
              <p className="font-semibold text-card-foreground">{currentProduct.category}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Trạng thái</p>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${status.bgColor} ${status.textColor}`}>
                <span className={`w-2 h-2 rounded-full ${status.dotColor}`}></span>
                {status.label}
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Mô tả</p>
              <p className="text-card-foreground">{currentProduct.description}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Người tạo</p>
              <p className="text-card-foreground">{currentProduct.createdBy}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Ngày tạo</p>
              <p className="text-card-foreground">{currentProduct.createdAt}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Cập nhật</p>
              <p className="text-card-foreground">{currentProduct.updatedAt}</p>
            </div>
          </div>
        </Card>

        {/* BOM Table */}
        <Card className="bg-card border-border">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-card-foreground">
              Định mức nguyên vật liệu
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    STT
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Tên vật tư
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Số lượng
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Đơn vị
                  </th>
                </tr>
              </thead>
              <tbody>
                {materials.map((item, index) => (
                  <tr
                    key={item.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-card-foreground">{index + 1}</td>
                    <td className="px-6 py-4 font-medium text-card-foreground">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-card-foreground">{item.quantity}</td>
                    <td className="px-6 py-4 text-card-foreground">{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 border-t border-border bg-muted/30">
            <span className="text-sm text-muted-foreground">
              Tổng cộng: {materials.length} loại vật tư
            </span>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
