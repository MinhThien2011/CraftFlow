import MaterialRequisition from '../models/MaterialRequisition.js';
import Material from '../models/Material.js';
import ProductionOrder from '../models/ProductionOrder.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import { REQUISITION_STATUS, TRANSACTION_TYPE } from '../utils/constants.js';
import mongoose from 'mongoose';

/**
 * Production Manager requests materials for a production order.
 */
export const requestMaterials = async (productionOrderId, managerId, items) => {
  try {
    const order = await ProductionOrder.findById(productionOrderId);
    if (!order) throw new Error('Production order not found.');

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await MaterialRequisition.countDocuments({
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    });
    const requisitionCode = `REQ-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

    const newRequisition = new MaterialRequisition({
      requisitionCode,
      productionOrder: productionOrderId,
      createdBy: managerId,
      items: items.map(item => ({
        material: item.materialId,
        requestedQuantity: item.quantity
      })),
      status: REQUISITION_STATUS.PENDING
    });

    await newRequisition.save();
    return {
      status: 'success',
      message: 'Material requisition submitted.',
      data: { requisition: newRequisition }
    };
  } catch (error) {
    console.log('[MaterialRequisitionService] requestMaterials error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};

/**
 * Warehouse Manager updates requisition status.
 */
export const updateRequisitionStatus = async (requisitionId, managerId, status, updateData = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const requisition = await MaterialRequisition.findById(requisitionId).populate('items.material');
    if (!requisition) throw new Error('Requisition not found.');

    requisition.status = status;
    requisition.khoManager = managerId;
    if (updateData.notes) requisition.notes = updateData.notes;
    if (updateData.evidenceImage) requisition.evidenceImage = updateData.evidenceImage;

    if (status === REQUISITION_STATUS.PREPARED) {
      requisition.preparedAt = new Date();
    }

    if (status === REQUISITION_STATUS.COMPLETED) {
      requisition.completedAt = new Date();

      // Deduct stock and record transactions
      for (const item of requisition.items) {
        const material = await Material.findById(item.material._id);
        const beforeStock = material.currentStock;
        const afterStock = beforeStock - item.requestedQuantity;

        if (afterStock < 0) {
          throw new Error(`Insufficient stock for ${material.name} during issuance.`);
        }

        material.currentStock = afterStock;
        await material.save({ session });

        // Record transaction
        await InventoryTransaction.create([{
          material: material._id,
          type: TRANSACTION_TYPE.ISSUE,
          quantity: -item.requestedQuantity,
          beforeStock,
          afterStock,
          requisition: requisition._id,
          performedBy: requisition.createdBy, // PM who requested
          khoManager: managerId,
          note: `Issued for requisition ${requisition.requisitionCode}`
        }], { session });
      }
    }

    await requisition.save({ session });
    await session.commitTransaction();
    return {
      status: 'success',
      message: `Requisition status updated to ${status}.`,
      data: { requisition }
    };
  } catch (error) {
    await session.abortTransaction();
    console.log('[MaterialRequisitionService] updateRequisitionStatus error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Handle timeout for prepared requisitions.
 * (Currently disabled as timeoutAt was removed)
 */
export const handleRequisitionTimeouts = async () => {
  // Logic removed as per user request to simplify material flow
  return { status: 'success', message: 'Timeout handling disabled.' };
};

/**
 * Get all requisitions for a production order.
 */
export const getRequisitionsByOrder = async (orderId) => {
  try {
    const requisitions = await MaterialRequisition.find({ productionOrder: orderId }).populate('items.material');
    return { status: 'success', data: { requisitions } };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
};
