// Warehouse module mock data (isolated from main app mock-data to avoid name clashes)

export interface MaterialRequisition {
  id: string
  code: string
  staffName: string
  department: string
  materials: { name: string; quantity: number; unit: string }[]
  status: 'pending' | 'approved' | 'preparing' | 'completed' | 'rejected' | 'timeout'
  createdAt: Date
  priority: 'high' | 'normal' | 'low'
}

export interface LowStockItem {
  id: string
  name: string
  currentStock: number
  minStock: number
  unit: string
  category: string
}

export interface DefectReport {
  id: string
  productName: string
  defectType: string
  severity: 'light' | 'medium' | 'heavy'
  quantity: number
  reportedBy: string
  reportedAt: Date
  status: 'pending' | 'processing' | 'resolved'
}

export interface InventoryItem {
  id: string
  code: string
  name: string
  category: string
  currentStock: number
  minStock: number
  maxStock: number
  unit: string
  location: string
  lastUpdated: Date
  status: 'normal' | 'low' | 'critical' | 'overstock'
}

export interface ReceivingNote {
  id: string
  code: string
  supplierName: string
  materials: { name: string; quantity: number; unit: string; status: 'good' | 'damaged' | 'missing' }[]
  receivedBy: string
  receivedAt: Date
  status: 'pending_qc' | 'approved' | 'rejected' | 'partial'
}

export interface IssuingNote {
  id: string
  code: string
  customerName: string
  products: { name: string; quantity: number; unit: string }[]
  issuedBy: string
  issuedAt: Date
  status: 'pending' | 'picking' | 'completed' | 'partial'
}

export interface ActivityLog {
  id: string
  action: string
  description: string
  user: string
  timestamp: Date
  type: 'success' | 'warning' | 'info' | 'error'
}

export const dashboardStats = {
  pendingRequisitions: 12,
  lowStockItems: 8,
  pendingDefects: 5,
  pendingRMA: 3,
  pendingScrap: 4,
  timeoutRequisitions: 2,
  pendingReceiving: 6,
  pendingIssuing: 4,
}

export const pendingRequisitions: MaterialRequisition[] = [
  {
    id: '1',
    code: 'REQ-2024-001',
    staffName: 'Nguyễn Văn A',
    department: 'Sản xuất',
    materials: [
      { name: 'Len cotton cao cấp', quantity: 50, unit: 'cuộn' },
      { name: 'Mắt thú nhồi bông 8mm', quantity: 200, unit: 'cái' },
    ],
    status: 'pending',
    createdAt: new Date('2024-03-15T08:30:00'),
    priority: 'high',
  },
  {
    id: '2',
    code: 'REQ-2024-002',
    staffName: 'Trần Thị B',
    department: 'Sản xuất',
    materials: [
      { name: 'Bông gòn nhồi', quantity: 30, unit: 'kg' },
      { name: 'Chỉ may màu trắng', quantity: 10, unit: 'cuộn' },
    ],
    status: 'pending',
    createdAt: new Date('2024-03-15T09:15:00'),
    priority: 'normal',
  },
  {
    id: '3',
    code: 'REQ-2024-003',
    staffName: 'Lê Văn C',
    department: 'Đóng gói',
    materials: [
      { name: 'Hộp carton size M', quantity: 100, unit: 'cái' },
      { name: 'Túi nilon trong', quantity: 500, unit: 'cái' },
    ],
    status: 'preparing',
    createdAt: new Date('2024-03-15T07:00:00'),
    priority: 'low',
  },
]

export const lowStockItems: LowStockItem[] = [
  { id: '1', name: 'Mắt thú nhồi bông 8mm', currentStock: 15, minStock: 50, unit: 'hộp', category: 'Phụ kiện' },
  { id: '2', name: 'Bông gòn nhồi', currentStock: 5, minStock: 20, unit: 'gram', category: 'Nguyên liệu' },
  { id: '3', name: 'Len wool Úc', currentStock: 120, minStock: 100, unit: 'cuộn', category: 'Nguyên liệu' },
  { id: '4', name: 'Chỉ may đỏ', currentStock: 8, minStock: 30, unit: 'cuộn', category: 'Phụ kiện' },
  { id: '5', name: 'Kim khâu số 3', currentStock: 50, minStock: 100, unit: 'cái', category: 'Dụng cụ' },
]

