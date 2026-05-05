export type ProductionOrderStatus = "pending" | "in-progress" | "complete" | "cancelled"

export type ProductionOrderSummary = {
  id: string
  product: string
  quantity: number
  status: ProductionOrderStatus
  deadline: string
  progress: number
  createdAt: string
}

export type ProductionOrderDetail = ProductionOrderSummary & {
  productId: string
  completed: number
  createdBy: string
  note: string
  stages: Array<{
    id: number
    name: string
    assignee: string
    status: string
    progress: number
    startDate: string
    endDate: string
  }>
}

export const productionOrders: ProductionOrderSummary[] = [
  {
    id: "PO-2024-001",
    product: "Giỏ tre đan tay",
    quantity: 150,
    status: "in-progress",
    deadline: "25/04/2026",
    progress: 65,
    createdAt: "10/04/2026",
  },
  {
    id: "PO-2024-002",
    product: "Đèn mây thủ công",
    quantity: 80,
    status: "in-progress",
    deadline: "28/04/2026",
    progress: 12,
    createdAt: "15/04/2026",
  },
  {
    id: "PO-2024-003",
    product: "Túi cói thêu hoa",
    quantity: 200,
    status: "complete",
    deadline: "20/04/2026",
    progress: 100,
    createdAt: "05/04/2026",
  },
  {
    id: "PO-2024-004",
    product: "Khay gỗ chạm khắc",
    quantity: 50,
    status: "in-progress",
    deadline: "30/04/2026",
    progress: 40,
    createdAt: "12/04/2026",
  },
  {
    id: "PO-2024-005",
    product: "Lọ hoa gốm sứ",
    quantity: 100,
    status: "cancelled",
    deadline: "22/04/2026",
    progress: 0,
    createdAt: "08/04/2026",
  },
  {
    id: "PO-2024-006",
    product: "Bình gốm men xanh",
    quantity: 75,
    status: "in-progress",
    deadline: "02/05/2026",
    progress: 20,
    createdAt: "18/04/2026",
  },
]

