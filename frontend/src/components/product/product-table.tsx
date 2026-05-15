import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Boxes, Package, MoreVertical, ExternalLink, Trash2, History } from "lucide-react"
import { cn } from "@/lib/utils"
import { CurrencyDisplay } from "@/components/ui/currency-display"
import type { Product, PaginationData } from "@/lib/types"
import { calculateBaseCost } from "@/app/products/utils"

export function ProductSkeleton() {
    return (
        <TableRow>
            <TableCell><div className="h-12 w-48 animate-pulse rounded bg-muted" /></TableCell>
            <TableCell><div className="h-6 w-24 animate-pulse rounded bg-muted" /></TableCell>
            <TableCell><div className="ml-auto h-6 w-20 animate-pulse rounded bg-muted" /></TableCell>
            <TableCell><div className="ml-auto h-6 w-20 animate-pulse rounded bg-muted" /></TableCell>
            <TableCell><div className="h-6 w-24 animate-pulse rounded bg-muted" /></TableCell>
            <TableCell><div className="h-8 w-8 animate-pulse rounded bg-muted" /></TableCell>
        </TableRow>
    )
}

interface Props {
    products: Product[]
    isLoading: boolean
    isRefreshing: boolean
    pagination: PaginationData | null
    currentPage: number
    setCurrentPage: (page: number | ((p: number) => number)) => void
    handleResetFilters: () => void
    handleDeleteProduct: (id: string) => void
    isProductionManager: boolean
    onViewHistory: (product: Product) => void
}

export function ProductTable({ products, isLoading, isRefreshing, pagination, currentPage, setCurrentPage, handleResetFilters, handleDeleteProduct, isProductionManager, onViewHistory }: Props) {
    const router = useRouter()

    return (
        <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="font-bold text-foreground py-4">Sản phẩm</TableHead>
                            <TableHead className="font-bold text-foreground">Danh mục</TableHead>
                            <TableHead className="text-right font-bold text-foreground">Giá gốc (BOM)</TableHead>
                            <TableHead className="text-right font-bold text-foreground">Tồn kho</TableHead>
                            <TableHead className="font-bold text-foreground">Trạng thái</TableHead>
                            <TableHead className="w-12"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array(5).fill(0).map((_, i) => <ProductSkeleton key={i} />)
                        ) : products.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-60 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                        <Boxes className="h-12 w-12 opacity-20" />
                                        <p className="text-lg font-medium">Không tìm thấy sản phẩm nào</p>
                                        <Button variant="link" onClick={handleResetFilters}>Xóa bộ lọc</Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            products.map((product) => (
                                <TableRow key={product._id} className="group hover:bg-muted/20 transition-colors">
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden shrink-0 border border-muted">
                                                {product.productImage ? (
                                                    <img src={product.productImage} alt={product.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center"><Package className="h-6 w-6 text-muted-foreground/30" /></div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-foreground truncate">{product.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{product.code}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="bg-muted/50 text-muted-foreground font-medium">{product.category}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        <CurrencyDisplay value={calculateBaseCost(product)} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold">{product.currentStock}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase">{product.unit}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("font-medium", (product.stockLevel === "Nguy cấp" || product.stockLevel === "critical") ? "border-red-200 bg-red-50 text-red-700" : (product.stockLevel === "Sắp hết" || product.stockLevel === "low") ? "border-amber-200 bg-amber-50 text-amber-700" : "border-green-200 bg-green-50 text-green-700")}>
                                            {product.stockLevel === "critical" ? "Nguy cấp" : product.stockLevel === "low" ? "Sắp hết" : product.stockLevel === "normal" ? "Ổn định" : (product.stockLevel || "Ổn định")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-xl">
                                                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => router.push(`/products/${product._id}`)}>
                                                    <ExternalLink className="h-4 w-4" /> Xem chi tiết {isProductionManager && "/ Sửa"}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => onViewHistory(product)}>
                                                    <History className="h-4 w-4" /> Lịch sử lưu kho
                                                </DropdownMenuItem>
                                                {isProductionManager && (
                                                    <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive cursor-pointer" onClick={() => handleDeleteProduct(product._id)}>
                                                        <Trash2 className="h-4 w-4" /> Xóa
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
                        <p className="text-sm text-muted-foreground">
                            Hiển thị <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> - <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> trong <span className="font-medium">{pagination.total}</span> sản phẩm
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isRefreshing} className="rounded-lg h-9">
                                Trước
                            </Button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                                    <Button key={page} variant={currentPage === page ? "default" : "ghost"} size="sm" onClick={() => setCurrentPage(page)} className={cn("h-9 w-9 p-0 rounded-lg", currentPage === page ? "shadow-md" : "")}>
                                        {page}
                                    </Button>
                                ))}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))} disabled={currentPage === pagination.pages || isRefreshing} className="rounded-lg h-9">
                                Sau
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}