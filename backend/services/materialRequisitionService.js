import MaterialRequisition from '../models/MaterialRequisition.js';
import Material from '../models/Material.js';
import ProductionOrder from '../models/ProductionOrder.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import { REQUISITION_STATUS, TRANSACTION_TYPE } from '../utils/constants.js';
import { updateShelfLoad } from './shelfService.js';
import { allocateBatchesForMaterial, createBatch } from './fifoService.js';
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
 * Get all material requisitions with filtering, searching and pagination.
 */
export const getRequisitions = async ({ status, productionOrderId, search, page = 1, limit = 10 }) => {
  try {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (status) query.status = status;
    if (productionOrderId) query.productionOrder = productionOrderId;

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { requisitionCode: searchRegex },
        { notes: searchRegex }
      ];
    }

    const [requisitions, total] = await Promise.all([
      MaterialRequisition.find(query)
        .populate('productionOrder', 'orderCode status products deadline priority')
        .populate('createdBy', 'fullName username')
        .populate('khoManager', 'fullName username')
        .populate('items.material', 'name code unit currentStock')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      MaterialRequisition.countDocuments(query)
    ]);

    return {
      status: 'success',
      message: 'Requisitions retrieved successfully.',
      data: {
        requisitions,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      }
    };
  } catch (error) {
    console.log('[MaterialRequisitionService] getRequisitions error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};

/**
 * Get a single requisition by ID.
 */
export const getRequisitionById = async (id) => {
  try {
    const requisition = await MaterialRequisition.findById(id)
      .populate('productionOrder')
      .populate('createdBy', 'fullName username')
      .populate('khoManager', 'fullName username')
      .populate('items.material')
      .lean();

    if (!requisition) throw new Error('Requisition not found.');

    return {
      status: 'success',
      message: 'Requisition retrieved successfully.',
      data: requisition
    };
  } catch (error) {
    return { status: 'error', message: error.message, data: null };
  }
};

/**
 * Check stock availability for requisition items.
 * Returns list of insufficient items if any.
 */
async function checkStockAvailability(items, session) {
  const result = {
    allAvailable: true,
    insufficientItems: []
  };

  for (const item of items) {
    const material = await Material.findById(item.material).session(session).lean();
    if (!material) continue;

    if (material.currentStock < item.requestedQuantity) {
      result.allAvailable = false;
      result.insufficientItems.push({
        material: material.name || material.code,
        needed: item.requestedQuantity,
        available: material.currentStock
      });
    }
  }

  return result;
}

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

    if (status === REQUISITION_STATUS.ACCEPTED) {
      requisition.acceptedAt = new Date();

      // Check stock availability before accepting
      // Kho Manager can only accept if stock is sufficient OR if there's an approved Purchase Order
      const stockCheck = await checkStockAvailability(requisition.items, session);
      if (!stockCheck.allAvailable) {
        await session.abortTransaction();
        return {
          success: false,
          message: `Insufficient stock for: ${stockCheck.insufficientItems.map(i => i.material).join(', ')}. Stock is available but not enough. Wait for purchase orders to arrive or reject this requisition.`,
          data: {
            insufficientItems: stockCheck.insufficientItems.map(i => ({
              material: i.material,
              needed: i.needed,
              available: i.available
            }))
          }
        };
      }
      else if (status === REQUISITION_STATUS.PREPARING) {
        requisition.preparingAt = new Date();
      }

      else if (status === REQUISITION_STATUS.PREPARED) {
        requisition.preparedAt = new Date();
      }
      else if (status === REQUISITION_STATUS.CANCELLED) {
        requisition.cancelledAt = new Date();
      }
      else if (status === REQUISITION_STATUS.COMPLETED) {
        requisition.completedAt = new Date();
        // Deduct stock and record transactions using FIFO
        for (const item of requisition.items) {
          const material = await Material.findById(item.material._id).session(session);
          if (!material) throw new Error(`Material ${item.material._id} not found.`);

          const beforeStock = material.currentStock;
          // Allocate from batches using FIFO
          const fifoResult = await allocateBatchesForMaterial(item.material._id, item.requestedQuantity, session);
          if (!fifoResult.success) {
            throw new Error(`FIFO allocation failed for ${material.name}: ${fifoResult.message}`);
          }
          const batchAllocations = fifoResult.data;
          // Update batch allocations in requisition item
          item.batchAllocations = batchAllocations;
          // Deduct from each batch and record transactions
          for (const allocation of batchAllocations) {
            await InventoryTransaction.create([{
              material: material._id,
              type: TRANSACTION_TYPE.ISSUE,
              quantity: -allocation.quantityAllocated,
              beforeStock: beforeStock,
              afterStock: beforeStock - allocation.quantityAllocated,
              requisition: requisition._id,
              batch: allocation.batch,
              performedBy: managerId,
              khoManager: managerId,
              note: `Issued for requisition ${requisition.requisitionCode}. Batch: ${allocation.batchNumber}. FIFO allocation.`
            }], { session });
          }

          // Update material's total stock
          material.currentStock = beforeStock - item.requestedQuantity;
          await material.save({ session });

          // Update shelf load if assigned
          if (material.shelf) {
            await updateShelfLoad(material.shelf);
          }

          item.actualQuantity = item.requestedQuantity;
        }

        // Update Production Order status if it was waiting for materials
        const productionOrder = await ProductionOrder.findById(requisition.productionOrder).session(session);
        if (productionOrder && (productionOrder.status === 'insufficient_materials' || productionOrder.status === 'pending')) {
          productionOrder.status = 'ready_to_assign';
          await productionOrder.save({ session });
        }
      }

      await requisition.save({ session });
      await session.commitTransaction();
      return {
        status: 'success',
        message: `Requisition status updated to ${status}.`,
        data: { requisition }
      };
    }
  } catch (error) {
    await session.abortTransaction();
    console.log('[MaterialRequisitionService] updateRequisitionStatus error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
  }
}

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
