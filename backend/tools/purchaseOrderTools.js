import { getAllPurchaseOrdersService } from '../services/purchaseOrderService.js';

export const getPurchaseOrders = {
    declaration: {
        name: "get_purchase_orders",
        description: "Lấy danh sách các đơn mua hàng (nguyên liệu từ nhà cung cấp).",
        parameters: {
            type: "OBJECT",
            properties: {
                status: {
                    type: "STRING",
                    description: "Trạng thái đơn hàng: 'pending', 'approved', 'rejected', 'completed'."
                }
            }
        }
    },
    roles: ['admin', 'production_manager', 'kho_manager'],

    execute: async (args, user) => {
        try {
            const result = await getAllPurchaseOrdersService({
                status: args.status,
                limit: 10
            });

            if (!result.success) {
                return { error: result.message };
            }

            const formatted = result.data.purchaseOrders.map(po => ({
                id: po._id,
                status: po.status,
                totalAmount: po.totalAmount.toLocaleString('vi-VN') + ' VND',
                supplier: po.supplierName || 'N/A',
                createdAt: new Date(po.createdAt).toLocaleDateString('vi-VN')
            }));

            return {
                total: result.data.pagination.total,
                purchaseOrders: formatted,
                message: formatted.length > 0 ? "Đây là danh sách các đơn mua hàng." : "Không tìm thấy đơn mua hàng nào."
            };
        } catch (error) {
            console.error('Error in getPurchaseOrders tool:', error);
            return { error: "Không thể lấy danh sách đơn mua hàng." };
        }
    }
};
