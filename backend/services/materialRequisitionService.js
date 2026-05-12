import MaterialRequisition from '../models/MaterialRequisition.js';
import Material from '../models/Material.js';
import ProductionOrder from '../models/ProductionOrder.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import {
  REQUISITION_STATUS,
  TRANSACTION_TYPE,
  INVENTORY_IMPORT_EXPORT_SLIP_TYPE,
  INVENTORY_IMPORT_EXPORT_SLIP_STATUS,
  REQUISITION_TYPE,
  ORDER_STATUS,
  ROLES
} from '../utils/constants.js';
import { ServiceResponse } from '../utils/serviceHelper.js';
import { generateAtomicCode } from '../utils/codeGenerator.js';
import { updateShelfLoad } from './shelfService.js';
import { allocateBatchesForMaterial, createBatch } from './fifoService.js';
import { createSlipService } from './importExportSlipService.js';
import { autoUpdateInsufficientOrders } from './productionOrderService.js';
import mongoose from 'mongoose';

/**
 * Admin approves a material requisition.
 * This automatically creates an Inventory Export Slip.
 */
export const approveRequisition = async (requisitionId, adminId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const requisition = await MaterialRequisition.findById(requisitionId)
      .populate('items.material')
      .populate('createdBy', 'fullName')
      .session(session);

    if (!requisition) throw new Error('Requisition not found.');
    if (requisition.status !== REQUISITION_STATUS.PENDING) {
      throw new Error(`Requisition cannot be approved. Current status: ${requisition.status}`);
    }

    // 1. Update requisition status
    requisition.status = REQUISITION_STATUS.APPROVED;
    requisition.adminApprovedBy = adminId;

    // 2. Prepare data for Export Slip
    const slipItems = requisition.items.map(item => ({
      material: item.material._id,
      itemName: item.material.name,
      itemCode: item.material.code,
      unit: item.material.unit,
      quantity: {
        requested: item.requestedQuantity,
        actual: 0 // Will be filled by Kho Manager
      },
      unitPrice: item.material.price || 0,
      amount: 0
    }));

    const slipData = {
      type: INVENTORY_IMPORT_EXPORT_SLIP_TYPE.EXPORT,
      reason: `Xuất kho theo yêu cầu ${requisition.requisitionCode}`,
      personName: requisition.createdBy?.fullName || 'Người yêu cầu',
      relatedProductionOrder: requisition.productionOrder,
      relatedRequisition: requisition._id,
      items: slipItems,
      date: new Date(),
      status: INVENTORY_IMPORT_EXPORT_SLIP_STATUS.PENDING
    };

    // 3. Create the Export Slip
    const slipResult = await createSlipService(slipData, adminId);
    if (!slipResult.success) {
      throw new Error(`Failed to create export slip: ${slipResult.message}`);
    }

    const createdSlip = slipResult.data;
    requisition.relatedSlip = createdSlip._id;

    await requisition.save({ session });
    await session.commitTransaction();

    return {
      success: true,
      message: 'Requisition approved and export slip created.',
      data: { requisition, slip: createdSlip }
    };
  } catch (error) {
    await session.abortTransaction();
    console.log('[MaterialRequisitionService] approveRequisition error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Production Manager requests materials for a production order.
 */
export const requestMaterials = async (productionOrderId, managerId, items) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await ProductionOrder.findById(productionOrderId).session(session);
    if (!order) throw new Error('Production order not found.');

    const requisitionCode = await generateAtomicCode('REQ', 'requisition_code');

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

    await newRequisition.save({ session });
    await session.commitTransaction();

    return ServiceResponse(true, 'Material requisition submitted.', newRequisition, 201);
  } catch (error) {
    await session.abortTransaction();
    console.log('[MaterialRequisitionService] requestMaterials error:', error);
    return ServiceResponse(false, error.message);
  } finally {
    session.endSession();
  }
};

/**
 * Request supplementary materials for an existing production order.
 */
