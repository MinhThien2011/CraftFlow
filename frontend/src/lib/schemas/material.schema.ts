import { z } from "zod";

export const materialSchema = z.object({
    name: z.string().min(1, "Tên nguyên vật liệu không được để trống"),
    code: z.string().min(1, "Mã nguyên vật liệu không được để trống"),
    category: z.string().min(1, "Vui lòng chọn danh mục"),
    unit: z.string().min(1, "Vui lòng chọn đơn vị tính"),
    minStock: z.number().min(0, "Mức tồn tối thiểu không được âm"),
    maxStock: z.number().min(0, "Mức tồn tối đa không được âm"),
    location: z.string().optional(),
    description: z.string().optional(),
    threshold: z.number().min(0).optional(),
});

export type MaterialFormData = z.infer<typeof materialSchema>;
