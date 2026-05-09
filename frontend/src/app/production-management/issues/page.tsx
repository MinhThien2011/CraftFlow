"use client"

import { useState } from "react"
import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  Package,
  User,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

const filters = [
  { id: "all", label: "Tất cả" },
  { id: "pending", label: "Chờ xử lý" },
  { id: "processing", label: "Đang xử lý" },
  { id: "resolved", label: "Đã giải quyết" },
]

const issues = [
  {
    id: "IS-001",
    orderId: "PO-2024-001",
    product: "Giỏ tre đan tay",
    reporter: "Trần Văn B",
    type: "Hao hụt nguyên liệu",
    description: "Tre nguyên liệu bị nứt 15%, không thể sử dụng",
    quantity: "2.5 kg",
    status: "pending",
    createdAt: "19/04/2026",
    note: "",
  },
  {
    id: "IS-002",
    orderId: "PO-2024-002",
    product: "Đèn mây thủ công",
    reporter: "Lê Thị C",
    type: "Lỗi sản phẩm",
    description: "Phát hiện 5 sản phẩm bị lỗi khung, cần làm lại",
    quantity: "5 cái",
    status: "processing",
    createdAt: "18/04/2026",
    note: "Đang điều tra nguyên nhân",
  },
  {
    id: "IS-003",
    orderId: "PO-2024-003",
    product: "Túi cói thêu hoa",
    reporter: "Phạm Văn D",
    type: "Hao hụt nguyên liệu",
    description: "Chỉ thêu bị đứt do chất lượng không đạt",
    quantity: "500 m",
    status: "resolved",
    createdAt: "15/04/2026",
    note: "Đã đổi nhà cung cấp chỉ mới",
  },
  {
    id: "IS-004",
    orderId: "PO-2024-004",
    product: "Khay gỗ chạm khắc",
    reporter: "Hoàng Thị E",
    type: "Thiết bị hỏng",
    description: "Máy chà nhám bị hỏng, cần sửa chữa",
    quantity: "1 máy",
    status: "resolved",
    createdAt: "14/04/2026",
    note: "Đã sửa xong, hoạt động bình thường",
  },
  {
    id: "IS-005",
    orderId: "PO-2024-001",
    product: "Giỏ tre đan tay",
    reporter: "Vũ Văn F",
    type: "Lỗi sản phẩm",
    description: "Sản phẩm không đạt tiêu chuẩn kiểm tra chất lượng",
    quantity: "8 cái",
    status: "pending",
    createdAt: "20/04/2026",
    note: "",
  },
  {
    id: "IS-006",
    orderId: "PO-2024-006",
    product: "Bình gốm men xanh",
    reporter: "Nguyễn Văn V",
    type: "Hao hụt nguyên liệu",
    description: "Đất sét bị khô, không thể sử dụng cho tạo hình",
    quantity: "3 kg",
    status: "pending",
    createdAt: "21/04/2026",
    note: "",
  },
  {
    id: "IS-007",
    orderId: "PO-2024-002",
    product: "Đèn mây thủ công",
    reporter: "Lê Thị H",
    type: "Thiết bị hỏng",
    description: "Kìm uốn mây bị gãy",
    quantity: "2 cái",
    status: "processing",
    createdAt: "17/04/2026",
    note: "Đã đặt mua kìm mới",
  },
  {
    id: "IS-008",
    orderId: "PO-2024-003",
    product: "Túi cói thêu hoa",
    reporter: "Trần Văn L",
    type: "Hao hụt nguyên liệu",
    description: "Cói bị mốc do bảo quản không đúng cách",
    quantity: "1.5 kg",
    status: "resolved",
    createdAt: "12/04/2026",
    note: "Đã cải thiện điều kiện bảo quản",
  },
  {
    id: "IS-009",
    orderId: "PO-2024-004",
    product: "Khay gỗ chạm khắc",
    reporter: "Phạm Văn R",
    type: "Lỗi sản phẩm",
    description: "Hoa văn chạm khắc bị lệch, cần làm lại",
    quantity: "3 cái",
    status: "pending",
    createdAt: "22/04/2026",
    note: "",
  },
  {
    id: "IS-010",
    orderId: "PO-2024-001",
    product: "Giỏ tre đan tay",
    reporter: "Lê Thị C",
    type: "Hao hụt nguyên liệu",
    description: "Nan tre bị gãy trong quá trình đan",
    quantity: "0.8 kg",
    status: "resolved",
    createdAt: "13/04/2026",
    note: "Đã thay thế nguyên liệu mới",
  },
  {
    id: "IS-011",
    orderId: "PO-2024-006",
    product: "Bình gốm men xanh",
    reporter: "Lê Thị W",
    type: "Lỗi sản phẩm",
    description: "Bình bị nứt sau khi nung sơ bộ",
    quantity: "4 cái",
    status: "processing",
    createdAt: "20/04/2026",
    note: "Đang kiểm tra nhiệt độ lò nung",
  },
  {
    id: "IS-012",
    orderId: "PO-2024-002",
    product: "Đèn mây thủ công",
    reporter: "Phạm Văn I",
    type: "Thiết bị hỏng",
    description: "Bóng đèn LED bị cháy khi thử nghiệm",
    quantity: "10 cái",
    status: "resolved",
    createdAt: "16/04/2026",
    note: "Đã thay đổi nhà cung cấp bóng LED",
  },
  {
    id: "IS-013",
    orderId: "PO-2024-004",
    product: "Khay gỗ chạm khắc",
    reporter: "Nguyễn Văn P",
    type: "Hao hụt nguyên liệu",
    description: "Gỗ bị mối mọt, không thể sử dụng",
    quantity: "2 tấm",
    status: "pending",
    createdAt: "19/04/2026",
    note: "",
  },
  {
    id: "IS-014",
    orderId: "PO-2024-003",
    product: "Túi cói thêu hoa",
    reporter: "Hoàng Thị O",
    type: "Lỗi sản phẩm",
    description: "Đường may không đều, cần làm lại",
    quantity: "6 cái",
    status: "resolved",
    createdAt: "14/04/2026",
    note: "Nhân viên đã được đào tạo lại",
  },
  {
    id: "IS-015",
    orderId: "PO-2024-006",
    product: "Bình gốm men xanh",
    reporter: "Hoàng Thị Y",
    type: "Hao hụt nguyên liệu",
    description: "Men xanh bị đóng cặn, không thể sử dụng",
    quantity: "500 ml",
    status: "pending",
    createdAt: "21/04/2026",
    note: "",
  },
  {
    id: "IS-016",
    orderId: "PO-2024-001",
    product: "Giỏ tre đan tay",
    reporter: "Phạm Văn D",
    type: "Thiết bị hỏng",
    description: "Dao cắt tre bị mẻ",
    quantity: "1 cái",
    status: "resolved",
    createdAt: "11/04/2026",
    note: "Đã mài lại dao",
  },
  {
    id: "IS-017",
    orderId: "PO-2024-002",
    product: "Đèn mây thủ công",
    reporter: "Nguyễn Thị G",
    type: "Hao hụt nguyên liệu",
    description: "Mây ngâm bị hỏng do để quá lâu",
    quantity: "1.2 kg",
    status: "processing",
    createdAt: "18/04/2026",
    note: "Đang điều chỉnh quy trình bảo quản",
  },
  {
    id: "IS-018",
    orderId: "PO-2024-004",
    product: "Khay gỗ chạm khắc",
    reporter: "Lê Thị Q",
    type: "Lỗi sản phẩm",
    description: "Bề mặt khay không đều sau khi chà nhám",
    quantity: "2 cái",
    status: "resolved",
    createdAt: "15/04/2026",
    note: "Đã xử lý lại bề mặt",
  },
  {
    id: "IS-019",
    orderId: "PO-2024-006",
    product: "Bình gốm men xanh",
    reporter: "Vũ Văn Z",
    type: "Thiết bị hỏng",
    description: "Bàn xoay bị kẹt",
    quantity: "1 cái",
    status: "pending",
    createdAt: "22/04/2026",
    note: "",
  },
  {
    id: "IS-020",
    orderId: "PO-2024-003",
    product: "Túi cói thêu hoa",
    reporter: "Phạm Văn N",
    type: "Hao hụt nguyên liệu",
    description: "Kim thêu bị gãy",
    quantity: "5 cái",
    status: "resolved",
    createdAt: "13/04/2026",
    note: "Đã thay kim mới",
  },
  {
    id: "IS-021",
    orderId: "PO-2024-001",
    product: "Giỏ tre đan tay",
    reporter: "Hoàng Thị E",
    type: "Lỗi sản phẩm",
    description: "Sơn bảo vệ bị bong tróc",
    quantity: "5 cái",
    status: "processing",
    createdAt: "21/04/2026",
    note: "Đang thử nghiệm loại sơn mới",
  },
  {
    id: "IS-022",
    orderId: "PO-2024-002",
    product: "Đèn mây thủ công",
    reporter: "Hoàng Thị K",
    type: "Thiết bị hỏng",
    description: "Máy hàn điện bị chập",
    quantity: "1 cái",
    status: "resolved",
    createdAt: "17/04/2026",
    note: "Đã sửa chữa xong",
  },
  {
    id: "IS-023",
    orderId: "PO-2024-004",
    product: "Khay gỗ chạm khắc",
    reporter: "Hoàng Thị S",
    type: "Hao hụt nguyên liệu",
    description: "Sơn phủ bị khô trong hộp",
    quantity: "300 ml",
    status: "resolved",
    createdAt: "20/04/2026",
    note: "Đã mua sơn mới",
  },
]

