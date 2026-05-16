import { EventEmitter } from 'events';
import { autoUpdateInsufficientOrders } from '../services/productionOrderService.js';
import MaterialRequisition from '../models/MaterialRequisition.js';
import ProductionOrder from '../models/ProductionOrder.js';
import ProductExportRequest from '../models/ProductExportRequest.js';
import { REQUISITION_STATUS, REQUISITION_TYPE, ORDER_STATUS, ROLES } from '../utils/constants.js';
import mongoose from 'mongoose';
import { emitToRoles } from '../config/socket.js';

const inventoryEvents = new EventEmitter();

/**
 * Handle post-inventory update logic for Production and Requisitions.
 */
inventoryEvents.on('inventory_finalized', async ({ slip, userId }) => {
    let session = null;
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
        if (slip.relatedRequisition) {
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
                                const bomIndex = productionOrder.materials.findIndex(m => m.material.toString() === matId);
                                if (bomIndex > -1) {
                                    productionOrder.materials[bomIndex].issuedQuantity += item.quantity.actual;
                                }
                            }
                        }

                        // Auto-transition to IN_PRODUCTION if currently ASSIGNED
                        if (productionOrder.status === ORDER_STATUS.ASSIGNED) {
                            productionOrder.status = ORDER_STATUS.IN_PRODUCTION;
                            console.log(`[Event] Production Order ${productionOrder.orderCode} moved to IN_PRODUCTION`);

                            // Real-time notification
                            emitToRoles([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER], 'production_order_status_updated', {
                                orderId: productionOrder._id,
                                orderCode: productionOrder.orderCode,
                                status: ORDER_STATUS.IN_PRODUCTION,
                                message: `Đơn sản xuất ${productionOrder.orderCode} đã tự động chuyển sang Đang sản xuất do vật tư đã được xuất kho.`
                            });
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
