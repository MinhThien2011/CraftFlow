import PurchaseOrder from "../models/PurchaseOrder.js";
import Material from "../models/Material.js";
import MaterialAlert from "../models/MaterialAlert.js";
import InventoryImportExportSlip from "../models/InventoryImportExportSlip.js";
import { PURCHASE_ORDER_STATUS, PRIORITY, INVENTORY_IMPORT_EXPORT_SLIP_TYPE, INVENTORY_IMPORT_EXPORT_SLIP_STATUS, ROLES } from "../utils/constants.js";
import { processMaterialCosts } from "../utils/productHelpers.js";
import { generateSlipNumber } from "../utils/slipHelper.js";
import { emitToRoles } from "../config/socket.js";
import { createNotification } from "./notificationService.js";
import User from "../models/User.js";
import Role from "../models/Roles.js";
import { emitDataChanged } from "./realtimeService.js";
import { applyCreatedAtCursor, buildListPagination, normalizePagination } from "../utils/pagination.js";
import mongoose from "mongoose";

const notifyUsersByRole = async ({ roles, excludeUserId, title, message, type, priority, metaData }) => {
    const roleDocs = await Role.find({ roleName: { $in: roles } }).select("_id").lean();
    const roleIds = roleDocs.map((roleDoc) => roleDoc._id);

    if (roleIds.length === 0) return;

    const users = await User.find({
        role: { $in: roleIds },
        isActive: true
    }).select("_id");

    const excludeId = excludeUserId ? excludeUserId.toString() : null;
    const recipients = users
        .map((user) => user._id.toString())
        .filter((userId) => userId !== excludeId);

    await Promise.all(
        recipients.map((recipient) =>
            createNotification({
                recipient,
                title,
                message,
                type,
                priority,
                metaData
            })
        )
    );
};

