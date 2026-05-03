export type QCStatus = 'passed' | 'pending' | 'failed'

export type FinishedGoodsLocation = {
  id: string
  zone: string
  shelf: string
  description: string
  used: number
  capacity: number
  qcStatus: QCStatus
  expiryDate: string | null
  manufactureDate: string | null
  currentLot?: string
  tempMin: number
  tempMax: number
}

export type LotItem = {
  id: string
  code: string
  productName: string
  quantity: number
  unit: string
  expiryDate: string | null
  manufactureDate: string | null
  qcStatus: QCStatus
  currentLocationId?: string
  currentLocationLabel?: string
  assignedAt?: string
  assignedBy?: string
}

export const finishedGoodsLocations: FinishedGoodsLocation[] = [
  {
    id: 'A01',
    zone: 'A',
    shelf: '1',
    description: 'Kệ thành phẩm nhựa',
    used: 120,
    capacity: 150,
    qcStatus: 'passed',
    expiryDate: '2025-09-25',
    manufactureDate: '2024-09-01',
    currentLot: 'LOT-001',
    tempMin: 2,
    tempMax: 8,
  },
  {
    id: 'B03',
    zone: 'B',
    shelf: '3',
    description: 'Kệ thành phẩm gỗ',
    used: 45,
    capacity: 100,
    qcStatus: 'pending',
    expiryDate: '2024-10-15',
    manufactureDate: '2024-08-12',
    currentLot: 'LOT-002',
    tempMin: 10,
    tempMax: 18,
  },
  {
    id: 'C07',
    zone: 'C',
    shelf: '7',
    description: 'Kệ linh kiện điện tử',
    used: 100,
    capacity: 100,
    qcStatus: 'failed',
    expiryDate: '2024-11-10',
    manufactureDate: '2024-07-28',
    currentLot: 'LOT-003',
    tempMin: 4,
    tempMax: 12,
  },
  {
    id: 'D02',
    zone: 'D',
    shelf: '2',
    description: 'Kệ bao bì giấy',
    used: 30,
    capacity: 200,
    qcStatus: 'passed',
    expiryDate: null,
    manufactureDate: null,
    currentLot: undefined,
    tempMin: 15,
    tempMax: 25,
  },
  {
    id: 'E05',
    zone: 'E',
    shelf: '5',
    description: 'Kệ sản phẩm đông lạnh',
    used: 85,
    capacity: 100,
    qcStatus: 'pending',
    expiryDate: '2024-06-20',
    manufactureDate: '2024-05-20',
    currentLot: 'LOT-005',
    tempMin: -5,
    tempMax: 2,
  },
]

export const lotItems: LotItem[] = [
  {
    id: '1',
    code: 'LOT-001',
    productName: 'Nhựa PVC',
    quantity: 120,
    unit: 'kg',
    expiryDate: '2025-09-25',
    manufactureDate: '2024-09-01',
    qcStatus: 'passed',
    currentLocationId: 'A01',
    currentLocationLabel: 'Khu A - Kệ 1 (A01)',
    assignedAt: '2024-09-01T10:00:00Z',
    assignedBy: 'Nguyễn Văn A',
  },
  {
    id: '2',
    code: 'LOT-002',
    productName: 'Gỗ thông',
    quantity: 45,
    unit: 'm³',
    expiryDate: '2024-10-15',
    manufactureDate: '2024-08-12',
    qcStatus: 'pending',
    currentLocationId: 'B03',
    currentLocationLabel: 'Khu B - Kệ 3 (B03)',
    assignedAt: '2024-08-12T14:30:00Z',
    assignedBy: 'Trần Thị B',
  },
  {
    id: '3',
    code: 'LOT-003',
    productName: 'Chip điện tử',
    quantity: 100,
    unit: 'pcs',
    expiryDate: '2024-11-10',
    manufactureDate: '2024-07-28',
    qcStatus: 'failed',
  },
  {
    id: '4',
    code: 'LOT-004',
    productName: 'Giấy kraft',
    quantity: 30,
    unit: 'tấm',
    expiryDate: null,
    manufactureDate: null,
    qcStatus: 'passed',
  },
  {
    id: '5',
    code: 'LOT-005',
    productName: 'Sản phẩm đông lạnh',
    quantity: 85,
    unit: 'kg',
    expiryDate: '2024-06-20',
    manufactureDate: '2024-05-20',
    qcStatus: 'pending',
    currentLocationId: 'E05',
    currentLocationLabel: 'Khu E - Kệ 5 (E05)',
    assignedAt: '2024-05-20T09:15:00Z',
    assignedBy: 'Lê Văn C',
  },
]

export const lotMovementHistory = [
  {
    id: '1',
    lotId: '1',
    action: 'assigned',
    fromLocation: null,
    toLocation: 'A01',
    timestamp: '2024-09-01T10:00:00Z',
    performedBy: 'Nguyễn Văn A',
    note: 'Gắn vị trí ban đầu',
  },
  {
    id: '2',
    lotId: '2',
    action: 'assigned',
    fromLocation: null,
    toLocation: 'B03',
    timestamp: '2024-08-12T14:30:00Z',
    performedBy: 'Trần Thị B',
    note: 'Nhập kho từ nhà cung cấp',
  },
  {
    id: '3',
    lotId: '5',
    action: 'assigned',
    fromLocation: null,
    toLocation: 'E05',
    timestamp: '2024-05-20T09:15:00Z',
    performedBy: 'Lê Văn C',
    note: 'Kệ đông lạnh',
  },
  {
    id: '4',
    lotId: '1',
    action: 'moved',
    fromLocation: 'A01',
    toLocation: 'A02',
    timestamp: '2024-09-15T11:00:00Z',
    performedBy: 'Nguyễn Văn A',
    note: 'Di chuyển để sắp xếp kho',
  },
]