export const defectReports: DefectReport[] = [
  {
    id: '1',
    productName: 'Gấu bông Teddy',
    defectType: 'Đường may bị lỗi',
    severity: 'light',
    quantity: 5,
    reportedBy: 'Nguyễn Văn A',
    reportedAt: new Date('2024-03-14T14:30:00'),
    status: 'pending',
  },
  {
    id: '2',
    productName: 'Thỏ handmade',
    defectType: 'Vải bị phai màu',
    severity: 'medium',
    quantity: 3,
    reportedBy: 'Trần Thị B',
    reportedAt: new Date('2024-03-14T10:00:00'),
    status: 'processing',
  },
]

export const inventoryItems: InventoryItem[] = [
  { id: '1', code: 'NVL-001', name: 'Len cotton cao cấp', category: 'Nguyên liệu', currentStock: 250, minStock: 100, maxStock: 500, unit: 'cuộn', location: 'A1-01', lastUpdated: new Date('2024-03-15T08:00:00'), status: 'normal' },
  { id: '2', code: 'NVL-002', name: 'Len acrylic', category: 'Nguyên liệu', currentStock: 180, minStock: 80, maxStock: 400, unit: 'cuộn', location: 'A1-02', lastUpdated: new Date('2024-03-15T08:00:00'), status: 'normal' },
  { id: '3', code: 'NVL-003', name: 'Bông gòn nhồi', category: 'Nguyên liệu', currentStock: 5, minStock: 20, maxStock: 100, unit: 'kg', location: 'A2-01', lastUpdated: new Date('2024-03-15T08:00:00'), status: 'critical' },
  { id: '4', code: 'PK-001', name: 'Mắt thú nhồi bông 8mm', category: 'Phụ kiện', currentStock: 15, minStock: 50, maxStock: 300, unit: 'hộp', location: 'B1-01', lastUpdated: new Date('2024-03-15T08:00:00'), status: 'critical' },
  { id: '5', code: 'PK-002', name: 'Mũi thú nhồi bông', category: 'Phụ kiện', currentStock: 200, minStock: 100, maxStock: 500, unit: 'cái', location: 'B1-02', lastUpdated: new Date('2024-03-15T08:00:00'), status: 'normal' },
  { id: '6', code: 'DC-001', name: 'Kim khâu số 3', category: 'Dụng cụ', currentStock: 50, minStock: 100, maxStock: 300, unit: 'cái', location: 'C1-01', lastUpdated: new Date('2024-03-15T08:00:00'), status: 'low' },
  { id: '7', code: 'NVL-004', name: 'Len wool Úc', category: 'Nguyên liệu', currentStock: 120, minStock: 100, maxStock: 300, unit: 'cuộn', location: 'A1-03', lastUpdated: new Date('2024-03-15T08:00:00'), status: 'low' },
]

export const productionOverviewData = [
  { month: 'T1', produced: 35, target: 40, completed: 32 },
  { month: 'T2', produced: 42, target: 45, completed: 38 },
  { month: 'T3', produced: 48, target: 50, completed: 45 },
  { month: 'T4', produced: 55, target: 55, completed: 52 },
  { month: 'T5', produced: 65, target: 60, completed: 58 },
  { month: 'T6', produced: 58, target: 65, completed: 55 },
]

export const materialConsumptionData = [
  { name: 'Len cotton', value: 35, fill: '#b8956a' },
  { name: 'Len acrylic', value: 25, fill: '#8b7355' },
  { name: 'Len wool', value: 13, fill: '#c9a87c' },
  { name: 'Phụ kiện', value: 15, fill: '#6b5344' },
  { name: 'Dụng cụ', value: 12, fill: '#d4b896' },
]

