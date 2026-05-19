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
            const allowedStatus = new Set([
                'pending',
                'materials_checking',
                'materials_allocated',
                'ready_to_assign',
                'assigned',
                'in_preparation',
                'in_production',
                'partially_complete',
                'completed',
                'on_hold',
                'overdue',
                'cancelled',
                'insufficient_materials'
            ]);
            const fallbackStatuses = ['pending', 'assigned', 'in_preparation', 'in_production', 'partially_complete', 'overdue'];
            const normalized = typeof args?.status === 'string' ? args.status.trim().toLowerCase() : '';
            const queryStatus = normalized && allowedStatus.has(normalized) ? [normalized] : fallbackStatuses;
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

export const getTodayProductionSummary = {
    declaration: {
        name: "get_today_production_summary",
        description: "Lấy tóm tắt tình hình sản xuất hôm nay: số đơn đang chạy, số đơn hoàn thành hôm nay, tổng số đơn tạo hôm nay.",
        parameters: { type: "OBJECT", properties: {} }
    },
    roles: ['production_manager', 'admin'],
    execute: async () => {
        try {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const end = new Date();
            end.setHours(23, 59, 59, 999);

            const [inProduction, completedToday, createdToday] = await Promise.all([
                ProductionOrder.countDocuments({ status: { $in: ['in_production', 'partially_complete', 'assigned', 'in_preparation'] } }),
                ProductionOrder.countDocuments({ completedAt: { $gte: start, $lte: end } }),
                ProductionOrder.countDocuments({ createdAt: { $gte: start, $lte: end } }),
            ]);

            return {
                date: start.toISOString(),
                inProductionOrders: inProduction,
                completedTodayOrders: completedToday,
                createdTodayOrders: createdToday,
                updatedAt: new Date().toISOString(),
            };
        } catch (error) {
            console.error('Error in getTodayProductionSummary:', error);
            return { error: "Không thể lấy tóm tắt sản xuất hôm nay." };
        }
    }
};
