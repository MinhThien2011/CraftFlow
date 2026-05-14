import { useState } from "react"
import { useRouter } from "next/navigation"
import { Package, Boxes, ChevronDown, ChevronRight, Edit } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CurrencyDisplay } from "@/components/ui/currency-display"
import type { Product } from "@/lib/types"
import { calculateBaseCost } from "@/app/products/utils"

export function BOMSkeleton() {
    return (
        <Card className="animate-pulse border-none shadow-sm">
            <div className="p-4 flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-muted rounded" />
                    <div className="h-3 w-1/4 bg-muted rounded" />
                </div>
                <div className="h-10 w-32 bg-muted rounded-xl" />
            </div>
        </Card>
    )
}

interface Props {
    products: Product[]
    isLoading: boolean
    isProductionManager: boolean
}

export function BOMList({ products, isLoading, isProductionManager }: Props) {
    const router = useRouter()
    const [expandedBOM, setExpandedBOM] = useState<string | null>(null)

    if (isLoading) {
        return <div className="flex flex-col gap-4">{Array(5).fill(0).map((_, i) => <BOMSkeleton key={i} />)}</div>
    }

    if (products.length === 0) {
        return (
            <div className="h-60 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-white rounded-2xl shadow-sm border border-dashed">
                <Package className="h-12 w-12 opacity-20" />
                <p className="text-lg font-medium">Chưa có dữ liệu định mức</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            {products.map((product) => (
                <Card key={product._id} className="border-none shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
                    <Collapsible open={expandedBOM === product._id} onOpenChange={(open) => setExpandedBOM(open ? product._id : null)}>
                        <div className="p-4 flex flex-col md:flex-row md:items-center gap-6">
                            <div className="h-20 w-20 rounded-2xl bg-muted overflow-hidden shrink-0 border border-muted shadow-sm">
                                {product.productImage ? (
                                    <img src={product.productImage} alt={product.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center"><Package className="h-8 w-8 text-muted-foreground/30" /></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors">{product.name}</h3>
                                    <Badge className="bg-[#4A7C23]/10 text-[#4A7C23] border-[#4A7C23]/20 font-bold shrink-0">{product.estimateMaterialCost?.length || 0} nguyên liệu</Badge>
                                </div>
                                <p className="text-xs font-mono text-muted-foreground uppercase flex items-center gap-2"><Boxes className="h-3 w-3" />{product.code}<span className="h-1 w-1 rounded-full bg-muted-foreground/30" />{product.category}</p>
                            </div>
                            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                                <div className="text-center md:text-right">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Chi phí dự kiến</p>
                                    <p className="font-black text-xl text-[#8B7355]"><CurrencyDisplay value={calculateBaseCost(product)} /></p>
                                </div>
                                <CollapsibleTrigger asChild>
                                    <Button variant="outline" className="rounded-xl px-6 h-12 gap-2 border-muted hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group/btn">
                                        <span className="text-sm font-bold">{expandedBOM === product._id ? "Đóng chi tiết" : "Xem định mức"}</span>
                                        {expandedBOM === product._id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                </CollapsibleTrigger>
                            </div>
                        </div>
                        <CollapsibleContent className="px-4 pb-4">
                            <div className="rounded-2xl bg-muted/30 border border-muted/50 p-6">
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {product.estimateMaterialCost && product.estimateMaterialCost.length > 0 ? (
                                        product.estimateMaterialCost.map((item, index) => (
                                            <div key={index} className="flex items-center gap-4 p-3 rounded-xl bg-white shadow-sm border border-muted/50 group/item hover:border-primary/30 transition-colors">
                                                <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0"><Package className="h-5 w-5 text-primary/40" /></div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-foreground truncate">{typeof item.material === 'object' && item.material !== null ? (item.material as any).name : item.materialCode || 'Nguyên liệu không xác định'}</p>
                                                    <p className="text-[10px] text-muted-foreground font-mono">{item.materialCode || (item.material as any)?.code}</p>
                                                </div>
                                                {(() => {
                                                    const qty = item.quantity ?? (item as any).qtyPerUnit ?? (item as any).amount ?? 0;
                                                    const price = item.priceAtTime ?? (item.material as any)?.price ?? 0;
                                                    return (
                                                        <div className="text-right shrink-0">
                                                            <p className="text-sm font-black text-foreground">{qty} <span className="text-[10px] font-normal text-muted-foreground uppercase ml-0.5">{item.unit || (item.material as any)?.unit}</span></p>
                                                            <p className="text-[10px] text-muted-foreground"><CurrencyDisplay value={price * qty} /></p>
                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                        ))
                                    ) : <div className="col-span-full py-8 text-center"><p className="text-sm text-muted-foreground italic">Chưa thiết lập định mức nguyên liệu cho sản phẩm này.</p></div>}
                                </div>
                                {isProductionManager && (
                                    <div className="mt-6 flex justify-end"><Button size="sm" className="rounded-lg gap-2" onClick={() => router.push(`/products/${product._id}`)}><Edit className="h-3.5 w-3.5" />Cập nhật định mức</Button></div>
                                )}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>
            ))}
        </div>
    )
}