export const activityLogs: ActivityLog[] = [
  { id: '1', action: 'Hoàn thành sản xuất', description: 'Túi đeo chéo handmade × 5', user: 'Nguyễn Văn A', timestamp: new Date('2024-03-15T10:30:00'), type: 'success' },
  { id: '2', action: 'Nhập kho', description: 'Len cotton cao cấp × 200 cuộn', user: 'Trần Thị B', timestamp: new Date('2024-03-15T09:15:00'), type: 'info' },
  { id: '3', action: 'Cảnh báo tồn kho', description: 'Mắt thú nhồi bông 8mm sắp hết', user: 'Hệ thống', timestamp: new Date('2024-03-15T08:45:00'), type: 'warning' },
  { id: '4', action: 'Thêm sản phẩm mới', description: 'Áo len trẻ em', user: 'Lê Văn C', timestamp: new Date('2024-03-14T16:00:00'), type: 'info' },
  { id: '5', action: 'Bắt đầu sản xuất', description: 'Gấu bông Teddy × 10', user: 'Nguyễn Văn A', timestamp: new Date('2024-03-14T14:00:00'), type: 'success' },
  { id: '6', action: 'Xuất kho', description: 'Đơn hàng #ORD-2024-089', user: 'Trần Thị B', timestamp: new Date('2024-03-14T11:30:00'), type: 'info' },
]

export const receivingNotes: ReceivingNote[] = [
  {
    id: '1',
    code: 'PN-2024-001',
    supplierName: 'Công ty TNHH Len Việt',
    materials: [
      { name: 'Len cotton cao cấp', quantity: 200, unit: 'cuộn', status: 'good' },
      { name: 'Len acrylic', quantity: 150, unit: 'cuộn', status: 'good' },
    ],
    receivedBy: 'Nguyễn Văn Kho',
    receivedAt: new Date('2024-03-15T08:00:00'),
    status: 'approved',
  },
  {
    id: '2',
    code: 'PN-2024-002',
    supplierName: 'NCC Phụ kiện ABC',
    materials: [
      { name: 'Mắt thú nhồi bông 8mm', quantity: 500, unit: 'cái', status: 'good' },
      { name: 'Mũi thú nhồi bông', quantity: 300, unit: 'cái', status: 'damaged' },
    ],
    receivedBy: 'Trần Thị Kho',
    receivedAt: new Date('2024-03-15T10:30:00'),
    status: 'pending_qc',
  },
]

export const issuingNotes: IssuingNote[] = [
  {
    id: '1',
    code: 'PX-2024-001',
    customerName: 'Cửa hàng Gấu Bông 123',
    products: [
      { name: 'Gấu bông Teddy', quantity: 20, unit: 'cái' },
      { name: 'Thỏ handmade', quantity: 15, unit: 'cái' },
    ],
    issuedBy: 'Nguyễn Văn Kho',
    issuedAt: new Date('2024-03-15T09:00:00'),
    status: 'completed',
  },
  {
    id: '2',
    code: 'PX-2024-002',
    customerName: 'Shop Đồ chơi Online',
    products: [
      { name: 'Gấu bông Mini', quantity: 50, unit: 'cái' },
      { name: 'Túi đeo chéo handmade', quantity: 10, unit: 'cái' },
    ],
    issuedBy: 'Trần Thị Kho',
    issuedAt: new Date('2024-03-15T11:00:00'),
    status: 'picking',
  },
]

export const warehouseLocations = [
  { id: 'A1', zone: 'A', shelf: '1', description: 'Kệ nguyên liệu len', capacity: 500, used: 430 },
  { id: 'A2', zone: 'A', shelf: '2', description: 'Kệ nguyên liệu bông', capacity: 300, used: 120 },
  { id: 'B1', zone: 'B', shelf: '1', description: 'Kệ phụ kiện', capacity: 1000, used: 650 },
  { id: 'B2', zone: 'B', shelf: '2', description: 'Kệ phụ kiện dự phòng', capacity: 500, used: 200 },
  { id: 'C1', zone: 'C', shelf: '1', description: 'Kệ dụng cụ', capacity: 200, used: 150 },
  { id: 'D1', zone: 'D', shelf: '1', description: 'Kệ thành phẩm', capacity: 400, used: 280 },
]
