import { EventEmitter } from 'events';
import { autoUpdateInsufficientOrders } from '../services/productionOrderService.js';
import MaterialRequisition from '../models/MaterialRequisition.js';
import ProductionOrder from '../models/ProductionOrder.js';
import { REQUISITION_STATUS, REQUISITION_TYPE } from '../utils/constants.js';
import mongoose from 'mongoose';

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
                        await productionOrder.save({ session });
                    }
                }
                await requisition.save({ session });
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