export const productionOrderDetails: Record<string, ProductionOrderDetail> = {
  "PO-2024-001": {
    id: "PO-2024-001",
    product: "Giỏ tre đan tay",
    productId: "SP001",
    quantity: 150,
    completed: 98,
    status: "in-progress",
    deadline: "25/04/2026",
    progress: 65,
    createdAt: "10/04/2026",
    createdBy: "Nguyễn Văn A",
    note: "Ưu tiên giao trước 100 sản phẩm cho đơn hàng xuất khẩu",
    stages: [
      { id: 1, name: "Chuẩn bị nguyên liệu", assignee: "Trần Văn B", status: "complete", progress: 100, startDate: "10/04/2026", endDate: "12/04/2026" },
      { id: 2, name: "Đan khung cơ bản", assignee: "Lê Thị C", status: "complete", progress: 100, startDate: "12/04/2026", endDate: "16/04/2026" },
      { id: 3, name: "Đan chi tiết & hoàn thiện", assignee: "Phạm Văn D", status: "in-progress", progress: 70, startDate: "16/04/2026", endDate: "20/04/2026" },
      { id: 4, name: "Sơn bảo vệ", assignee: "Hoàng Thị E", status: "pending", progress: 0, startDate: "20/04/2026", endDate: "22/04/2026" },
      { id: 5, name: "Kiểm tra chất lượng", assignee: "Vũ Văn F", status: "pending", progress: 0, startDate: "22/04/2026", endDate: "25/04/2026" },
    ],
  },
  "PO-2024-002": {
    id: "PO-2024-002",
    product: "Đèn mây thủ công",
    productId: "SP002",
    quantity: 80,
    completed: 0,
    status: "in-progress",
    deadline: "28/04/2026",
    progress: 12,
    createdAt: "15/04/2026",
    createdBy: "Trần Thị B",
    note: "Chờ duyệt từ phòng sản xuất",
    stages: [
      { id: 1, name: "Chuẩn bị khung sắt", assignee: "Nguyễn Văn G", status: "in-progress", progress: 12, startDate: "16/04/2026", endDate: "18/04/2026" },
      { id: 2, name: "Đan mây quanh khung", assignee: "Lê Thị H", status: "in-progress", progress: 12, startDate: "18/04/2026", endDate: "22/04/2026" },
      { id: 3, name: "Lắp hệ thống điện", assignee: "Phạm Văn I", status: "in-progress", progress: 12, startDate: "22/04/2026", endDate: "25/04/2026" },
      { id: 4, name: "Kiểm tra an toàn", assignee: "Hoàng Thị K", status: "in-progress", progress: 12, startDate: "25/04/2026", endDate: "28/04/2026" },
    ],
  },
  "PO-2024-003": {
    id: "PO-2024-003",
    product: "Túi cói thêu hoa",
    productId: "SP003",
    quantity: 200,
    completed: 200,
    status: "complete",
    deadline: "20/04/2026",
    progress: 100,
    createdAt: "05/04/2026",
    createdBy: "Nguyễn Văn A",
    note: "Đã hoàn thành trước hạn 2 ngày",
    stages: [
      { id: 1, name: "Cắt và chuẩn bị cói", assignee: "Trần Văn L", status: "complete", progress: 100, startDate: "05/04/2026", endDate: "08/04/2026" },
      { id: 2, name: "Đan túi cói", assignee: "Lê Thị M", status: "complete", progress: 100, startDate: "08/04/2026", endDate: "14/04/2026" },
      { id: 3, name: "Thêu hoa trang trí", assignee: "Phạm Văn N", status: "complete", progress: 100, startDate: "14/04/2026", endDate: "18/04/2026" },
      { id: 4, name: "Kiểm tra & đóng gói", assignee: "Hoàng Thị O", status: "complete", progress: 100, startDate: "18/04/2026", endDate: "20/04/2026" },
    ],
  },
  "PO-2024-004": {
    id: "PO-2024-004",
    product: "Khay gỗ chạm khắc",
    productId: "SP004",
    quantity: 50,
    completed: 20,
    status: "in-progress",
    deadline: "30/04/2026",
    progress: 40,
    createdAt: "12/04/2026",
    createdBy: "Phạm Thị D",
    note: "Yêu cầu chạm khắc hoa văn truyền thống",
    stages: [
      { id: 1, name: "Xẻ gỗ theo kích thước", assignee: "Nguyễn Văn P", status: "complete", progress: 100, startDate: "12/04/2026", endDate: "14/04/2026" },
      { id: 2, name: "Phơi và xử lý gỗ", assignee: "Lê Thị Q", status: "in-progress", progress: 20, startDate: "14/04/2026", endDate: "18/04/2026" },
      { id: 3, name: "Chạm khắc hoa văn", assignee: "Phạm Văn R", status: "in-progress", progress: 40, startDate: "18/04/2026", endDate: "26/04/2026" },
      { id: 4, name: "Đánh bóng & sơn", assignee: "Hoàng Thị S", status: "pending", progress: 0, startDate: "26/04/2026", endDate: "30/04/2026" },
    ],
  },
  "PO-2024-005": {
    id: "PO-2024-005",
    product: "Lọ hoa gốm sứ",
    productId: "SP005",
    quantity: 100,
    completed: 0,
    status: "cancelled",
    deadline: "22/04/2026",
    progress: 0,
    createdAt: "08/04/2026",
    createdBy: "Hoàng Văn E",
    note: "Đã hủy do khách hàng thay đổi yêu cầu",
    stages: [
      { id: 1, name: "Nhồi đất sét", assignee: "Trần Văn T", status: "cancelled", progress: 0, startDate: "08/04/2026", endDate: "10/04/2026" },
      { id: 2, name: "Tạo hình trên bàn xoay", assignee: "Lê Thị U", status: "cancelled", progress: 0, startDate: "10/04/2026", endDate: "14/04/2026" },
    ],
  },
  "PO-2024-006": {
    id: "PO-2024-006",
    product: "Bình gốm men xanh",
    productId: "SP006",
    quantity: 75,
    completed: 15,
    status: "in-progress",
    deadline: "02/05/2026",
    progress: 20,
    createdAt: "18/04/2026",
    createdBy: "Vũ Thị F",
    note: "Đơn hàng đặc biệt cho triển lãm",
    stages: [
      { id: 1, name: "Chuẩn bị đất sét", assignee: "Nguyễn Văn V", status: "in-progress", progress: 40, startDate: "18/04/2026", endDate: "19/04/2026" },
      { id: 2, name: "Tạo hình bình", assignee: "Lê Thị W", status: "in-progress", progress: 20, startDate: "19/04/2026", endDate: "24/04/2026" },
      { id: 3, name: "Nung sơ bộ", assignee: "Phạm Văn X", status: "in-progress", progress: 10, startDate: "24/04/2026", endDate: "26/04/2026" },
      { id: 4, name: "Tráng men xanh", assignee: "Hoàng Thị Y", status: "in-progress", progress: 15, startDate: "26/04/2026", endDate: "29/04/2026" },
      { id: 5, name: "Nung hoàn thiện", assignee: "Vũ Văn Z", status: "in-progress", progress: 15, startDate: "29/04/2026", endDate: "02/05/2026" },
    ],
  },
}