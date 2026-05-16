import PurchaseOrder from "../models/PurchaseOrder.js";
import Material from "../models/Material.js";
import MaterialAlert from "../models/MaterialAlert.js";
import InventoryImportExportSlip from "../models/InventoryImportExportSlip.js";
import { PURCHASE_ORDER_STATUS, PRIORITY, INVENTORY_IMPORT_EXPORT_SLIP_TYPE, INVENTORY_IMPORT_EXPORT_SLIP_STATUS, ROLES } from "../utils/constants.js";
import { processMaterialCosts } from "../utils/productHelpers.js";
import { generateSlipNumber } from "../utils/slipHelper.js";
import { emitToRoles } from "../config/socket.js";
import { createNotification } from "./notificationService.js";

export const createPurchaseOrderService = async (data, userId) => {
    try {
        const {
            purchaseOrderItems: manualItems = [],
            orderReason,
            priority = PRIORITY.MEDIUM,
            productionOrder,
            materialAlert,
            materialAlerts = []
        } = data;

        // Clean up data to avoid "none" or empty strings causing ObjectId cast errors
        const cleanProductionOrder = (productionOrder && productionOrder !== 'none') ? productionOrder : null;
        const cleanMaterialAlert = (materialAlert && materialAlert !== 'none') ? materialAlert : null;
        const cleanMaterialAlerts = (materialAlerts && Array.isArray(materialAlerts))
            ? materialAlerts.filter(id => id && id !== 'none')
            : [];

        const consolidatedRequirements = new Map(); // materialId -> quantity
        const alertsToLink = new Set();

        // 1. Process manual items
        manualItems.forEach(item => {
            const matId = item.material.toString();
            consolidatedRequirements.set(matId, (consolidatedRequirements.get(matId) || 0) + item.quantity);
        });

        // 2. Fetch relevant alerts
        // Priority: specific alerts list > production order alerts > single material alert
        const alertQuery = { status: 'pending', purchaseOrder: { $exists: false } };

        if (cleanMaterialAlerts.length > 0) {
            alertQuery._id = { $in: cleanMaterialAlerts };
        } else if (cleanProductionOrder) {
            alertQuery.productionOrder = cleanProductionOrder;
        } else if (cleanMaterialAlert) {
            alertQuery._id = cleanMaterialAlert;
        }

        if (cleanProductionOrder || cleanMaterialAlert || cleanMaterialAlerts.length > 0) {
            const relevantAlerts = await MaterialAlert.find(alertQuery).lean();

            // Validation for specifically requested alerts
            const requestedAlertIds = cleanMaterialAlerts.length > 0 ? cleanMaterialAlerts : (cleanMaterialAlert ? [cleanMaterialAlert] : []);

            if (requestedAlertIds.length > 0 && relevantAlerts.length < requestedAlertIds.length) {
                // Find which one is missing/already linked
                for (const id of requestedAlertIds) {
                    const found = relevantAlerts.find(a => a._id.toString() === id.toString());
                    if (!found) {
                        const checkAlert = await MaterialAlert.findById(id).select('purchaseOrder status').lean();
                        if (checkAlert?.purchaseOrder) {
                            throw new Error(`Material alert ${id} is already linked to purchase order ${checkAlert.purchaseOrder}`);
                        }
                        if (checkAlert?.status !== 'pending') {
                            throw new Error(`Material alert ${id} is no longer pending.`);
                        }
                    }
                }
            }

            relevantAlerts.forEach(alert => {
                const matId = alert.material.toString();
                consolidatedRequirements.set(matId, (consolidatedRequirements.get(matId) || 0) + (alert.shortageQuantity || 0));
                alertsToLink.add(alert._id.toString());
            });
        }

        if (consolidatedRequirements.size === 0) {
            throw new Error('No items to purchase. Please provide items, a valid Production Order, or a Material Alert.');
        }

        // 3. Process materials and calculate costs (optimized utility)
        const finalItemsToProcess = Array.from(consolidatedRequirements.entries()).map(([material, quantity]) => ({
            material,
            quantity
        }));

        const { processedMaterials, totalBaseCost } = await processMaterialCosts(finalItemsToProcess);

        // 4. Performance Check: Shelf Capacity (only for general stock fill)
        const isGeneralStockFill = !cleanProductionOrder && !cleanMaterialAlert;
        if (isGeneralStockFill) {
            const materialIds = processedMaterials.map(m => m.material);
            const materials = await Material.find({ _id: { $in: materialIds } }).populate('shelf').lean();
            const materialMap = new Map(materials.map(m => [m._id.toString(), m]));

            for (const item of processedMaterials) {
                const material = materialMap.get(item.material.toString());
                if (material?.shelf) {
                    const { shelf } = material;
                    if (shelf.currentLoad + item.quantity > shelf.maxCapacity) {
                        throw new Error(`Shelf ${shelf.shelfCode} would exceed max capacity. Current: ${shelf.currentLoad}, Adding: ${item.quantity}, Max: ${shelf.maxCapacity}`);
                    }
                }
            }
        }

        // 5. Build Final Purchase Order Items
        const finalPurchaseOrderItems = processedMaterials.map(item => ({
            material: item.material,
            materialCode: item.materialCode,
            unit: item.unit,
            quantity: item.quantity,
            priceAtTimePurchase: item.priceAtTime || 0,
            totalPriceAtTimePurchase: (item.priceAtTime || 0) * item.quantity
        }));

        // 6. Clean and Descriptive Reason
        const defaultReason = cleanProductionOrder
            ? `Purchase for Production Order ${cleanProductionOrder}`
            : cleanMaterialAlert
                ? `Purchase for Material Alert ${cleanMaterialAlert}`
                : 'General Stock Replenishment';

        const finalReason = orderReason || `${defaultReason}. Priority: ${priority}. Total items: ${finalPurchaseOrderItems.length}.`;

        const purchaseOrder = await PurchaseOrder.create({
            creator: userId,
            status: PURCHASE_ORDER_STATUS.PENDING,
            priority,
            productionOrder: cleanProductionOrder,
            materialAlert: cleanMaterialAlert,
            orderReason: finalReason,
            purchaseOrderItems: finalPurchaseOrderItems,
            totalBaseCost
        });

        // 7. Update MaterialAlerts link (Optimized bulk update)
        if (alertsToLink.size > 0) {
            await MaterialAlert.updateMany(
                { _id: { $in: Array.from(alertsToLink) } },
                {
                    purchaseOrder: purchaseOrder._id,
                    status: 'ordered' // Update status to prevent picking up in other POs
                }
            );
        }

        return { success: true, data: purchaseOrder, message: 'Purchase order created successfully' };
    } catch (error) {
        console.error('[createPurchaseOrderService] error:', error);
        return { success: false, message: error.message || 'Failed to create purchase order', data: null };
    }
};

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

        // Notify Production Managers and Admins real-time when PO status changes (e.g., approved/rejected)
        if (updatePayload.status) {
            const statusLabel = updatePayload.status === PURCHASE_ORDER_STATUS.APPROVED ? 'được duyệt' :
                updatePayload.status === PURCHASE_ORDER_STATUS.REJECTED ? 'bị từ chối' :
                    updatePayload.status;

            emitToRoles([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER], 'purchase_order_status_updated', {
                orderId: purchaseOrderUpdate._id,
                orderCode: purchaseOrderUpdate.orderCode,
                status: updatePayload.status,
                message: `Đơn mua hàng ${purchaseOrderUpdate.orderCode} đã ${statusLabel}.`
            });

            // Also create persistent notification for the creator if status changed
            if (purchaseOrderUpdate.creator) {
                await createNotification({
                    recipient: purchaseOrderUpdate.creator,
                    title: 'Cập nhật đơn mua hàng',
                    message: `Đơn mua hàng ${purchaseOrderUpdate.orderCode} của bạn đã ${statusLabel}.`,
                    type: 'PURCHASE_ORDER',
                    priority: updatePayload.status === PURCHASE_ORDER_STATUS.APPROVED ? 'MEDIUM' : 'HIGH',
                    metaData: { orderId: purchaseOrderUpdate._id, orderCode: purchaseOrderUpdate.orderCode }
                });
            }
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
            return { success: true, message: 'Purchase order not found', data: null };
        }

        // Unlink any material alerts associated with this PO
        await MaterialAlert.updateMany(
            { purchaseOrder: orderId },
            {
                $unset: { purchaseOrder: "" },
                status: 'pending'
            }
        );

        return { success: true, data: purchaseOrderDelete, message: 'Purchase order deleted successfully' };
    }
    catch (error) {
        console.log('[deletePurchaseOrderService] error:', error);
        return { success: false, message: 'Failed to delete purchase order: ' + error.message, data: null };
    }
}

