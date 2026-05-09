import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Edit2, MapPin } from 'lucide-react'
import { Material } from '@/lib/types'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface InventoryTableProps {
    materials: Material[];
    onView: (material: Material) => void;
    onEdit: (material: Material) => void;
}

const STATUS_COLOR: Record<string, string> = {
    'Bình thường': 'bg-emerald-100 text-emerald-700',
    'Sắp hết': 'bg-amber-100 text-amber-700',
    'Nguy cấp': 'bg-red-100 text-red-700',
    'Tồn dư': 'bg-blue-100 text-blue-700',
}

export function InventoryTable({ materials, onView, onEdit }: InventoryTableProps) {
    return (
        <div className="rounded-md border bg-white">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Mã NVL</TableHead>
                        <TableHead>Tên nguyên vật liệu</TableHead>
                        <TableHead>Tồn kho</TableHead>
                        <TableHead>Đơn vị</TableHead>
                        <TableHead>Vị trí</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Cập nhật cuối</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {materials.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                Không tìm thấy kết quả nào.
                            </TableCell>
                        </TableRow>
                    ) : (
                        materials.map((item) => (
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
                                    <div className="flex items-center gap-1 text-xs">
                                        <MapPin className="size-3 text-muted-foreground" />
                                        {item.location || 'N/A'}
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
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" className="size-8" onClick={() => onView(item)}>
                                            <Eye className="size-4 text-blue-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(item)}>
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
