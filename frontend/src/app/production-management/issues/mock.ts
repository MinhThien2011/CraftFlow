import { Clock, CheckCircle } from "lucide-react"

export interface Issue {
  id: string
  orderId: string
  product: string
  reporter: string
  type: string
  description: string
  quantity: string
  status: string
  createdAt: string
  note: string
}

export const filters = [
  { id: "all", label: "Tất cả" },
  { id: "pending", label: "Chờ xử lý" },
  { id: "processing", label: "Đang xử lý" },
  { id: "resolved", label: "Đã giải quyết" },
]

export const statusConfig = {
  pending: { label: "Chờ xử lý", color: "bg-[#F4C542] text-[#2C2C2C]", icon: Clock },
  processing: { label: "Đang xử lý", color: "bg-[#2B8BE8] text-white", icon: Clock },
  resolved: { label: "Đã giải quyết", color: "bg-[#4A9C6B] text-white", icon: CheckCircle },
}

export const mockIssues: Issue[] = [
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
  // ... (Cắt dán nguyên bộ array "issues" dài thoòng trong file cũ vào đây) ...
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