export const createPurchaseOrderService = async (data, userId) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const {
            purchaseOrderItems: manualItems = [],
            orderReason,
            priority = PRIORITY.MEDIUM,
            productionOrder,
            materialAlert,
            materialAlerts = [],
            sourceProductionOrders = []
        } = data;

        // Clean up data to avoid "none" or empty strings causing ObjectId cast errors
        const cleanProductionOrder = (productionOrder && productionOrder !== 'none') ? productionOrder : null;
        const cleanMaterialAlert = (materialAlert && materialAlert !== 'none') ? materialAlert : null;
        const cleanMaterialAlerts = (materialAlerts && Array.isArray(materialAlerts))
            ? materialAlerts.filter(id => id && id !== 'none')
            : [];
        const cleanSourceProductionOrders = (sourceProductionOrders && Array.isArray(sourceProductionOrders))
            ? sourceProductionOrders.filter(id => id && id !== 'none')
            : [];

        const consolidatedRequirements = new Map(); // materialId -> quantity
        const alertsToLink = new Set();
        const linkedProductionOrders = new Set(cleanSourceProductionOrders.map((id) => id.toString()));

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
            const relevantAlerts = await MaterialAlert.find(alertQuery).session(session).lean();

            // Validation for specifically requested alerts
            const requestedAlertIds = cleanMaterialAlerts.length > 0 ? cleanMaterialAlerts : (cleanMaterialAlert ? [cleanMaterialAlert] : []);

            if (requestedAlertIds.length > 0 && relevantAlerts.length < requestedAlertIds.length) {
                // Find which one is missing/already linked
                for (const id of requestedAlertIds) {
                    const found = relevantAlerts.find(a => a._id.toString() === id.toString());
                    if (!found) {
                        const checkAlert = await MaterialAlert.findById(id).select('purchaseOrder status').session(session).lean();
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
                if (alert.productionOrder) linkedProductionOrders.add(alert.productionOrder.toString());
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
        const isGeneralStockFill = !cleanProductionOrder && !cleanMaterialAlert && cleanMaterialAlerts.length === 0;
        if (isGeneralStockFill) {
            const materialIds = processedMaterials.map(m => m.material);
            const materials = await Material.find({ _id: { $in: materialIds } }).populate('shelf').session(session).lean();
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
        const sourceProductionOrderIds = Array.from(linkedProductionOrders);
        const defaultReason = cleanProductionOrder
            ? `Purchase for Production Order ${cleanProductionOrder}`
            : sourceProductionOrderIds.length > 0
                ? `Purchase for shortages from ${sourceProductionOrderIds.length} production order(s)`
            : cleanMaterialAlert
                ? `Purchase for Material Alert ${cleanMaterialAlert}`
                : 'General Stock Replenishment';

        const finalReason = orderReason || `${defaultReason}. Priority: ${priority}. Total items: ${finalPurchaseOrderItems.length}.`;

        const [purchaseOrder] = await PurchaseOrder.create([{
            creator: userId,
            status: PURCHASE_ORDER_STATUS.PENDING,
            priority,
            productionOrder: cleanProductionOrder || (sourceProductionOrderIds.length === 1 ? sourceProductionOrderIds[0] : null),
            sourceProductionOrders: sourceProductionOrderIds,
            materialAlert: cleanMaterialAlert,
            orderReason: finalReason,
            purchaseOrderItems: finalPurchaseOrderItems,
            totalBaseCost
        }], { session });

        // 7. Update MaterialAlerts link (Optimized bulk update)
        if (alertsToLink.size > 0) {
            const alertIds = Array.from(alertsToLink);
            const linkResult = await MaterialAlert.updateMany(
                { _id: { $in: alertIds }, status: 'pending', purchaseOrder: { $exists: false } },
                {
                    purchaseOrder: purchaseOrder._id,
                    status: 'ordered' // Update status to prevent picking up in other POs
                },
                { session }
            );
            if (linkResult.modifiedCount !== alertIds.length) {
                throw new Error('Some material alerts were already linked by another request. Please reload and try again.');
            }
        }

        await session.commitTransaction();

        await notifyUsersByRole({
            roles: [ROLES.ADMIN],
            excludeUserId: userId,
            title: 'Có yêu cầu mua hàng mới',
            message: `Đơn mua hàng ${purchaseOrder._id} đang chờ duyệt.`,
            type: 'APPROVAL',
            priority: 'HIGH',
            metaData: {
                purchaseOrderId: purchaseOrder._id,
                sourceProductionOrders: purchaseOrder.sourceProductionOrders || [],
                status: purchaseOrder.status,
                source: 'purchase_order_created'
            }
        });

        await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER], {
            domains: ["purchaseOrders", "materials", "production", "alerts"],
            action: "created",
            entity: "purchase_order",
            id: purchaseOrder._id,
            message: `Purchase order ${purchaseOrder._id} is waiting for approval.`,
            metaData: {
                purchaseOrderId: purchaseOrder._id,
                productionOrder: purchaseOrder.productionOrder,
                sourceProductionOrders: purchaseOrder.sourceProductionOrders || [],
                materialAlert: purchaseOrder.materialAlert,
                status: purchaseOrder.status
            }
        });

        await emitToRoles([ROLES.ADMIN], 'purchase_order_created', {
            orderId: purchaseOrder._id,
            status: purchaseOrder.status,
            message: `Purchase order ${purchaseOrder._id} is waiting for approval.`
        });

        return { success: true, data: purchaseOrder, message: 'Purchase order created successfully' };
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error('[createPurchaseOrderService] error:', error);
        return { success: false, message: error.message || 'Failed to create purchase order', data: null };
    } finally {
        session.endSession();
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
            const statusLabel = updatePayload.status === PURCHASE_ORDER_STATUS.ACCEPTED ? 'được duyệt' :
                updatePayload.status === PURCHASE_ORDER_STATUS.REJECTED ? 'bị từ chối' :
                    updatePayload.status;

            emitToRoles([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER], 'purchase_order_status_updated', {
                orderId: purchaseOrderUpdate._id,
                orderCode: purchaseOrderUpdate.orderCode,
                status: updatePayload.status,
                message: `Đơn mua hàng ${purchaseOrderUpdate.orderCode} đã ${statusLabel}.`
            });

            await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER], {
                domains: ["purchaseOrders", "slips", "inventory", "materials", "production", "alerts"],
                action: "status_updated",
                entity: "purchase_order",
                id: purchaseOrderUpdate._id,
                message: `Purchase order ${purchaseOrderUpdate.orderCode || purchaseOrderUpdate._id} changed to ${updatePayload.status}.`,
                metaData: { status: updatePayload.status }
            });

            // Also create persistent notification for the creator if status changed
            if (purchaseOrderUpdate.creator) {
                await createNotification({
                    recipient: purchaseOrderUpdate.creator,
                    title: 'Cập nhật đơn mua hàng',
                    message: `Đơn mua hàng ${purchaseOrderUpdate.orderCode} của bạn đã ${statusLabel}.`,
                    type: 'PURCHASE_ORDER',
                    priority: updatePayload.status === PURCHASE_ORDER_STATUS.ACCEPTED ? 'MEDIUM' : 'HIGH',
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

        await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER], {
            domains: ["purchaseOrders", "alerts", "production"],
            action: "deleted",
            entity: "purchase_order",
            id: orderId,
            message: `Purchase order ${orderId} was deleted.`
        });

        return { success: true, data: purchaseOrderDelete, message: 'Purchase order deleted successfully' };
    }
    catch (error) {
        console.log('[deletePurchaseOrderService] error:', error);
        return { success: false, message: 'Failed to delete purchase order: ' + error.message, data: null };
    }
}

