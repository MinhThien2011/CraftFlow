import { createPurchaseOrderService, deletePurchaseOrderService, getAllPurchaseOrdersByIdService, getAllPurchaseOrdersService, updatePurchaseOrderService, updatePurchaseOrderStatusService } from "../services/purchaseOrderService.js";
import { logActivity } from "../utils/logger.js";
import { purchaseOrderValidator, updateStatusPurchaseOrderValidator } from "../validations/PurchaseOrderValidation.js";


export const createPurchaseOrder = async (req, res) => {
    try {
        const { error, value } = purchaseOrderValidator(req.body);
        if (error) {
            return res.status(400).json({ error: error.details.map(d => d.message) });
        }
        const purchaseOrder = await createPurchaseOrderService(value, req.userId);
        if (!purchaseOrder.success) {
            return res.status(400).json(purchaseOrder);
        }
        res.status(201).json(purchaseOrder);
        setImmediate(async () => {
            await logActivity({
                author: req.userId,
                action: 'CREATE_PURCHASE_ORDER',
                module: 'PURCHASE_ORDER',
                details: `Production manager created purchase order: ${purchaseOrder._id}`,
                targetId: purchaseOrder._id,
                metadata: { status: purchaseOrder.status }
            }, req);
        })
    }
    catch (error) {
        console.log('[createPurchaseOrder] error:', error);
        return res.status(500).json({ success: false, message: "create purchase order error: " + error.message, data: null });
    }
}

export const updatePurchaseOrderStatus = async (req, res) => {
    try {
        const purchaseOrderId = req.params.id;
        const { error, value } = updateStatusPurchaseOrderValidator(req.body);
        if (error) {
            return res.status(400).json({ error: error.details.map(d => d.message) });
        }
        const purchaseOrder = await updatePurchaseOrderStatusService(purchaseOrderId, { status: value.status, adminNotes: value.adminNotes });
        if (!purchaseOrder.success) {
            return res.status(404).json(purchaseOrder);
        }
        res.status(200).json(purchaseOrder);
        setImmediate(async () => {
            await logActivity({
                author: req.userId,
                action: 'UPDATE_PURCHASE_ORDER_STATUS',
                module: 'PURCHASE_ORDER',
                details: `Admin updated purchase order status: ${purchaseOrder._id}`,
                targetId: purchaseOrder._id,
                metadata: { status: purchaseOrder.status, adminNotes: purchaseOrder.adminNotes }
            }, req);
        })
    }
    catch (error) {
        console.log('[updatePurchaseOrderStatus] error:', error);
        return res.status(500).json({ success: false, message: "update purchase order status error: " + error.message, data: null });
    }
}

export const updatePurchaseOrder = async (req, res) => {
    try {
        const purchaseOrderId = req.body.id;
        const { error, value } = purchaseOrderValidator(req.body);
        if (error) {
            return res.status(400).json({ error: error.details.map(d => d.message) });
        }
        const purchaseOrder = await updatePurchaseOrderService(purchaseOrderId, value);
        if (!purchaseOrder.success) {
            return res.status(404).json(purchaseOrder);
        }
        res.status(200).json(purchaseOrder);
        setImmediate(async () => {
            await logActivity({
                author: req.userId,
                action: 'UPDATE_PURCHASE_ORDER',
                module: 'PURCHASE_ORDER',
                details: `Production manager updated purchase order: ${purchaseOrder._id}`,
                targetId: purchaseOrder._id,
                metadata: { status: purchaseOrder.status }
            }, req);
        })
    }
    catch (error) {
        console.log('[updatePurchaseOrder] error:', error);
        return res.status(500).json({ success: false, message: "update purchase order error: " + error.message, data: null });
    }
}

export const deletePurchaseOrder = async (req, res) => {
    try {
        const purchaseOrderId = req.params.id;
        const purchaseOrder = await deletePurchaseOrderService(purchaseOrderId);
        if (!purchaseOrder.success) {
            return res.status(404).json(purchaseOrder);
        }
        res.status(200).json(purchaseOrder);
        setImmediate(async () => {
            await logActivity({
                author: req.userId,
                action: 'DELETE_PURCHASE_ORDER',
                module: 'PURCHASE_ORDER',
                details: `Purchase order deleted: ${purchaseOrder._id}`,
                targetId: purchaseOrder._id,
                metadata: { status: purchaseOrder.status }
            }, req);
        })
    }
    catch (error) {
        console.log('[deletePurchaseOrder] error:', error);
        return res.status(500).json({ success: false, message: "delete purchase order error: " + error.message, data: null });
    }
}
export const getPurchaseOrderById = async (req, res) => {
    try {
        const purchaseOrderId = req.params.id;
        const purchaseOrder = await getAllPurchaseOrdersByIdService(purchaseOrderId);
        if (!purchaseOrder) {
            return res.status(404).json(purchaseOrder);
        }
        return res.status(200).json(purchaseOrder);
    } catch (error) {
        console.log('[getPurchaseOrderById] error:', error);
        return res.status(500).json({ success: false, message: "get purchase order by id error: " + error.message, data: null });
    }
}

export const getAllPurchaseOrders = async (req, res) => {
    try {
        const purchaseOrders = await getAllPurchaseOrdersService(req.query);
        if (!purchaseOrders.success) {
            return res.status(404).json(purchaseOrders);
        }
        return res.status(200).json(purchaseOrders);
    } catch (error) {
        console.log('[getAllPurchaseOrders] error:', error);
        return res.status(500).json({ success: false, message: "get all purchase orders error: " + error.message, data: null });
    }
}