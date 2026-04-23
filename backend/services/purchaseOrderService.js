import PurchaseOrder from "../models/PurchaseOrder.js";
import { PURCHASE_ORDER_STATUS } from "../utils/constants.js";
import { processMaterialCosts } from "../utils/productHelpers.js";

export const createPurchaseOrderService = async (data, userId) => {
    try {
        const { purchaseOrderItems, orderReason } = data;

        // Process materials and calculate costs
        const { processedMaterials, totalBaseCost } = await processMaterialCosts(purchaseOrderItems);
        const finalPurchaseOrderItems = processedMaterials.map(item => {
            const price = item.priceAtTime || 0;
            return {
                material: item.material,
                materialCode: item.materialCode,
                unit: item.unit,
                quantity: item.quantity,
                priceAtTimePurchase: price,
                totalPriceAtTimePurchase: price * item.quantity
            };
        });

        const purchaseOrderData = {
            creator: userId,
            status: PURCHASE_ORDER_STATUS.PENDING,
            orderReason,
            purchaseOrderItems: finalPurchaseOrderItems,
            totalBaseCost
        };

        const purchaseOrder = await PurchaseOrder.create(purchaseOrderData);
        return { success: true, data: purchaseOrder, message: 'Purchase order created successfully' };
    } catch (error) {
        console.log('[createPurchaseOrderService] error:', error);
        return { success: false, message: 'Failed to create purchase order: ' + error.message, data: null };
    }
}

export const updatePurchaseOrderService = async (orderId, data) => {
    try {
        const updatePayload = { ...data };

        // If purchaseOrderItems are being updated, we need to process them
        if (updatePayload.purchaseOrderItems) {
            const { processedMaterials, totalBaseCost } = await processMaterialCosts(updatePayload.purchaseOrderItems);

            updatePayload.purchaseOrderItems = processedMaterials.map(item => {
                const price = item.priceAtTime || 0;
                return {
                    material: item.material,
                    materialCode: item.materialCode,
                    unit: item.unit,
                    quantity: item.quantity,
                    priceAtTimePurchase: price,
                    totalPriceAtTimePurchase: price * item.quantity
                };
            });
            updatePayload.totalBaseCost = totalBaseCost;
        }

        const purchaseOrderUpdate = await PurchaseOrder.findByIdAndUpdate(
            orderId,
            { $set: updatePayload },
            { returnDocument: 'after' }
        ).lean();

        if (!purchaseOrderUpdate) {
            return { success: false, message: 'Purchase order not found', data: null };
        }
        return { success: true, data: purchaseOrderUpdate, message: 'Purchase order updated successfully' };
    }
    catch (error) {
        console.log('[updatePurchaseOrderService] error:', error);
        return { success: false, message: 'Failed to update purchase order: ' + error.message, data: null };
    }
}

export const deletePurchaseOrderService = async (orderId) => {
    try {
        const purchaseOrderDelete = await PurchaseOrder.findByIdAndDelete(orderId).lean()
        if (!purchaseOrderDelete) {
            return { success: false, message: 'Purchase order not found', data: null };
        }
        return { success: true, data: purchaseOrderDelete, message: 'Purchase order deleted successfully' };
    }
    catch (error) {
        console.log('[deletePurchaseOrderService] error:', error);
        return { success: false, message: 'Failed to delete purchase order: ' + error.message, data: null };
    }
}

export const updatePurchaseOrderStatusService = async (orderId, data) => {
    try {
        // const purchaseOrder = await PurchaseOrder.findById(orderId).lean()
        // if (data.status && data.status === purchaseOrder.status) {
        //     return { success: false, message: 'Purchase order status cannot be updated', data: purchaseOrder };
        // }
        const purchaseOrderUpdate = await PurchaseOrder.findByIdAndUpdate(orderId, { $set: data }, { returnDocument: 'after' }).lean()
        if (!purchaseOrderUpdate) {
            return { success: false, message: 'Purchase order not found', data: null };
        }
        return { success: true, data: purchaseOrderUpdate, message: 'Purchase order status updated successfully' };
    }
    catch (error) {
        console.log('[updatePurchaseOrderStatusService] error:', error);
        return { success: false, message: 'Failed to update purchase order status: ' + error.message, data: null };
    }
}

export const getAllPurchaseOrdersByIdService = async (id) => {
    try {
        const purchaseOrder = await PurchaseOrder.findById(id)
            .populate('creator', 'username email')
            .populate('purchaseOrderItems.material', 'name price barcode code');
        if (!purchaseOrder) {
            return { success: false, message: 'Purchase order not found', data: null };
        }
        return { success: true, data: purchaseOrder, message: 'Purchase order retrieved successfully' };
    } catch (error) {
        console.log('[getAllPurchaseOrdersByIdService] error:', error);
        return { success: false, message: 'Failed to retrieve purchase order: ' + error.message, data: null };
    }
}

export const getAllPurchaseOrdersService = async (query = {}) => {
    try {
        const {
            creator,
            page = 1,
            limit = 10,
            status,
            purchaseOrderItems,
        } = query;
        const skip = (page - 1) * limit;
        const filter = {};
        if (creator) filter.creator = creator;
        if (status) filter.status = status;
        if (purchaseOrderItems) filter.purchaseOrderItems = purchaseOrderItems;
        const purchaseOrders = await PurchaseOrder.find(filter)
            .skip(skip)
            .limit(limit)
            .populate('creator', 'username email')
            .populate('purchaseOrderItems.material', 'name price barcode code');
        if (!purchaseOrders || purchaseOrders.length === 0) {
            return { success: false, message: 'Purchase orders not found', data: null };
        }
        return { success: true, data: purchaseOrders, message: 'Purchase orders retrieved successfully' };

    } catch (error) {
        console.log('[getAllPurchaseOrdersService] error:', error);
        return { success: false, message: 'Failed to retrieve purchase orders: ' + error.message, data: null };
    }
}