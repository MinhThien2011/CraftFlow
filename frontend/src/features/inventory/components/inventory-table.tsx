import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Edit2, MapPin, History } from 'lucide-react'
import { Material, Product } from '@/lib/types'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface InventoryTableProps {
    items: (Material | Product)[];
    onView: (item: Material | Product) => void;
    onEdit: (item: Material | Product) => void;
    onHistory?: (item: Material | Product) => void;
}

const STATUS_COLOR: Record<string, string> = {
    'Bình thường': 'bg-emerald-100 text-emerald-700',
    'Sắp hết': 'bg-amber-100 text-amber-700',
    'Nguy cấp': 'bg-red-100 text-red-700',
    'Tồn dư': 'bg-blue-100 text-blue-700',
}

export function InventoryTable({ items, onView, onEdit, onHistory }: InventoryTableProps) {
    return (
        <div className="rounded-md border bg-white">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Mã</TableHead>
                        <TableHead>Tên mặt hàng</TableHead>
                        <TableHead>Tồn kho</TableHead>
                        <TableHead>Đơn vị</TableHead>
                        <TableHead>Vị trí</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Cập nhật cuối</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                Không tìm thấy kết quả nào.
                            </TableCell>
                        </TableRow>
                    ) : (
                        items.map((item) => (
                            <TableRow key={item._id}>
                                <TableCell className="font-medium text-blue-600">{item.code}</TableCell>
                                <TableCell>
                                    <div>
                                        <div className="font-medium">{item.name}</div>
                                        <div className="text-xs text-muted-foreground">{item.description || 'Không có mô tả'}</div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className={item.currentStock <= item.threshold ? 'text-destructive font-bold' : ''}>
                                        {item.currentStock.toLocaleString()}
                                    </span>
                                </TableCell>
                                <TableCell>{item.unit}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-0.5 text-xs">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="size-3 text-muted-foreground" />
                                            <span className="font-medium">
                                                {item.shelf?.shelfCode || 'N/A'}
                                            </span>
                                        </div>
                                        {item.locationDetails && (
                                            <span className="text-[10px] text-muted-foreground ml-4">
                                                {item.locationDetails}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={`${STATUS_COLOR[item.stockLevel || 'Bình thường']} border-none shadow-none`}>
                                        {item.stockLevel || 'Bình thường'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {item.updatedAt ? format(new Date(item.updatedAt), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="icon" className="size-8" onClick={() => onHistory?.(item)} title="Xem lịch sử">
                                            <History className="size-4 text-emerald-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="size-8" onClick={() => onView(item)} title="Xem chi tiết">
                                            <Eye className="size-4 text-blue-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(item)} title="Chỉnh sửa">
                                            <Edit2 className="size-4 text-amber-600" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
