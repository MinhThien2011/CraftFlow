'use client'

import { useState, useMemo } from 'react'
import { AppShell } from '@/components/app-shell'
import {
  Package,
  Maximize2,
  Thermometer,
  ShieldCheck,
  Clock,
  Plus,
  Edit2,
  AlertTriangle,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type QCStatus = 'passed' | 'pending' | 'failed'

type FinishedGoodsLocation = {
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

const finishedGoodsLocations: FinishedGoodsLocation[] = [
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

type FilterStatus = 'all' | 'low' | 'high' | 'full' | 'pending-qc' | 'expiring'

function getDaysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null
  const diff = new Date(expiryDate).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getUsageStatus(location: FinishedGoodsLocation) {
  const pct = (location.used / location.capacity) * 100
  if (pct >= 100) return 'full'
  if (pct >= 80) return 'high'
  if (pct >= 40) return 'medium'
  return 'low'
}

const QC_CONFIG: Record<QCStatus, { label: string; className: string; icon: React.ReactNode }> = {
  passed: {
    label: 'Đã QC',
    className: 'bg-emerald-100 text-emerald-700',
    icon: <ShieldCheck className="size-3" />,
  },
  pending: {
    label: 'Chờ QC',
    className: 'bg-amber-100 text-amber-700',
    icon: <Clock className="size-3" />,
  },
  failed: {
    label: 'Không đạt',
    className: 'bg-red-100 text-red-700',
    icon: <AlertTriangle className="size-3" />,
  },
}

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'low', label: 'Còn trống' },
  { value: 'high', label: 'Gần đầy' },
  { value: 'full', label: 'Đã đầy' },
  { value: 'pending-qc', label: 'Chờ QC' },
  { value: 'expiring', label: 'Sắp hết hạn' },
]

export default function FinishedGoodsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all')
  const [locations, setLocations] = useState<FinishedGoodsLocation[]>(finishedGoodsLocations)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<FinishedGoodsLocation | null>(null)
  const [formData, setFormData] = useState({
    zone: '',
    shelf: '',
    description: '',
    capacity: '',
    tempMin: '',
    tempMax: '',
  })

  const resetForm = () => {
    setFormData({
      zone: '',
      shelf: '',
      description: '',
      capacity: '',
      tempMin: '',
      tempMax: '',
    })
    setEditingLocation(null)
  }

  const handleAddLocation = () => {
    if (!formData.zone || !formData.shelf || !formData.capacity) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }

    const newLocation: FinishedGoodsLocation = {
      id: `${formData.zone}${formData.shelf}`,
      zone: formData.zone.toUpperCase(),
      shelf: formData.shelf,
      description: formData.description || `Kệ khu ${formData.zone}`,
      used: 0,
      capacity: parseInt(formData.capacity),
      qcStatus: 'pending',
      expiryDate: null,
      manufactureDate: null,
      currentLot: undefined,
      tempMin: parseInt(formData.tempMin) || 15,
      tempMax: parseInt(formData.tempMax) || 25,
    }

    setLocations(prev => [...prev, newLocation])
    setIsAddDialogOpen(false)
    resetForm()
  }

  const handleEditLocation = (location: FinishedGoodsLocation) => {
    setEditingLocation(location)
    setFormData({
      zone: location.zone,
      shelf: location.shelf,
      description: location.description,
      capacity: location.capacity.toString(),
      tempMin: location.tempMin.toString(),
      tempMax: location.tempMax.toString(),
    })
    setIsAddDialogOpen(true)
  }

  const handleUpdateLocation = () => {
    if (!editingLocation) return

    const updatedLocation: FinishedGoodsLocation = {
      ...editingLocation,
      zone: formData.zone.toUpperCase(),
      shelf: formData.shelf,
      description: formData.description,
      capacity: parseInt(formData.capacity),
      tempMin: parseInt(formData.tempMin) || 15,
      tempMax: parseInt(formData.tempMax) || 25,
    }

    setLocations(prev => prev.map(loc => 
      loc.id === editingLocation.id ? updatedLocation : loc
    ))
    setIsAddDialogOpen(false)
    resetForm()
  }

  const handleDeleteLocation = (locationId: string) => {
    if (confirm('Bạn có chắc muốn xóa vị trí này?')) {
      setLocations(prev => prev.filter(loc => loc.id !== locationId))
    }
  }

  const summary = useMemo(() => ({
    total: locations.length,
    available: locations.filter((l: FinishedGoodsLocation) => (l.used / l.capacity) < 0.8).length,
    high: locations.filter((l: FinishedGoodsLocation) => {
      const p = l.used / l.capacity
      return p >= 0.8 && p < 1
    }).length,
    full: locations.filter((l: FinishedGoodsLocation) => l.used / l.capacity >= 1).length,
    pendingQC: locations.filter((l: FinishedGoodsLocation) => l.qcStatus === 'pending').length,
    expiring: locations.filter((l: FinishedGoodsLocation) => {
      const days = getDaysUntilExpiry(l.expiryDate)
      return days !== null && days <= 30 && days > 0
    }).length,
  }), [locations])

  const filtered = useMemo<FinishedGoodsLocation[]>(() => {
    return locations.filter((loc: FinishedGoodsLocation) => {
      const status = getUsageStatus(loc)
      const days = getDaysUntilExpiry(loc.expiryDate)
      if (activeFilter === 'all') return true
      if (activeFilter === 'low') return status === 'low'
      if (activeFilter === 'high') return status === 'high'
      if (activeFilter === 'full') return status === 'full'
      if (activeFilter === 'pending-qc') return loc.qcStatus === 'pending'
      if (activeFilter === 'expiring') return days !== null && days <= 30 && days > 0
      return true
    })
  }, [activeFilter, locations])

  return (
    <AppShell title="Kệ thành phẩm" subtitle="Quản lý kệ và vị trí lưu trữ sản phẩm hoàn thiện">
      <div className="space-y-6">

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryCard label="Tổng vị trí" value={summary.total} color="blue" icon={<Package className="size-5 text-blue-600" />} bg="bg-blue-50" />
          <SummaryCard label="Còn trống" value={summary.available} color="emerald" icon={<Package className="size-5 text-emerald-600" />} bg="bg-emerald-50" />
          <SummaryCard label="Gần đầy" value={summary.high} color="amber" icon={<Package className="size-5 text-amber-600" />} bg="bg-amber-50" />
          <SummaryCard label="Đã đầy" value={summary.full} color="red" icon={<Maximize2 className="size-5 text-red-600" />} bg="bg-red-50" />
          <SummaryCard label="Chờ QC" value={summary.pendingQC} color="amber" icon={<Clock className="size-5 text-amber-600" />} bg="bg-amber-50" />
          <SummaryCard label="Sắp hết hạn" value={summary.expiring} color="red" icon={<AlertTriangle className="size-5 text-red-600" />} bg="bg-red-50" />
        </div>

        {/* Actions row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filter chips */}
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setActiveFilter(opt.value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  activeFilter === opt.value
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Add location dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
                <Plus className="mr-2 size-4" />
                Thêm vị trí mới
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingLocation ? 'Chỉnh sửa vị trí kệ thành phẩm' : 'Thêm vị trí kệ thành phẩm'}</DialogTitle>
                <DialogDescription>{editingLocation ? 'Cập nhật thông tin vị trí lưu trữ' : 'Tạo vị trí lưu trữ mới cho thành phẩm'}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <FormRow label="Khu vực" htmlFor="zone">
                  <Input 
                    id="zone" 
                    placeholder="P, Q, R..." 
                    value={formData.zone}
                    onChange={(e) => setFormData(prev => ({ ...prev, zone: e.target.value }))}
                  />
                </FormRow>
                <FormRow label="Số kệ" htmlFor="shelf">
                  <Input 
                    id="shelf" 
                    type="number" 
                    placeholder="1, 2, 3..." 
                    value={formData.shelf}
                    onChange={(e) => setFormData(prev => ({ ...prev, shelf: e.target.value }))}
                  />
                </FormRow>
                <FormRow label="Mô tả" htmlFor="desc">
                  <Input 
                    id="desc" 
                    placeholder="Kệ thành phẩm..." 
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </FormRow>
                <FormRow label="Sức chứa" htmlFor="cap">
                  <Input 
                    id="cap" 
                    type="number" 
                    placeholder="200" 
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                  />
                </FormRow>
                <FormRow label="Nhiệt độ" htmlFor="temp">
                  <div className="flex items-center gap-2">
                    <Input 
                      id="temp-min" 
                      type="number" 
                      placeholder="Min (°C)" 
                      value={formData.tempMin}
                      onChange={(e) => setFormData(prev => ({ ...prev, tempMin: e.target.value }))}
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input 
                      id="temp-max" 
                      type="number" 
                      placeholder="Max (°C)" 
                      value={formData.tempMax}
                      onChange={(e) => setFormData(prev => ({ ...prev, tempMax: e.target.value }))}
                    />
                  </div>
                </FormRow>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={editingLocation ? handleUpdateLocation : handleAddLocation}>
                  {editingLocation ? 'Cập nhật' : 'Thêm'} vị trí
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Shelf grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Sơ đồ kệ thành phẩm</CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Không có vị trí nào phù hợp với bộ lọc.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(loc => (
                  <ShelfCard 
                    key={loc.id} 
                    location={loc} 
                    onEdit={handleEditLocation}
                    onDelete={handleDeleteLocation}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function SummaryCard({
  label,
  value,
  color,
  icon,
  bg,
}: {
  label: string
  value: number
  color: string
  icon: React.ReactNode
  bg: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('rounded-lg p-2.5', bg)}>{icon}</div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn('text-2xl font-bold', `text-${color}-600`)}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ShelfCard({ 
  location,
  onEdit,
  onDelete,
}: { 
  location: FinishedGoodsLocation
  onEdit: (location: FinishedGoodsLocation) => void
  onDelete: (locationId: string) => void
}) {
  const usagePct = (location.used / location.capacity) * 100
  const status = getUsageStatus(location)
  const daysLeft = getDaysUntilExpiry(location.expiryDate)
  const isExpiringSoon = daysLeft !== null && daysLeft <= 30 && daysLeft > 0
  const qc = QC_CONFIG[location.qcStatus]

  const COLOR = {
    full:   { id: 'bg-red-500',     border: 'border-red-300',   bar: '[&>div]:bg-red-500',   badge: 'bg-red-100 text-red-700',   label: 'Đã đầy' },
    high:   { id: 'bg-amber-500',   border: 'border-amber-300', bar: '[&>div]:bg-amber-500', badge: 'bg-amber-100 text-amber-700', label: 'Gần đầy' },
    medium: { id: 'bg-primary',     border: '',                 bar: '',                      badge: 'bg-primary/10 text-primary', label: 'Trung bình' },
    low:    { id: 'bg-emerald-500', border: '',                 bar: '[&>div]:bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', label: 'Còn trống' },
  }[status]

  return (
    <Card className={cn('relative overflow-hidden transition-all hover:shadow-md', COLOR.border)}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('flex size-10 items-center justify-center rounded-lg font-bold text-white text-sm', COLOR.id)}>
              {location.id}
            </div>
            <div>
              <p className="font-medium text-sm">Khu {location.zone} - Kệ {location.shelf}</p>
              <p className="text-xs text-muted-foreground">{location.description}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="size-8 shrink-0"
              onClick={() => onEdit(location)}
            >
              <Edit2 className="size-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="size-8 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onDelete(location.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        {/* Badges row */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {/* QC status */}
          <Badge variant="secondary" className={cn('flex items-center gap-1 text-xs', qc.className)}>
            {qc.icon}
            {qc.label}
          </Badge>

          {/* Lot code */}
          {location.currentLot && (
            <Badge variant="secondary" className="text-xs">
              {location.currentLot}
            </Badge>
          )}

          {/* Expiry warning */}
          {isExpiringSoon && (
            <Badge variant="secondary" className="flex items-center gap-1 bg-red-100 text-red-700 text-xs">
              <AlertTriangle className="size-3" />
              Còn {daysLeft} ngày
            </Badge>
          )}
        </div>

        {/* Dates */}
        {location.currentLot && (
          <div className="mb-3 grid grid-cols-2 gap-x-3 text-xs text-muted-foreground">
            <div>
              <span className="text-[10px] uppercase tracking-wide">NSX</span>
              <p className="font-medium text-foreground">{formatDate(location.manufactureDate)}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wide">HSD</span>
              <p className={cn('font-medium', isExpiringSoon ? 'text-red-600' : 'text-foreground')}>
                {formatDate(location.expiryDate)}
              </p>
            </div>
          </div>
        )}

        {/* Temperature */}
        <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Thermometer className="size-3.5" />
          <span>Bảo quản: {location.tempMin}°C – {location.tempMax}°C</span>
        </div>

        {/* Usage bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Sử dụng</span>
            <span className="font-medium">{location.used} / {location.capacity}</span>
          </div>
          <Progress
            value={Math.min(usagePct, 100)}
            className={cn('h-2', COLOR.bar)}
          />
          <div className="flex justify-between items-center">
            <Badge variant="secondary" className={cn('text-xs', COLOR.badge)}>
              {COLOR.label}
            </Badge>
            <span className="text-xs text-muted-foreground">{Math.round(usagePct)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FormRow({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label htmlFor={htmlFor} className="text-right text-sm">
        {label}
      </Label>
      <div className="col-span-3">{children}</div>
    </div>
  )
}