export const updatePurchaseOrderStatusService = async (orderId, data, adminId) => {
    try {
        const purchaseOrder = await PurchaseOrder.findById(orderId);
        if (!purchaseOrder) {
            return { success: false, message: 'Purchase order not found', data: null };
        }

        // Update status and notes
        const oldStatus = purchaseOrder.status;
        purchaseOrder.status = data.status;
        if (data.adminNotes) purchaseOrder.adminNotes = data.adminNotes;

        await purchaseOrder.save();

        // If status becomes CANCELLED, unlink alerts
        if (data.status === PURCHASE_ORDER_STATUS.CANCELLED && oldStatus !== PURCHASE_ORDER_STATUS.CANCELLED) {
            await MaterialAlert.updateMany(
                { purchaseOrder: orderId },
                {
                    $unset: { purchaseOrder: "" },
                    status: 'pending'
                }
            );
        }

        // If status becomes ACCEPTED, automatically create an Import Slip
        if (data.status === PURCHASE_ORDER_STATUS.ACCEPTED) {
            const slipNumber = await generateSlipNumber(INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT);

            const slipItems = purchaseOrder.purchaseOrderItems.map(item => ({
                material: item.material,
                itemName: `Material: ${item.materialCode}`, // Simplification, could be more detailed
                itemCode: item.materialCode,
                unit: item.unit,
                quantity: {
                    requested: item.quantity,
                    actual: 0 // Will be filled by kho manager
                },
                unitPrice: item.priceAtTimePurchase,
                amount: 0
            }));

            const newSlip = new InventoryImportExportSlip({
                type: INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT,
                slipNumber,
                relatedPurchaseOrder: purchaseOrder._id,
                relatedProductionOrder: purchaseOrder.productionOrder,
                reason: `Nhập kho từ đơn mua hàng ${purchaseOrder._id}. Lý do: ${purchaseOrder.orderReason}`,
                items: slipItems,
                signatures: {
                    creator: adminId, // Admin who approved the PO
                },
                status: INVENTORY_IMPORT_EXPORT_SLIP_STATUS.PENDING
            });

            await newSlip.save();
            console.log(`[PurchaseOrder] Auto-created Import Slip ${slipNumber} for PO ${orderId}`);
        }

        return { success: true, data: purchaseOrder, message: 'Purchase order status updated successfully' };
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
            return { success: true, message: 'Purchase orders not found', data: null };
        }
        return { success: true, data: purchaseOrders, message: 'Purchase orders retrieved successfully' };

    } catch (error) {
        console.log('[getAllPurchaseOrdersService] error:', error);
        return { success: false, message: 'Failed to retrieve purchase orders: ' + error.message, data: null };
    }
}