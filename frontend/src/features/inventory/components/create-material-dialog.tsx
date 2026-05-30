"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCreateMaterial } from "../hooks/use-materials"
import { useShelves } from "../hooks/use-shelves"
import { Loader2 } from "lucide-react"

const materialSchema = z.object({
    name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
    code: z.string().min(2, "Mã phải có ít nhất 2 ký tự").toUpperCase(),
    unit: z.string().min(1, "Đơn vị tính là bắt buộc"),
    color: z.string().min(1, "Màu sắc là bắt buộc"),
    price: z.coerce.number().min(0, "Giá không được âm"),
    threshold: z.coerce.number().min(0, "Ngưỡng cảnh báo không được âm"),
    shelf: z.string().min(1, "Vị trí kho là bắt buộc"),
    locationDetails: z.string().optional(),
    description: z.string().optional(),
    supplier: z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
        address: z.string().optional(),
        contactPerson: z.string().optional(),
        notes: z.string().optional(),
    }),
})

type MaterialFormValues = z.infer<typeof materialSchema>

interface CreateMaterialDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CreateMaterialDialog({
    open,
    onOpenChange,
}: CreateMaterialDialogProps) {
    const { data: shelvesResponse } = useShelves()
    const shelves = shelvesResponse?.data || []

    const createMutation = useCreateMaterial()

    const form = useForm<MaterialFormValues>({
        resolver: zodResolver(materialSchema),
        defaultValues: {
            name: "",
            code: "",
            unit: "",
            color: "",
            price: 0,
            threshold: 10,
            shelf: "",
            locationDetails: "",
            description: "",
            supplier: {
                name: "",
                phone: "",
                email: "",
                address: "",
                contactPerson: "",
                notes: "",
            },
        },
    })

    useEffect(() => {
        if (open) {
            form.reset({
                name: "",
                code: "",
                unit: "",
                color: "",
                price: 0,
                threshold: 10,
                shelf: "",
                locationDetails: "",
                description: "",
                supplier: {
                    name: "",
                    phone: "",
                    email: "",
                    address: "",
                    contactPerson: "",
                    notes: "",
                },
            })
        }
    }, [open, form])

    const onSubmit = (values: MaterialFormValues) => {
        createMutation.mutate(values as any, {
            onSuccess: () => onOpenChange(false),
        })
    }

    const isLoading = createMutation.isPending

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:max-w-[90vw] lg:max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Thêm nguyên vật liệu mới
                    </DialogTitle>
                    <DialogDescription>
                        Nhập thông tin cho nguyên vật liệu mới.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tên nguyên vật liệu</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Ví dụ: Len Cotton" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mã NVL</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Ví dụ: MAT-COT-01" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Đơn vị tính</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Ví dụ: cuộn, gram" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="color"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Màu sắc</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Ví dụ: Đỏ, Xanh" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Đơn giá (VND)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="threshold"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ngưỡng cảnh báo tồn kho</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="shelf"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Vị trí kho (Kệ)</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Chọn vị trí kệ" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {shelves.map((shelf: any) => (
                                                    <SelectItem key={shelf._id} value={shelf._id}>
                                                        {shelf.shelfCode} ({shelf.warehouseSection})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="col-span-2">
                                <FormField
                                    control={form.control}
                                    name="locationDetails"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Chi tiết vị trí (Ô/Ngăn)</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Ví dụ: Tầng 1, Ngăn A" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="col-span-2">
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mô tả</FormLabel>
                                            <FormControl>
                                                <Textarea {...field} placeholder="Thông tin bổ sung..." />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold border-b pb-2">Thông tin nhà cung cấp</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="supplier.name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tên nhà cung cấp</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="supplier.phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Số điện thoại</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="supplier.email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="supplier.contactPerson"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Người liên hệ</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="col-span-2">
                                    <FormField
                                        control={form.control}
                                        name="supplier.address"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Địa chỉ</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Tạo mới
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent >
        </Dialog >
    )
}
