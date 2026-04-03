import ProductionOrder from '../models/ProductionOrder.js';

const MAX_LIMIT = 100;

export const createOrder = async (orderData) => {
    try {
        const order = new ProductionOrder(orderData);
        await order.save();
        return { success: true, message: 'Order created successfully.', data: order };
    } catch (error) {
        console.error('[productOrderService] createOrder error:', error);
        return { success: false, message: error.message, data: null };
    }
}

export const deleteOrder = async (orderId) => {
    try {
        const order = await ProductionOrder.findByIdAndDelete(orderId).lean();
        if (!order) return { success: false, message: 'Order not found.', data: null };
        return { success: true, message: 'Order deleted successfully.', data: null };
    } catch (error) {
        console.error('[productOrderService] deleteOrder error:', error);
        return { success: false, message: error.message, data: null };
    }
}

export const updateOrder = async (orderId, updateData) => {
    try {
        const order = await ProductionOrder.findByIdAndUpdate(orderId, updateData, { new: true }).lean();
        if (!order) return { success: false, message: 'Order not found.', data: null };
        return { success: true, message: 'Order updated successfully.', data: order };
    } catch (error) {
        console.error('[productOrderService] updateOrder error:', error);
        return { success: false, message: error.message, data: null };
    }
}   

export const getOrder = async (orderId) => {
    try {
        const order = await ProductionOrder.findById(orderId)
            .populate('productId', 'name code category unit baseCost')
            .populate('createdBy', 'username fullName')
            .lean();
        if (!order) return { success: false, message: 'Order not found.', data: null };
        return { success: true, message: 'Order retrieved successfully.', data: order };
    } catch (error) {
        console.error('[productOrderService] getOrder error:', error);
        return { success: false, message: error.message, data: null };
    }
}

export const getOrders = async (page = 1, pageSize = 10, query = {}) => {
    try {
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(pageSize)));
        const skip = (pageNum - 1) * limitNum;

        const [orders, total] = await Promise.all([
            ProductionOrder.find(query)
                .populate('productId', 'name code')
                .populate('createdBy', 'username fullName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            ProductionOrder.countDocuments(query)
        ]);
        
        return {
            success: true,
            message: 'Orders retrieved successfully.',
            data: {
                orders,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    pages: Math.ceil(total / limitNum)
                }
            }
        };
    } catch (error) {
        console.error('[productOrderService] getOrders error:', error);
        return { success: false, message: error.message, data: null };
    }
}
