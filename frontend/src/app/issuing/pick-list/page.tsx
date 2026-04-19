'use client'

import { useState } from 'react'
import { Search, Printer, CheckCircle2, MapPin, Package, ArrowRight, QrCode } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

const pickLists = [
  {
    id: 'PL-2024-001',
    issueNo: 'PX-2024-00089',
    department: 'Xưởng sản xuất A',
    productionOrder: 'LSX-2024-001',
    createdAt: '2024-01-15 10:45',
    status: 'in_progress',
    progress: 60,
    items: [
      {
        id: '1',
        materialCode: 'LEN-001',
        materialName: 'Len cotton cao cấp',
        location: 'A-01-01',
        quantity: 50,
        picked: true,
        unit: 'cuộn'
      },
      {
        id: '2',
        materialCode: 'LEN-002',
        materialName: 'Len acrylic',
        location: 'A-01-02',
        quantity: 30,
        picked: true,
        unit: 'cuộn'
      },
      {
        id: '3',
        materialCode: 'PKN-001',
        materialName: 'Phụ kiện nút áo',
        location: 'B-02-01',
        quantity: 200,
        picked: false,
        unit: 'bộ'
      },
      {
        id: '4',
        materialCode: 'CHI-001',
        materialName: 'Chỉ may màu trắng',
        location: 'C-01-03',
        quantity: 20,
        picked: false,
        unit: 'cuộn'
      }
    ]
  },
  {
    id: 'PL-2024-002',
    issueNo: 'PX-2024-00088',
    department: 'Xưởng sản xuất B',
    productionOrder: 'LSX-2024-002',
    createdAt: '2024-01-15 09:30',
    status: 'pending',
    progress: 0,
    items: [
      {
        id: '1',
        materialCode: 'VAI-001',
        materialName: 'Vải lót',
        location: 'D-01-01',
        quantity: 100,
        picked: false,
        unit: 'm'
      },
      {
        id: '2',
        materialCode: 'KEO-001',
        materialName: 'Keo dán',
        location: 'E-02-01',
        quantity: 50,
        picked: false,
        unit: 'hộp'
      }
    ]
  }
]

export default function PickListPage() {
  const [selectedPickList, setSelectedPickList] = useState(pickLists[0])
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPickLists = pickLists.filter(
    (pl) =>
      pl.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pl.department.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <AppShell title="Pick List" subtitle="Danh sách lấy hàng theo vị trí kho">
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-end">
          <div className="flex gap-2">
            <Button variant="outline">
              <QrCode className="size-4 mr-2" />
              Quét mã
            </Button>
            <Button variant="outline">
              <Printer className="size-4 mr-2" />
              In Pick List
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Pick List Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Danh sách Pick List</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm pick list..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredPickLists.map((pl) => (
                <div
                  key={pl.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPickList.id === pl.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedPickList(pl)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{pl.id}</span>
                    <Badge
                      className={
                        pl.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : pl.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }
                    >
                      {pl.status === 'in_progress'
                        ? 'Đang lấy'
                        : pl.status === 'completed'
                        ? 'Hoàn thành'
                        : 'Chờ lấy'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{pl.department}</p>
                  <div className="flex items-center gap-2">
                    <Progress value={pl.progress} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground">{pl.progress}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pick List Detail */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {selectedPickList.id}
                    <Badge variant="outline">{selectedPickList.productionOrder}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {selectedPickList.department} | {selectedPickList.createdAt}
                  </CardDescription>
                </div>
                <Button disabled={selectedPickList.progress < 100}>
                  <CheckCircle2 className="size-4 mr-2" />
                  Hoàn thành Pick
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Route Optimization */}
              <div className="rounded-lg border bg-muted/30 p-3 mb-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  Lộ trình tối ưu
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground overflow-x-auto">
                  {selectedPickList.items.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-1 rounded ${
                          item.picked ? 'bg-emerald-100 text-emerald-700' : 'bg-background'
                        }`}
                      >
                        {item.location}
                      </span>
                      {index < selectedPickList.items.length - 1 && (
                        <ArrowRight className="size-4 text-muted-foreground/50" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {selectedPickList.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border ${
                      item.picked ? 'bg-emerald-50 border-emerald-200' : 'bg-background'
                    }`}
                  >
                    <Checkbox checked={item.picked} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{item.materialName}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.materialCode}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {item.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="size-3" />
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    </div>
                    {item.picked ? (
                      <CheckCircle2 className="size-6 text-emerald-500" />
                    ) : (
                      <Button size="sm">Pick</Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
