"use client"

import { useState } from "react"
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  Target,
  RefreshCw,
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { products, boms } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default function AIPricingPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " VND"
  }

  const handleAnalyze = () => {
    setIsAnalyzing(true)
    setTimeout(() => setIsAnalyzing(false), 2000)
  }

  // Calculate profit margin
  const getMargin = (basePrice: number, suggestedPrice?: number) => {
    if (!suggestedPrice) return 0
    return Math.round(((suggestedPrice - basePrice) / basePrice) * 100)
  }

  // Get BOM cost for a product
  const getBOMCost = (productId: string) => {
    const bom = boms.find((b) => b.productId === productId)
    return bom?.totalCost || 0
  }

  return (
    <AppShell title="Định giá AI" subtitle="Chào mừng đến với CRAFTFLOW">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Trợ lý định giá
            </h2>
            <p className="text-sm text-muted-foreground">
              Đề xuất giá bán dựa trên chi phí và xu hướng thị trường
            </p>
          </div>
          <Button className="gap-2" onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Đang phân tích...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Phân tích Tất cả Sản phẩm
              </>
            )}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F3E8FF]">
                <Sparkles className="h-6 w-6 text-[#9333EA]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gợi ý từ AI</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E8F5E9]">
                <TrendingUp className="h-6 w-6 text-[#4A7C23]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Biên lợi nhuận TB</p>
                <p className="text-2xl font-bold text-[#4A7C23]">22%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FFF3E0]">
                <DollarSign className="h-6 w-6 text-[#D4A574]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Giá trung bình</p>
                <p className="text-2xl font-bold">337,500 VND</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E3F2FD]">
                <Target className="h-6 w-6 text-[#17A2B8]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đã tối ưu</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        <Card className="border-[#9333EA]/20 bg-linear-to-r from-[#F3E8FF]/30 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#9333EA]" />
              <CardTitle className="text-base">Phân tích từ AI</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-card p-4">
                <p className="text-sm font-medium text-foreground">
                  Xu hướng thị trường
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nhu cầu thú nhồi bông len đang tăng 15% trong tháng này
                </p>
              </div>
              <div className="rounded-lg bg-card p-4">
                <p className="text-sm font-medium text-foreground">
                  Tối ưu chi phí
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Có thể tiết kiệm 8% chi phí bằng cách mua len cotton số lượng lớn
                </p>
              </div>
              <div className="rounded-lg bg-card p-4">
                <p className="text-sm font-medium text-foreground">
                  Cơ hội định giá
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Khăn choàng có thể tăng giá 10% do mùa đông sắp tới
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Phân tích giá Sản phẩm</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-right">Chi phí (BOM)</TableHead>
                  <TableHead className="text-right">Giá cơ bản</TableHead>
                  <TableHead className="text-right">Gợi ý từ AI</TableHead>
                  <TableHead className="text-right">Biên lợi nhuận</TableHead>
                  <TableHead className="text-center">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const bomCost = getBOMCost(product.id)
                  const margin = getMargin(product.basePrice, product.suggestedPrice)

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.category}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {bomCost > 0 ? formatCurrency(bomCost) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.basePrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-[#4A7C23]">
                        {product.suggestedPrice
                          ? formatCurrency(product.suggestedPrice)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "font-medium",
                            margin >= 20 ? "text-[#4A7C23]" : "text-[#FFA500]"
                          )}
                        >
                          +{margin}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={cn(
                            margin >= 20
                              ? "bg-[#4A7C23] text-white"
                              : "bg-[#FFA500] text-white"
                          )}
                        >
                          {margin >= 20 ? "Tốt" : "Cần xem lại"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