export const updatePurchaseOrderStatusService = async (orderId, data, adminId) => {
    const session = await mongoose.startSession();
    let purchaseOrder = null;
    let importSlip = null;
    let shouldNotifyWarehouse = false;
    let shouldNotifyCreator = false;

    try {
        session.startTransaction();

        const updatePayload = { status: data.status };
        if (data.adminNotes !== undefined) updatePayload.adminNotes = data.adminNotes;

        purchaseOrder = await PurchaseOrder.findOneAndUpdate(
            { _id: orderId, status: PURCHASE_ORDER_STATUS.PENDING },
            { $set: updatePayload },
            { returnDocument: 'after', session }
        );

        if (!purchaseOrder) {
            const existingPurchaseOrder = await PurchaseOrder.findById(orderId).session(session);
            if (!existingPurchaseOrder) {
                await session.abortTransaction();
                return { success: false, message: 'Purchase order not found', data: null };
            }

            if (existingPurchaseOrder.status === data.status) {
                await session.commitTransaction();
                return {
                    success: true,
                    data: existingPurchaseOrder,
                    message: 'Purchase order status was already updated'
                };
            }

            await session.abortTransaction();
            return {
                success: false,
                message: `Cannot change purchase order status from ${existingPurchaseOrder.status} to ${data.status}.`,
                data: existingPurchaseOrder
            };
        }

        if (data.status === PURCHASE_ORDER_STATUS.REJECTED) {
            await MaterialAlert.updateMany(
                { purchaseOrder: orderId },
                {
                    $unset: { purchaseOrder: "" },
                    status: 'pending'
                },
                { session }
            );
        }

        if (data.status === PURCHASE_ORDER_STATUS.ACCEPTED) {
            importSlip = await InventoryImportExportSlip.findOne({
                type: INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT,
                relatedPurchaseOrder: purchaseOrder._id
            }).session(session);

            if (!importSlip) {
                const slipNumber = await generateSlipNumber(INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT);

                const slipItems = purchaseOrder.purchaseOrderItems.map(item => ({
                    material: item.material,
                    itemName: `Material: ${item.materialCode}`,
                    itemCode: item.materialCode,
                    unit: item.unit,
                    quantity: {
                        requested: item.quantity,
                        actual: 0
                    },
                    unitPrice: item.priceAtTimePurchase,
                    amount: 0
                }));

                [importSlip] = await InventoryImportExportSlip.create([{
                    type: INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT,
                    slipNumber,
                    relatedPurchaseOrder: purchaseOrder._id,
                    relatedProductionOrder: purchaseOrder.productionOrder,
                    reason: `Import slip from purchase order ${purchaseOrder._id}. Reason: ${purchaseOrder.orderReason}`,
                    items: slipItems,
                    signatures: {
                        creator: adminId,
                    },
                    status: INVENTORY_IMPORT_EXPORT_SLIP_STATUS.PENDING
                }], { session });

                shouldNotifyWarehouse = true;
                console.log(`[PurchaseOrder] Auto-created Import Slip ${slipNumber} for PO ${orderId}`);
            }
        }

        if (data.status === PURCHASE_ORDER_STATUS.REJECTED || data.status === PURCHASE_ORDER_STATUS.ACCEPTED) {
            shouldNotifyCreator = purchaseOrder.creator?.toString() !== adminId?.toString();
        }

        await session.commitTransaction();

        if (shouldNotifyWarehouse && importSlip) {
            await notifyUsersByRole({
                roles: [ROLES.KHO_MANAGER],
                excludeUserId: adminId,
                title: 'New import slip created',
                message: `PO ${purchaseOrder._id} was accepted and import slip ${importSlip.slipNumber} was created.`,
                type: 'INVENTORY',
                priority: 'HIGH',
                metaData: {
                    purchaseOrderId: purchaseOrder._id,
                    slipId: importSlip._id,
                    slipNumber: importSlip.slipNumber,
                    status: purchaseOrder.status,
                    source: 'purchase_order_accepted'
                }
            });
        }

        if (shouldNotifyCreator) {
            await createNotification({
                recipient: purchaseOrder.creator,
                title: 'Purchase order updated',
                message: data.status === PURCHASE_ORDER_STATUS.ACCEPTED
                    ? `PO ${purchaseOrder._id} was accepted.`
                    : `PO ${purchaseOrder._id} was rejected.`,
                type: 'APPROVAL',
                priority: data.status === PURCHASE_ORDER_STATUS.ACCEPTED ? 'MEDIUM' : 'HIGH',
                metaData: {
                    purchaseOrderId: purchaseOrder._id,
                    status: data.status,
                    source: 'purchase_order_status_changed'
                }
            });
        }

        await emitToRoles([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER], 'purchase_order_status_updated', {
            orderId: purchaseOrder._id,
            orderCode: purchaseOrder.orderCode,
            status: purchaseOrder.status,
            message: `PO ${purchaseOrder._id} changed to ${purchaseOrder.status}.`
        });

        await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER], {
            domains: ["purchaseOrders", "slips", "inventory", "materials", "production", "alerts"],
            action: "status_updated",
            entity: "purchase_order",
            id: purchaseOrder._id,
            message: `PO ${purchaseOrder._id} changed to ${purchaseOrder.status}.`,
            metaData: { status: purchaseOrder.status }
        });

        return { success: true, data: purchaseOrder, message: 'Purchase order status updated successfully' };
    }
    catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.log('[updatePurchaseOrderStatusService] error:', error);
        if (error?.code === 11000) {
            const duplicateKey = Object.keys(error?.keyPattern || {});
            const isImportSlipConflict = duplicateKey.includes('type') || duplicateKey.includes('relatedPurchaseOrder');
            if (isImportSlipConflict) {
                const existingPurchaseOrder = await PurchaseOrder.findById(orderId);
                return {
                    success: true,
                    data: existingPurchaseOrder,
                    message: 'Purchase order status was already updated'
                };
            }
        }
        return { success: false, message: 'Failed to update purchase order status: ' + error.message, data: null };
    } finally {
        session.endSession();
    }
}