const statusConfig = {
  pending: { label: "Chờ xử lý", color: "bg-[#F4C542] text-[#2C2C2C]", icon: Clock },
  processing: { label: "Đang xử lý", color: "bg-[#2B8BE8] text-white", icon: Clock },
  resolved: { label: "Đã giải quyết", color: "bg-[#4A9C6B] text-white", icon: CheckCircle },
}

export default function IssuesPage() {
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<typeof issues[0] | null>(null)
  const [processStatus, setProcessStatus] = useState("")
  const [processNote, setProcessNote] = useState("")

  // Calculate dynamic counts
  const getFilterCount = (filterId: string) => {
    if (filterId === "all") return issues.length
    return issues.filter(i => i.status === filterId).length
  }

  const filteredIssues = issues.filter((issue) => {
    const matchesFilter = activeFilter === "all" || issue.status === activeFilter
    const matchesSearch =
      issue.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.reporter.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const handleOpenProcessDialog = (issue: typeof issues[0]) => {
    setSelectedIssue(issue)
    setProcessStatus(issue.status)
    setProcessNote(issue.note)
    setIsProcessDialogOpen(true)
  }

  const handleSaveProcess = () => {
    if (selectedIssue) {
      alert(`Đã cập nhật vấn đề ${selectedIssue.id}:\nTrạng thái: ${statusConfig[processStatus as keyof typeof statusConfig]?.label}\nGhi chú: ${processNote || "Không có"}`)
      setIsProcessDialogOpen(false)
      setSelectedIssue(null)
      setProcessStatus("")
      setProcessNote("")
    }
  }

  return (
    <DashboardLayout title="Báo cáo hao hụt & Vấn đề">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EBE3D9]">
                <Clock className="h-5 w-5 text-[#7A5C43]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">{getFilterCount("pending")}</p>
                <p className="text-sm text-muted-foreground">Chờ xử lý</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EBE3D9]">
                <Package className="h-5 w-5 text-[#7A5C43]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">{getFilterCount("processing")}</p>
                <p className="text-sm text-muted-foreground">Đang xử lý</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EBE3D9]">
                <CheckCircle className="h-5 w-5 text-[#7A5C43]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">{getFilterCount("resolved")}</p>
                <p className="text-sm text-muted-foreground">Đã giải quyết</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Header Actions */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm báo cáo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === filter.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {filter.label}
              <span className="ml-2 opacity-70">({getFilterCount(filter.id)})</span>
            </button>
          ))}
        </div>

        {/* Issues List */}
        <div className="space-y-4">
          {filteredIssues.map((issue) => (
            <Card key={issue.id} className="p-6 bg-card border-border">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge
                      className={`${statusConfig[issue.status as keyof typeof statusConfig].color} border-0`}
                    >
                      {statusConfig[issue.status as keyof typeof statusConfig].label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{issue.id}</span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{issue.createdAt}</span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-card-foreground">{issue.type}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>{issue.product}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{issue.reporter}</span>
                    </div>
                    <div className="flex items-center gap-1 text-destructive font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Hao hụt: {issue.quantity}</span>
                    </div>
                  </div>

                  {issue.note && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Ghi chú:</span> {issue.note}
                      </p>
                    </div>
                  )}
                </div>

                <Button 
                  variant="outline" 
                  className="border-border shrink-0"
                  onClick={() => handleOpenProcessDialog(issue)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Xử lý
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Process Dialog */}
      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">
              Xử lý vấn đề {selectedIssue?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedIssue && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="font-medium text-card-foreground">{selectedIssue.type}</p>
                <p className="text-sm text-muted-foreground">{selectedIssue.description}</p>
                <p className="text-sm text-destructive font-medium">
                  Hao hụt: {selectedIssue.quantity}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Cập nhật trạng thái</Label>
                <select 
                  className="w-full h-10 px-3 rounded-md border border-border bg-card text-sm"
                  value={processStatus}
                  onChange={(e) => setProcessStatus(e.target.value)}
                >
                  <option value="pending">Chờ xử lý</option>
                  <option value="processing">Đang xử lý</option>
                  <option value="resolved">Đã giải quyết</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Ghi chú xử lý</Label>
                <Textarea
                  placeholder="Nhập ghi chú về cách xử lý vấn đề..."
                  rows={3}
                  value={processNote}
                  onChange={(e) => setProcessNote(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
                  Hủy
                </Button>
                <Button 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={handleSaveProcess}
                >
                  Lưu thay đổi
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}


