'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import {
  Package,
  Maximize2,
  Plus,
  Edit2,
  Trash2,
  Search,
  Loader2,
  MapPin,
  Thermometer,
  ShieldCheck,
  Clock,
  AlertTriangle
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
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils'
import { useShelves, useCreateShelf, useUpdateShelf, useDeleteShelf } from '@/features/inventory/hooks/use-shelves'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { shelfSchema, ShelfFormData } from '@/lib/schemas/shelf.schema'
import { Shelf } from '@/api/shelf.api'
import { toast } from 'sonner'

export default function FinishedGoodsLocationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null)
  const [shelfToDelete, setShelfToDelete] = useState<Shelf | null>(null)

  const { data: response, isLoading } = useShelves({
    category: 'Product',
    search: searchQuery
  })

  const shelves = response?.data || []

  const createShelf = useCreateShelf()
  const updateShelf = useUpdateShelf()
  const deleteShelf = useDeleteShelf()

  const form = useForm<ShelfFormData>({
    resolver: zodResolver(shelfSchema),
    defaultValues: {
      shelfCode: '',
      warehouseSection: '',
      zone: '',
      aisle: '',
      level: '',
      bin: '',
      category: 'Product',
      maxCapacity: 1000,
      status: 'Available',
      description: '',
    },
  })

  const handleAddClick = () => {
    setEditingShelf(null)
    form.reset({
      shelfCode: '',
      warehouseSection: '',
      zone: '',
      aisle: '',
      level: '',
      bin: '',
      category: 'Product',
      maxCapacity: 1000,
      status: 'Available',
      description: '',
    })
    setIsDialogOpen(true)
  }

  const handleEditClick = (shelf: Shelf) => {
    setEditingShelf(shelf)
    form.reset({
      shelfCode: shelf.shelfCode,
      warehouseSection: shelf.warehouseSection,
      zone: shelf.zone || '',
      aisle: shelf.aisle || '',
      level: shelf.level || '',
      bin: shelf.bin || '',
      category: shelf.category,
      maxCapacity: shelf.maxCapacity,
      status: shelf.status,
      description: shelf.description || '',
    })
    setIsDialogOpen(true)
  }

  const onSubmit = async (data: ShelfFormData) => {
    if (editingShelf) {
      await updateShelf.mutateAsync({ id: editingShelf._id, data })
    } else {
      await createShelf.mutateAsync(data)
    }
    setIsDialogOpen(false)
  }

  const handleDeleteConfirm = async () => {
    if (shelfToDelete) {
      await deleteShelf.mutateAsync(shelfToDelete._id)
      setShelfToDelete(null)
    }
  }

  // Summary stats
  const totalLocations = shelves.length
  const lowUsage = shelves.filter(l => (l.currentLoad / l.maxCapacity) < 0.5).length
  const highUsage = shelves.filter(l => (l.currentLoad / l.maxCapacity) >= 0.8 && (l.currentLoad / l.maxCapacity) < 1).length
  const fullLocations = shelves.filter(l => (l.currentLoad / l.maxCapacity) >= 1).length

  return (
    <AppShell title="Vị trí kho thành phẩm" subtitle="Quản lý khu vực và kệ lưu trữ sản phẩm hoàn thiện">
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
                  <p className="text-2xl font-bold">{totalLocations}</p>
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
                  <p className="text-sm text-muted-foreground">Sử dụng thấp</p>
                  <p className="text-2xl font-bold text-emerald-600">{lowUsage}</p>
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
                  <p className="text-2xl font-bold text-amber-600">{highUsage}</p>
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
                  <p className="text-2xl font-bold text-red-600">{fullLocations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions & Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm mã kệ..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleAddClick}>
            <Plus className="mr-2 size-4" />
            Thêm vị trí mới
          </Button>
        </div>

        {/* Warehouse Map */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Sơ đồ kệ kho thành phẩm</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : shelves.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                Không tìm thấy vị trí kho nào
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shelves.map((location) => {
                  const usagePercent = (location.currentLoad / location.maxCapacity) * 100
                  const status = usagePercent >= 100 ? 'full' : usagePercent >= 80 ? 'high' : usagePercent >= 50 ? 'medium' : 'low'

                  return (
                    <Card key={location._id} className={cn(
                      "relative overflow-hidden transition-all hover:shadow-md",
                      status === 'full' && "border-red-300",
                      status === 'high' && "border-amber-300",
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "size-10 rounded-lg flex items-center justify-center font-bold text-white text-xs",
                              status === 'full' ? "bg-red-500" :
                                status === 'high' ? "bg-amber-500" :
                                  status === 'medium' ? "bg-primary" : "bg-emerald-500"
                            )}>
                              {location.shelfCode}
                            </div>
                            <div>
                              <p className="font-medium text-sm">Khu {location.warehouseSection}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-muted-foreground truncate max-w-[120px]">{location.description || 'Không có mô tả'}</p>
                                {location.items && location.items.length > 0 && (
                                  <HoverCard>
                                    <HoverCardTrigger asChild>
                                      <Badge variant="outline" className="text-[10px] px-1 h-4 cursor-help">
                                        {location.items.length} sản phẩm
                                      </Badge>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-80">
                                      <div className="space-y-2">
                                        <h4 className="text-sm font-semibold">Sản phẩm đang lưu trữ</h4>
                                        <div className="max-h-[200px] overflow-auto space-y-2">
                                          {location.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs border-b pb-1 last:border-0">
                                              <span>{item.name} ({item.code})</span>
                                              <span className="font-medium">{item.currentStock.toLocaleString()} {item.unit}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEditClick(location)}>
                              <Edit2 className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setShelfToDelete(location)}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Sử dụng</span>
                            <span className="font-medium">{location.currentLoad.toLocaleString()} / {location.maxCapacity.toLocaleString()}</span>
                          </div>
                          <Progress
                            value={Math.min(usagePercent, 100)}
                            className={cn(
                              "h-1.5",
                              status === 'full' && "[&>div]:bg-red-500",
                              status === 'high' && "[&>div]:bg-amber-500",
                              status === 'medium' && "[&>div]:bg-primary",
                              status === 'low' && "[&>div]:bg-emerald-500"
                            )}
                          />
                          <div className="flex justify-between items-center">
                            <Badge variant="secondary" className={cn(
                              "text-[10px] px-1.5 py-0 h-5",
                              status === 'full' && "bg-red-100 text-red-700",
                              status === 'high' && "bg-amber-100 text-amber-700",
                              status === 'medium' && "bg-primary/10 text-primary",
                              status === 'low' && "bg-emerald-100 text-emerald-700"
                            )}>
                              {status === 'full' ? 'Đã đầy' :
                                status === 'high' ? 'Gần đầy' :
                                  status === 'medium' ? 'Trung bình' : 'Còn trống'}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {Math.round(usagePercent)}%
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingShelf ? 'Cập nhật vị trí kho' : 'Thêm vị trí kho mới'}</DialogTitle>
            <DialogDescription>
              {editingShelf ? 'Chỉnh sửa thông tin vị trí lưu trữ' : 'Tạo vị trí lưu trữ mới cho thành phẩm'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="shelfCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã kệ</FormLabel>
                    <FormControl>
                      <Input placeholder="Ví dụ: P1-01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="warehouseSection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Khu vực</FormLabel>
                    <FormControl>
                      <Input placeholder="Ví dụ: A, B, C..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="zone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vùng (Zone)</FormLabel>
                      <FormControl>
                        <Input placeholder="Zone A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="aisle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dãy (Aisle)</FormLabel>
                      <FormControl>
                        <Input placeholder="Dãy 1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tầng (Level)</FormLabel>
                      <FormControl>
                        <Input placeholder="Tầng 3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ô (Bin)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ô 12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxCapacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sức chứa tối đa</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trạng thái</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn trạng thái" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Available">Sẵn dùng</SelectItem>
                          <SelectItem value="Full">Đã đầy</SelectItem>
                          <SelectItem value="Maintenance">Bảo trì</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl>
                      <Input placeholder="Kệ thành phẩm đóng gói..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                <Button type="submit" disabled={createShelf.isPending || updateShelf.isPending}>
                  {(createShelf.isPending || updateShelf.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingShelf ? 'Cập nhật' : 'Thêm vị trí'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!shelfToDelete} onOpenChange={(open) => !open && setShelfToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa kệ này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Kệ chỉ có thể bị xóa nếu không chứa bất kỳ nguyên vật liệu hay sản phẩm nào.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              {deleteShelf.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xóa kệ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  )
}
