import ProductionOrder from '../models/ProductionOrder.js';

export const getActiveProductionOrders = {
    declaration: {
        name: "get_active_production_orders",
        description: "Lấy danh sách các đơn sản xuất đang hoạt động (chờ xử lý, đang sản xuất) cùng số lượng.",
        parameters: {
            type: "OBJECT",
            properties: {
                status: {
                    type: "STRING",
                    description: "Trạng thái đơn hàng: 'pending' (chờ xử lý) hoặc 'processing' (đang sản xuất). Nếu không truyền, mặc định lấy cả hai."
                }
            }
        }
    },
    roles: ['production_manager', 'admin'],

    execute: async (args, user) => {
        try {
            const queryStatus = args.status ? [args.status] : ['pending', 'processing'];
            const orders = await ProductionOrder.find({ status: { $in: queryStatus } })
                .select('orderCode products status deadline')
                .limit(10)
                .lean();

            const formattedOrders = orders.map(o => ({
                orderCode: o.orderCode,
                products: o.products.map(p => `${p.productName} (SL: ${p.quantity})`).join(', '),
                status: o.status,
                deadline: o.deadline ? new Date(o.deadline).toLocaleDateString('vi-VN') : 'N/A'
            }));

            return {
                total: formattedOrders.length,
                orders: formattedOrders,
                message: formattedOrders.length > 0 ? "Đây là danh sách các đơn sản xuất đang hoạt động." : "Hiện không có đơn sản xuất nào đang hoạt động."
            };
        } catch (error) {
            console.error('Error in getActiveProductionOrders:', error);
            return { error: "Không thể lấy danh sách đơn sản xuất." };
        }
    }
};