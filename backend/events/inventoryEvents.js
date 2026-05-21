import { EventEmitter } from 'events';
import {
    autoUpdateInsufficientOrders,
    getMaterialIssueReadiness,
    notifyAssignedStaffProductionStarted
} from '../services/productionOrderService.js';
import MaterialRequisition from '../models/MaterialRequisition.js';
import ProductionOrder from '../models/ProductionOrder.js';
import ProductExportRequest from '../models/ProductExportRequest.js';
import { REQUISITION_STATUS, REQUISITION_TYPE, ORDER_STATUS, ROLES } from '../utils/constants.js';
import mongoose from 'mongoose';
import { emitToRoles } from '../config/socket.js';
import { emitDataChanged, notifyUsersByRole } from '../services/realtimeService.js';
import { clearCacheByPattern } from '../utils/redisFetching.js';

const inventoryEvents = new EventEmitter();

/**
 * Handle post-inventory update logic for Production and Requisitions.
 */
inventoryEvents.on('inventory_finalized', async ({ slip, userId, skipRequisitionFinalization = false }) => {
    let session = null;
    let productionStarted = null;
    try {
        console.log(`[Event] Processing inventory_finalized for slip ${slip.slipNumber}`);

        // Start a fresh session for event processing to avoid TransactionCommitted errors
        session = await mongoose.startSession();
        session.startTransaction();

        // 1. Auto-update orders with insufficient materials if this was an IMPORT
        if (slip.type === 'import') {
            const materialIds = slip.items.map(item => item.material).filter(id => !!id);
            await autoUpdateInsufficientOrders(materialIds, session);
        }

        // 2. Handle Requisitions and Production Orders
        if (slip.relatedRequisition && !skipRequisitionFinalization) {
            const requisition = await MaterialRequisition.findById(slip.relatedRequisition).session(session);
            if (requisition) {
                const productionOrder = await ProductionOrder.findById(requisition.productionOrder).session(session);

                if (requisition.type === REQUISITION_TYPE.RETURN) {
                    requisition.status = REQUISITION_STATUS.RETURNED;
                    requisition.completedAt = new Date();
                    if (productionOrder) {
                        for (const item of slip.items) {
                            if (item.material) {
                                const matId = item.material.toString();
                                const bomIndex = productionOrder.materials.findIndex(m => m.material.toString() === matId);
                                if (bomIndex > -1) {
                                    productionOrder.materials[bomIndex].returnedQuantity += item.quantity.actual;
                                } else {
                                    productionOrder.materials.push({
                                        material: item.material,
                                        returnedQuantity: item.quantity.actual,
                                        unit: item.unit
                                    });
                                }
                            }
                        }
                        await productionOrder.save({ session });
                    }
                } else {
                    requisition.status = REQUISITION_STATUS.COMPLETED;
                    requisition.completedAt = new Date();
                    if (productionOrder) {
                        for (const item of slip.items) {
                            if (item.material) {
                                const matId = item.material.toString();
                                const reqItem = requisition.items.find(reqItem => reqItem.material.toString() === matId);
                                if (reqItem) {
                                    reqItem.actualQuantity = item.quantity.actual;
                                }

                                const bomIndex = productionOrder.materials.findIndex(m => m.material.toString() === matId);
                                if (bomIndex > -1) {
                                    productionOrder.materials[bomIndex].issuedQuantity += item.quantity.actual;
                                } else {
                                    productionOrder.materials.push({
                                        material: item.material,
                                        plannedQuantity: reqItem?.requestedQuantity || item.quantity.requested || item.quantity.actual,
                                        issuedQuantity: item.quantity.actual,
                                        returnedQuantity: 0,
                                        unit: item.unit
                                    });
                                }
                            }
                        }

                        if (productionOrder.status === ORDER_STATUS.ASSIGNED) {
                            await requisition.save({ session });
                            const readiness = await getMaterialIssueReadiness(productionOrder._id, session);
                            if (readiness.ready) {
                                productionOrder.status = ORDER_STATUS.IN_PRODUCTION;
                                productionStarted = {
                                    orderId: productionOrder._id,
                                    orderCode: productionOrder.orderCode
                                };
                                console.log(`[Event] Production Order ${productionOrder.orderCode} moved to IN_PRODUCTION`);
                            } else {
                                console.log(`[Event] Production Order ${productionOrder.orderCode} remains ASSIGNED: ${readiness.message}`);
                            }
                        }

                        await productionOrder.save({ session });
                    }
                }
                await requisition.save({ session });
            }
        }

        // 3. Handle Product Export Requests
        if (slip.relatedProductExportRequest) {
            const productExportRequest = await ProductExportRequest.findById(slip.relatedProductExportRequest).session(session);
            if (productExportRequest) {
                productExportRequest.status = REQUISITION_STATUS.COMPLETED;
                productExportRequest.completedAt = new Date();
                productExportRequest.khoManager = userId;

                // Update actual quantities in the request based on slip items
                for (const slipItem of slip.items) {
                    if (slipItem.product) {
                        const requestItem = productExportRequest.items.find(item => item.product.toString() === slipItem.product.toString());
                        if (requestItem) {
                            requestItem.actualQuantity = slipItem.quantity.actual;
                        }
                    }
                }

                await productExportRequest.save({ session });
                console.log(`[Event] Product Export Request ${productExportRequest.requestCode} marked as COMPLETED`);
            }
        }

        await session.commitTransaction();

        // Invalidate Redis caches after transaction commits
        try {
            await Promise.all([
                clearCacheByPattern('production:list:*'),
                clearCacheByPattern('production:detail:*'),
                clearCacheByPattern('material:list:*'),
                clearCacheByPattern('material:detail:*'),
                clearCacheByPattern('product:list:*'),
                clearCacheByPattern('product:detail:*'),
                clearCacheByPattern('dashboard:*')
            ]);
            console.log('[Event] Caches invalidated on inventory_finalized.');
        } catch (cacheError) {
            console.error('⚠️ [Event] Failed to clear caches on inventory_finalized:', cacheError.message);
        }

        if (productionStarted) {
            await emitToRoles([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.STAFF], 'production_order_status_updated', {
                orderId: productionStarted.orderId,
                orderCode: productionStarted.orderCode,
                status: ORDER_STATUS.IN_PRODUCTION,
                message: `Lenh san xuat ${productionStarted.orderCode} da tu dong chuyen sang dang san xuat do vat tu da duoc xuat kho.`
            });

            await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.STAFF, ROLES.KHO_MANAGER], {
                domains: ['production', 'requisitions', 'slips', 'inventory', 'materials', 'notifications'],
                action: 'status_updated',
                entity: 'production_order',
                id: productionStarted.orderId,
                message: `Production order ${productionStarted.orderCode} moved to in_production after material issue flow completed.`,
                metaData: {
                    orderId: productionStarted.orderId,
                    orderCode: productionStarted.orderCode,
                    status: ORDER_STATUS.IN_PRODUCTION
                }
            });

            await notifyUsersByRole({
                roles: [ROLES.PRODUCTION_MANAGER],
                title: 'Don san xuat da du dieu kien san xuat',
                message: `Don ${productionStarted.orderCode} da hoan tat xuat vat tu va duoc chuyen sang dang san xuat.`,
                type: 'PRODUCTION',
                priority: 'HIGH',
                metaData: {
                    orderId: productionStarted.orderId,
                    orderCode: productionStarted.orderCode,
                    status: ORDER_STATUS.IN_PRODUCTION
                }
            });

            await notifyAssignedStaffProductionStarted(productionStarted.orderId, productionStarted.orderCode);
        }
    } catch (error) {
        if (session && session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error('[InventoryEvents] Error in inventory_finalized listener:', error);
    } finally {
        if (session) {
            session.endSession();
        }
    }
});

export default inventoryEvents;

