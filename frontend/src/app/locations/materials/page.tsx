'use client'

import { AppShell } from '@/components/app-shell'
import { MapPin, Plus, Edit2, Package, Maximize2 } from 'lucide-react'
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
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { warehouseLocations } from '@/lib/warehouse-mock-data'
import { cn } from '@/lib/utils'

export default function MaterialLocationsPage() {
  return (
    <AppShell title="Vị trí kho nguyên liệu" subtitle="Quản lý kệ và vị trí lưu trữ nguyên vật liệu">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <MapPin className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng vị trí</p>
                  <p className="text-2xl font-bold">{warehouseLocations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-emerald-100 p-3">
                  <Package className="size-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Còn trống</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {warehouseLocations.filter(l => (l.used / l.capacity) < 0.8).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-100 p-3">
                  <Package className="size-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gần đầy</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {warehouseLocations.filter(l => (l.used / l.capacity) >= 0.8 && (l.used / l.capacity) < 1).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-red-100 p-3">
                  <Maximize2 className="size-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đã đầy</p>
                  <p className="text-2xl font-bold text-red-600">
                    {warehouseLocations.filter(l => (l.used / l.capacity) >= 1).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                Thêm vị trí mới
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thêm vị trí kho mới</DialogTitle>
                <DialogDescription>
                  Tạo vị trí lưu trữ mới cho nguyên vật liệu
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="zone" className="text-right">Khu vực</Label>
                  <Input id="zone" placeholder="A, B, C..." className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="shelf" className="text-right">Số kệ</Label>
                  <Input id="shelf" placeholder="1, 2, 3..." className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">Mô tả</Label>
                  <Input id="description" placeholder="Kệ nguyên liệu..." className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="capacity" className="text-right">Sức chứa</Label>
                  <Input id="capacity" type="number" placeholder="100" className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Thêm vị trí</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Warehouse Map */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Sơ đồ kho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {warehouseLocations.map((location) => {
                const usagePercent = (location.used / location.capacity) * 100
                const status = usagePercent >= 100 ? 'full' : usagePercent >= 80 ? 'high' : usagePercent >= 50 ? 'medium' : 'low'
                
                return (
                  <Card key={location.id} className={cn(
                    "relative overflow-hidden transition-all hover:shadow-md",
                    status === 'full' && "border-red-300",
                    status === 'high' && "border-amber-300",
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "size-10 rounded-lg flex items-center justify-center font-bold text-white",
                            status === 'full' ? "bg-red-500" :
                            status === 'high' ? "bg-amber-500" :
                            status === 'medium' ? "bg-primary" : "bg-emerald-500"
                          )}>
                            {location.id}
                          </div>
                          <div>
                            <p className="font-medium">Khu {location.zone} - Kệ {location.shelf}</p>
                            <p className="text-xs text-muted-foreground">{location.description}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="size-8">
                          <Edit2 className="size-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sử dụng</span>
                          <span className="font-medium">{location.used} / {location.capacity}</span>
                        </div>
                        <Progress 
                          value={Math.min(usagePercent, 100)} 
                          className={cn(
                            "h-2",
                            status === 'full' && "[&>div]:bg-red-500",
                            status === 'high' && "[&>div]:bg-amber-500",
                            status === 'medium' && "[&>div]:bg-primary",
                            status === 'low' && "[&>div]:bg-emerald-500"
                          )}
                        />
                        <div className="flex justify-between items-center">
                          <Badge variant="secondary" className={cn(
                            "text-xs",
                            status === 'full' && "bg-red-100 text-red-700",
                            status === 'high' && "bg-amber-100 text-amber-700",
                            status === 'medium' && "bg-primary/10 text-primary",
                            status === 'low' && "bg-emerald-100 text-emerald-700"
                          )}>
                            {status === 'full' ? 'Đã đầy' : 
                             status === 'high' ? 'Gần đầy' : 
                             status === 'medium' ? 'Trung bình' : 'Còn trống'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(usagePercent)}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
