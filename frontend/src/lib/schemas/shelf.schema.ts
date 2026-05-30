import { z } from "zod";

export const shelfSchema = z.object({
    shelfCode: z.string().min(1, "Mã kệ không được để trống"),
    warehouseSection: z.string().min(1, "Khu vực không được để trống"),
    zone: z.string().optional(),
    aisle: z.string().optional(),
    level: z.string().optional(),
    bin: z.string().optional(),
    category: z.enum(['Material', 'Product', 'General']).default('Material'),
    maxCapacity: z.number().min(0, "Sức chứa không được âm").default(1000),
    status: z.enum(['Available', 'Full', 'Maintenance']).default('Available'),
    description: z.string().optional(),
});

export type ShelfFormData = z.infer<typeof shelfSchema>;