export const requestSupplementaryMaterials = async (productionOrderId, managerId, items, parentRequisitionId = null) => {
  try {
    const productionOrder = await ProductionOrder.findById(productionOrderId);
    if (!productionOrder) throw new Error('Production order not found.');

    // Create supplementary requisition
    const newRequisition = new MaterialRequisition({
      productionOrder: productionOrderId,
      createdBy: managerId,
      items: items.map(item => ({
        material: item.materialId,
        requestedQuantity: item.quantity
      })),
      type: REQUISITION_TYPE.SUPPLEMENTARY,
      parentRequisition: parentRequisitionId,
      status: REQUISITION_STATUS.PENDING,
      notes: `Yêu cầu bổ sung cho đơn sản xuất ${productionOrder.orderCode}`
    });

    await newRequisition.save();

    // Update ProductionOrder BOM with supplementary materials
    for (const item of items) {
      const materialIndex = productionOrder.materials.findIndex(m => m.material.toString() === item.materialId);
      if (materialIndex > -1) {
        // Material already exists in BOM, but we track this as supplementary
        // For simplicity, we can just update the plannedQuantity or keep it separate
        // In this case, we'll increment plannedQuantity to reflect total needed
        productionOrder.materials[materialIndex].plannedQuantity += item.quantity;
      } else {
        // New material added to BOM during production
        const material = await Material.findById(item.materialId);
        productionOrder.materials.push({
          material: item.materialId,
          plannedQuantity: item.quantity,
          unit: material?.unit || ''
        });
      }
    }
    await productionOrder.save();

    return {
      success: true,
      message: 'Supplementary material requisition submitted and production order updated.',
      data: { requisition: newRequisition }
    };
  } catch (error) {
    console.log('[MaterialRequisitionService] requestSupplementaryMaterials error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};

/**
 * Request to return excess materials after production.
 */
export const requestReturnMaterials = async (productionOrderId, managerId, items) => {
  try {
    const productionOrder = await ProductionOrder.findById(productionOrderId);
    if (!productionOrder) throw new Error('Production order not found.');

    const newRequisition = new MaterialRequisition({
      productionOrder: productionOrderId,
      createdBy: managerId,
      items: items.map(item => ({
        material: item.materialId,
        requestedQuantity: item.quantity // Quantity being returned
      })),
      type: REQUISITION_TYPE.RETURN,
      status: REQUISITION_STATUS.RETURN_PENDING,
      notes: `Yêu cầu hoàn trả vật liệu cho đơn sản xuất ${productionOrder.orderCode}`
    });

    await newRequisition.save();

    return {
      success: true,
      message: 'Material return request submitted.',
      data: { requisition: newRequisition }
    };
  } catch (error) {
    console.log('[MaterialRequisitionService] requestReturnMaterials error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};

/**
 * Admin or Warehouse Manager approves a return requisition.
 * This should create an IMPORT slip to bring materials back to stock.
 */
export const approveReturnRequisition = async (requisitionId, managerId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const requisition = await MaterialRequisition.findById(requisitionId)
      .populate('items.material')
      .populate('createdBy', 'fullName')
      .session(session);

    if (!requisition) throw new Error('Requisition not found.');
    if (requisition.type !== REQUISITION_TYPE.RETURN) {
      throw new Error('This is not a return requisition.');
    }
    if (requisition.status !== REQUISITION_STATUS.RETURN_PENDING) {
      throw new Error('Requisition is not in return_pending status.');
    }

    requisition.status = REQUISITION_STATUS.RETURN_APPROVED;
    requisition.khoManager = managerId;

    // Create an IMPORT slip for the returned materials
    const slipItems = requisition.items.map(item => ({
      material: item.material._id,
      itemName: item.material.name,
      itemCode: item.material.code,
      unit: item.material.unit,
      quantity: {
        requested: item.requestedQuantity,
        actual: item.requestedQuantity // Initial suggestion, will be verified during import
      },
      unitPrice: item.material.price || 0,
      amount: (item.material.price || 0) * item.requestedQuantity
    }));

    const productionOrder = await ProductionOrder.findById(requisition.productionOrder).session(session);

    const slipData = {
      type: INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT,
      reason: `Nhập kho hoàn trả từ đơn sản xuất ${productionOrder?.orderCode || ''}`,
      personName: requisition.createdBy?.fullName || 'Người hoàn trả',
      relatedProductionOrder: requisition.productionOrder,
      relatedRequisition: requisition._id,
      items: slipItems,
      date: new Date(),
      status: INVENTORY_IMPORT_EXPORT_SLIP_STATUS.PENDING // Warehouse will process this import
    };

    const slipResult = await createSlipService(slipData, managerId);
    if (!slipResult.success) {
      throw new Error(`Failed to create import slip: ${slipResult.message}`);
    }

    requisition.relatedSlip = slipResult.data._id;
    await requisition.save({ session });

    // Trigger auto-update for orders with insufficient materials (since materials are returned)
    const returnedMaterialIds = requisition.items.map(item => item.material._id);
    await autoUpdateInsufficientOrders(returnedMaterialIds, session);

    await session.commitTransaction();
    return {
      success: true,
      message: 'Return requisition approved and import slip created.',
      data: { requisition, slip: slipResult.data }
    };
  } catch (error) {
    await session.abortTransaction();
    console.log('[MaterialRequisitionService] approveReturnRequisition error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
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
      success: true,
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
      success: true,
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
 * Production Manager updates requisition details (notes, etc.)
 */
export const updateRequisitionByManager = async (requisitionId, updateData, managerId) => {
  try {
    const requisition = await MaterialRequisition.findById(requisitionId);
    if (!requisition) throw new Error('Requisition not found.');

    // Only allow update if pending
    if (requisition.status !== REQUISITION_STATUS.PENDING) {
      throw new Error('Can only update requisition when it is in PENDING status.');
    }

    const allowedFields = ['notes']; // Add more fields if needed, but NOT items
    let hasChanges = false;
    const changes = [];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        const oldValue = requisition[field];
        const newValue = updateData[field];

        if (oldValue !== newValue) {
          changes.push({
            field,
            oldValue,
            newValue
          });
          requisition[field] = newValue;
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      await requisition.save();
    }

    return {
      success: true,
      message: hasChanges ? 'Requisition updated successfully.' : 'No changes detected.',
      data: requisition,
      changes: changes
    };
  } catch (error) {
    console.log('[MaterialRequisitionService] updateRequisitionByManager error:', error);
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
            }], { session, ordered: true });
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

        // Update Production Order tracking and status
        const productionOrder = await ProductionOrder.findById(requisition.productionOrder).session(session);
        if (productionOrder) {
          // Update issued quantities in BOM
          for (const item of requisition.items) {
            const materialIndex = productionOrder.materials.findIndex(m => m.material.toString() === item.material._id.toString());
            if (materialIndex > -1) {
              productionOrder.materials[materialIndex].issuedQuantity += item.requestedQuantity;
            } else {
              // This shouldn't happen for ISSUE type, but might for SUPPLEMENTARY if not added during request
              productionOrder.materials.push({
                material: item.material._id,
                issuedQuantity: item.requestedQuantity,
                unit: item.material.unit
              });
            }
          }

          // Update status if it was waiting for materials
          if (productionOrder.status === ORDER_STATUS.INSUFFICIENT_MATERIALS || productionOrder.status === ORDER_STATUS.PENDING) {
            productionOrder.status = ORDER_STATUS.READY_TO_ASSIGN;
          }
          await productionOrder.save({ session });
        }
      }

      await requisition.save({ session });
      await session.commitTransaction();
      return ServiceResponse(true, `Requisition status updated to ${status}.`, requisition);
    }
  } catch (error) {
    await session.abortTransaction();
    console.log('[MaterialRequisitionService] updateRequisitionStatus error:', error);
    return ServiceResponse(false, error.message);
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
  return { success: true, message: 'Timeout handling disabled.' };
};

/**
 * Get all requisitions for a production order.
 */
export const getRequisitionsByOrder = async (orderId) => {
  try {
    const requisitions = await MaterialRequisition.find({ productionOrder: orderId }).populate('items.material');
    return { success: true, data: { requisitions } };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
};