export const getAllPurchaseOrdersByIdService = async (id) => {
    try {
        const purchaseOrder = await PurchaseOrder.findById(id)
            .populate('creator', 'username email')
            .populate('sourceProductionOrders', 'orderCode status')
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
            cursor,
            withTotal = true,
            status,
            purchaseOrderItems,
        } = query;
        const { pageNum, limitNum, skip, cursor: cursorId, withTotal: shouldCount } = normalizePagination({ page, limit, cursor, withTotal });
        let filter = {};
        if (creator) filter.creator = creator;
        if (status) filter.status = status;
        if (purchaseOrderItems) filter.purchaseOrderItems = purchaseOrderItems;
        filter = applyCreatedAtCursor(filter, cursorId);
        const totalPromise = shouldCount ? PurchaseOrder.countDocuments(filter) : Promise.resolve(undefined);
        
        const purchaseOrders = await PurchaseOrder.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('creator', 'username email')
            .populate('sourceProductionOrders', 'orderCode status')
            .populate('purchaseOrderItems.material', 'name price barcode code')
            .lean();
        const total = await totalPromise;
        if (!purchaseOrders || purchaseOrders.length === 0) {
            return {
                success: true,
                message: 'Purchase orders not found',
                data: { items: [], purchaseOrders: [], pagination: buildListPagination({ items: [], total, pageNum, limitNum, cursor: cursorId, withTotal: shouldCount }) }
            };
        }
        return {
            success: true,
            data: {
                items: purchaseOrders,
                purchaseOrders,
                pagination: buildListPagination({ items: purchaseOrders, total, pageNum, limitNum, cursor: cursorId, withTotal: shouldCount })
            },
            message: 'Purchase orders retrieved successfully'
        };

    } catch (error) {
        console.log('[getAllPurchaseOrdersService] error:', error);
        return { success: false, message: 'Failed to retrieve purchase orders: ' + error.message, data: null };
    }
}
