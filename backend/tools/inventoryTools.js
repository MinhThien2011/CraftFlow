import Material from '../models/Material.js';

export const getLowStockMaterials = {
    declaration: {
        name: "get_low_stock_materials",
        description: "Lấy danh sách các nguyên liệu sắp hết hàng (dưới ngưỡng tối thiểu).",
        parameters: {
            type: "OBJECT",
            properties: {}
        }
    },
    roles: ['kho_manager', 'admin'],

    execute: async (args, user) => {
        try {
            // Tìm các nguyên liệu có currentStock <= threshold
            const materials = await Material.find({
                $expr: { $lte: ["$currentStock", "$threshold"] },
                isActive: true
            })
            .select('name code currentStock threshold unit')
            .limit(10)
            .lean();

            const formattedMaterials = materials.map(m => ({
                name: m.name,
                code: m.code,
                stock: `${m.currentStock} ${m.unit}`,
                threshold: `${m.threshold} ${m.unit}`,
                status: 'Sắp hết hàng'
            }));

            return {
                total: formattedMaterials.length,
                materials: formattedMaterials,
                message: formattedMaterials.length > 0 
                    ? "Đây là danh sách các nguyên liệu đang ở mức cảnh báo hết hàng." 
                    : "Hiện tại không có nguyên liệu nào ở mức cảnh báo."
            };
        } catch (error) {
            console.error('Error in getLowStockMaterials:', error);
            return { error: "Không thể lấy danh sách nguyên liệu sắp hết hàng." };
        }
    }
};

export const searchMaterialStock = {
    declaration: {
        name: "search_material_stock",
        description: "Tìm kiếm tồn kho của một loại nguyên liệu cụ thể theo tên hoặc mã.",
        parameters: {
            type: "OBJECT",
            properties: {
                query: {
                    type: "STRING",
                    description: "Tên hoặc mã nguyên liệu cần tìm."
                }
            },
            required: ["query"]
        }
    },
    roles: ['kho_manager', 'production_manager', 'admin', 'staff'],

    execute: async (args, user) => {
        try {
            const { query } = args;
            const materials = await Material.find({
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { code: { $regex: query, $options: 'i' } }
                ],
                isActive: true
            })
            .select('name code currentStock unit shelf locationDetails')
            .populate('shelf', 'shelfName')
            .limit(5)
            .lean();

            const formatted = materials.map(m => ({
                name: m.name,
                code: m.code,
                stock: `${m.currentStock} ${m.unit}`,
                location: `${m.shelf?.shelfName || 'N/A'} - ${m.locationDetails || 'N/A'}`
            }));

            return {
                results: formatted,
                message: formatted.length > 0 
                    ? `Đã tìm thấy ${formatted.length} kết quả cho "${query}".` 
                    : `Không tìm thấy nguyên liệu nào phù hợp với "${query}".`
            };
        } catch (error) {
            console.error('Error in searchMaterialStock:', error);
            return { error: "Lỗi khi tìm kiếm tồn kho nguyên liệu." };
        }
    }
};
