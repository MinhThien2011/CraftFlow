"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { materialApi } from "@/api/material.api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, Loader2 } from "lucide-react";

export default function MaterialAlertPage() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState("");

    // Gọi API lấy danh sách vật tư tồn kho thấp
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["low-stock-materials", { page, limit, search }],
        queryFn: () => materialApi.getLowStockMaterials({ page, limit, search }),
    });

    const materials = data?.data?.materials || (data?.data as any)?.data?.materials || [];
    const pagination = data?.data?.pagination || (data?.data as any)?.data?.pagination;

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Tiêu đề trang */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 text-destructive rounded-lg">
                    <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Cảnh báo vật tư</h1>
                    <p className="text-muted-foreground text-sm">
                        Danh sách nguyên vật liệu có tồn kho dưới mức tối thiểu
                    </p>
                </div>
            </div>

            {/* Trạng thái tải dữ liệu */}
            {isLoading ? (
                <div className="flex flex-col justify-center items-center min-h-[400px] text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p>Đang tải dữ liệu cảnh báo...</p>
                </div>
            ) : isError ? (
                <Card className="p-6 border-destructive/50 bg-destructive/10 text-destructive font-medium">
                    Đã xảy ra lỗi khi tải dữ liệu: {(error as Error).message}
                </Card>
            ) : materials.length === 0 ? (
                <Card className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground shadow-sm">
                    <Package className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-lg font-medium">Kho của bạn đang an toàn</p>
                    <p className="text-sm mt-1">Không có vật tư nào đang ở mức tồn kho thấp.</p>
                </Card>
            ) : (
                <>
                    {/* Lưới hiển thị danh sách vật tư */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {materials.map((material: any) => (
                            <Card
                                key={material._id}
                                className="p-5 border-l-4 border-l-destructive shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                            >
                                <div className="flex justify-between items-start mb-4 gap-2">
                                    <div>
                                        <h3 className="font-semibold text-lg line-clamp-1 text-foreground" title={material.name}>
                                            {material.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">{material.code}</p>
                                    </div>
                                    <span className="inline-flex items-center justify-center bg-destructive text-destructive-foreground text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap">
                                        {material.currentStock} / {material.threshold} {material.unit}
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm mb-4">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Màu sắc:</span>
                                        <span className="font-medium">{material.color || "---"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Giá nhập:</span>
                                        <span className="font-medium">{material.price?.toLocaleString()} đ</span>
                                    </div>
                                </div>

                                {/* Thông tin nhà cung cấp */}
                                <div className="pt-4 border-t border-border bg-muted/30 -mx-5 -mb-5 p-5">
                                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Nhà cung cấp</p>
                                    <p className="font-medium text-sm text-foreground">{material.supplier?.name || "Chưa cập nhật"}</p>
                                    <p className="text-sm text-muted-foreground">{material.supplier?.phone}</p>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Phân trang */}
                    {pagination && pagination.pages > 1 && (
                        <div className="flex items-center justify-center gap-4 mt-8 pt-4">
                            <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                                Trước
                            </Button>
                            <span className="text-sm font-medium text-muted-foreground">
                                Trang {pagination.page} / {pagination.pages}
                            </span>
                            <Button variant="outline" disabled={page === pagination.pages} onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}>
                                Sau
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}