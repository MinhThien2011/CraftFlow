export const createOrder = async (orderData) => {
    const order = new ProductOrder(orderData);
    await order.save();
    return order;
}

export const deleteOrder = async (orderId) => {
    await ProductOrder.findByIdAndDelete(orderId);
    return { status: 200, message: 'Order deleted successfully.' };
}

export const updateOrder = async (orderId, updateData) => {
    const order = await ProductOrder.findByIdAndUpdate(orderId, updateData, { new: true });
    if (!order) return { status: 404, error: 'Order not found.' };
    return order;
}   

export const getOrder = async (orderId) => {
    const order = await ProductOrder.findById(orderId);
    if (!order) return { status: 404, error: 'Order not found.' };
    return order;
}

export const getOrders = async (page = 1, pageSize = 10, query = {}) => {
    const orders = await ProductOrder.find(query)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec();
    if (orders.length === 0) return { status: 404, error: 'No orders found.' };
    return orders;
}
