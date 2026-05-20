import MaterialRequisition from '../models/MaterialRequisition.js';
import SystemSetting from '../models/SystemSetting.js';
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
import {
  autoUpdateInsufficientOrders,
  getMaterialIssueReadiness,
  notifyAssignedStaffProductionStarted
} from './productionOrderService.js';
import { createNotification } from './notificationService.js';
import { emitDataChanged, notifyUsersByRole } from './realtimeService.js';
import InventoryShrinkageReport from '../models/InventoryShrinkageReport.js';
import mongoose from 'mongoose';
import { applyCreatedAtCursor, buildListPagination, normalizePagination } from '../utils/pagination.js';
import { applyAggregateGuards } from '../utils/queryPerformance.js';

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

    // Notify Warehouse Managers
    const warehouseManagers = [];
    for (const wm of warehouseManagers) {
      await createNotification({
        recipient: wm._id,
        title: 'Yêu cầu cấp vật tư mới',
        message: `Lệnh sản xuất ${order.orderCode} vừa tạo yêu cầu cấp vật tư mới (${requisitionCode}).`,
        type: 'INVENTORY',
        priority: 'MEDIUM',
        metaData: { requisitionId: newRequisition._id, orderId: order._id }
      });
    }

    await notifyUsersByRole({
      roles: [ROLES.KHO_MANAGER],
      excludeUserId: managerId,
      title: 'Yêu cầu cấp vật tư mới',
      message: `Đơn sản xuất ${order.orderCode} vừa tạo yêu cầu cấp vật tư mới (${requisitionCode}).`,
      type: 'INVENTORY',
      priority: 'MEDIUM',
      metaData: { requisitionId: newRequisition._id, orderId: order._id }
    });

    await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER], {
      domains: ["requisitions", "production", "inventory", "materials", "slips"],
      action: "created",
      entity: "material_requisition",
      id: newRequisition._id,
      message: `Material requisition ${requisitionCode} was created.`,
      metaData: { requisitionId: newRequisition._id, requisitionCode, orderId: order._id }
    });

    return ServiceResponse(true, 'Đã gửi yêu cầu cấp vật tư thành công.', newRequisition, 201);
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
      notes: `Yêu cầu bổ sung cho lệnh sản xuất ${productionOrder.orderCode}`
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

    await notifyUsersByRole({
      roles: [ROLES.KHO_MANAGER],
      excludeUserId: managerId,
      title: 'Yêu cầu vật tư bổ sung',
      message: `Đơn ${productionOrder.orderCode} có yêu cầu vật tư bổ sung mới.`,
      type: 'INVENTORY',
      priority: 'HIGH',
      metaData: { requisitionId: newRequisition._id, orderId: productionOrder._id }
    });

    await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER], {
      domains: ["requisitions", "production", "inventory", "materials", "alerts"],
      action: "created",
      entity: "material_requisition",
      id: newRequisition._id,
      message: `Supplementary requisition was created for order ${productionOrder.orderCode}.`,
      metaData: { requisitionId: newRequisition._id, orderId: productionOrder._id }
    });

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
      notes: `Yêu cầu hoàn trả vật liệu cho lệnh sản xuất ${productionOrder.orderCode}`
    });

    await newRequisition.save();

    await notifyUsersByRole({
      roles: [ROLES.KHO_MANAGER],
      excludeUserId: managerId,
      title: 'Yêu cầu hoàn trả vật tư',
      message: `Đơn ${productionOrder.orderCode} có yêu cầu hoàn trả vật tư.`,
      type: 'INVENTORY',
      priority: 'MEDIUM',
      metaData: { requisitionId: newRequisition._id, orderId: productionOrder._id }
    });

    await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER], {
      domains: ["requisitions", "production", "inventory", "materials"],
      action: "created",
      entity: "material_requisition",
      id: newRequisition._id,
      message: `Return requisition was created for order ${productionOrder.orderCode}.`,
      metaData: { requisitionId: newRequisition._id, orderId: productionOrder._id }
    });

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
      reason: `Nhập kho hoàn trả từ lệnh sản xuất ${productionOrder?.orderCode || ''}`,
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

    const linkedShrinkageReport = await InventoryShrinkageReport.findOne({
      relatedReturnRequisition: requisition._id
    }).session(session);
    if (linkedShrinkageReport) {
      linkedShrinkageReport.relatedReturnSlip = slipResult.data._id;
      await linkedShrinkageReport.save({ session });
    }

    // Trigger auto-update for orders with insufficient materials (since materials are returned)
    const returnedMaterialIds = requisition.items.map(item => item.material._id);
    await autoUpdateInsufficientOrders(returnedMaterialIds, session);

    await session.commitTransaction();

    await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER], {
      domains: ["requisitions", "production", "inventory", "materials", "slips"],
      action: "return_approved",
      entity: "material_requisition",
      id: requisition._id,
      message: `Return requisition ${requisition.requisitionCode || requisition._id} was approved.`,
      metaData: { requisitionId: requisition._id, slipId: slipResult.data._id, orderId: requisition.productionOrder }
    });

    return {
      success: true,
      message: 'Return requisition approved and import slip created.',
      data: { requisition, slip: slipResult.data }
    };
  } catch (error) {
    await session.abortTransaction();
    console.log('[MaterialRequisitionService] approveReturnRequisition error:', error);
    return { success: false, message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Get all material requisitions with filtering, searching and pagination.
 */
export const getRequisitions = async ({ status, productionOrderId, search, page = 1, limit = 10, type, cursor, withTotal = true }) => {
  try {
    const { pageNum, limitNum, skip, cursor: cursorId, withTotal: shouldCount } = normalizePagination({ page, limit, cursor, withTotal });

    let query = {};
    if (status) query.status = status;
    if (productionOrderId && mongoose.Types.ObjectId.isValid(productionOrderId)) {
      query.productionOrder = new mongoose.Types.ObjectId(productionOrderId);
    }

    if (type) {
      const types = type.split(',');
      query.type = { $in: types };
    }

    if (search) {
      query.$text = { $search: String(search).trim() };
    }
    query = applyCreatedAtCursor(query, cursorId);

    const dataPipeline = [
      { $sort: { createdAt: -1, _id: -1 } },
      { $skip: skip },
      { $limit: limitNum },
      {
        $lookup: {
          from: 'productionorders',
          localField: 'productionOrder',
          foreignField: '_id',
          pipeline: [{ $project: { orderCode: 1, status: 1, products: 1, deadline: 1, priority: 1 } }],
          as: 'productionOrder'
        }
      },
      { $unwind: { path: '$productionOrder', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          pipeline: [{ $project: { fullName: 1, username: 1 } }],
          as: 'createdBy'
        }
      },
      { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'khoManager',
          foreignField: '_id',
          pipeline: [{ $project: { fullName: 1, username: 1 } }],
          as: 'khoManager'
        }
      },
      { $unwind: { path: '$khoManager', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'materials',
          localField: 'items.material',
          foreignField: '_id',
          pipeline: [{ $project: { name: 1, code: 1, unit: 1, currentStock: 1 } }],
          as: 'itemMaterials'
        }
      },
      {
        $addFields: {
          items: {
            $map: {
              input: '$items',
              as: 'item',
              in: {
                $mergeObjects: [
                  '$$item',
                  {
                    material: {
                      $first: {
                        $filter: {
                          input: '$itemMaterials',
                          as: 'material',
                          cond: { $eq: ['$$material._id', '$$item.material'] }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      { $project: { itemMaterials: 0, __v: 0 } }
    ];

    const pipeline = shouldCount
      ? [{ $match: query }, { $facet: { data: dataPipeline, metadata: [{ $count: 'total' }] } }]
      : [{ $match: query }, ...dataPipeline];

    const aggregateResult = await applyAggregateGuards(MaterialRequisition.aggregate(pipeline));
    const requisitions = shouldCount ? (aggregateResult[0]?.data || []) : aggregateResult;
    const total = shouldCount ? (aggregateResult[0]?.metadata?.[0]?.total || 0) : undefined;

    return {
      success: true,
      message: 'Requisitions retrieved successfully.',
      data: {
        requisitions,
        pagination: buildListPagination({ items: requisitions, total, pageNum, limitNum, cursor: cursorId, withTotal: shouldCount })
      }
    };
  } catch (error) {
    console.log('[MaterialRequisitionService] getRequisitions error:', error);
    return { success: false, message: error.message, data: null };
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
    return { success: false, message: error.message, data: null };
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
    return { success: false, message: error.message, data: null };
  }
};

/**
 * Warehouse Manager updates requisition status.
 */
export const updateRequisitionStatus = async (requisitionId, managerId, status, updateData = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let productionStarted = null;
  try {
    const requisition = await MaterialRequisition.findById(requisitionId)
      .populate('items.material')
      .populate('createdBy', 'fullName');
    if (!requisition) return { success: false, message: 'Requisition not found.', data: null };

    const oldStatus = requisition.status;
    requisition.status = status;
    requisition.khoManager = managerId;
    if (updateData.notes) requisition.notes = updateData.notes;
    if (updateData.evidenceImage) requisition.evidenceImage = updateData.evidenceImage;

    // Handle specific status logic
    if (status === REQUISITION_STATUS.ACCEPTED) {
      if (oldStatus !== REQUISITION_STATUS.PENDING) {
        throw new Error('Can only accept a pending requisition.');
      }
      requisition.acceptedAt = new Date();

      // 1. Check stock availability before accepting
      const stockCheck = await checkStockAvailability(requisition.items, session);
      if (!stockCheck.allAvailable) {
        await session.abortTransaction();
        return {
          success: false,
          message: `Không đủ tồn kho cho: ${stockCheck.insufficientItems.map(i => i.material).join(', ')}. Vui lòng kiểm tra lại tồn kho hoặc chờ nhập hàng.`,
          data: { insufficientItems: stockCheck.insufficientItems }
        };
      }

      // 2. Create Export Slip (if not already created)
      if (!requisition.relatedSlip) {
        const slipItems = requisition.items.map(item => ({
          material: item.material._id,
          itemName: item.material.name,
          itemCode: item.material.code,
          unit: item.material.unit,
          quantity: {
            requested: item.requestedQuantity,
            actual: 0 // Will be filled during export process
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

        const slipResult = await createSlipService(slipData, managerId, session);
        if (!slipResult.success) {
          throw new Error(`Failed to create export slip: ${slipResult.message}`);
        }
        requisition.relatedSlip = slipResult.data._id;
      }
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
      // If requisition is completed manually without slip finalizing it
      if (oldStatus !== REQUISITION_STATUS.COMPLETED) {
        requisition.completedAt = new Date();

        // Only perform manual deduction if there's no slip or slip is not completed
        // (Usually the slip's finalizeInventoryUpdate will handle this and set status to COMPLETED)
        // Here we add a safety check or just let it proceed if they really want to complete it manually

        for (const item of requisition.items) {
          const material = await Material.findById(item.material._id).session(session);
          if (!material) throw new Error(`Material ${item.material._id} not found.`);

          const beforeStock = material.currentStock;
          const fifoResult = await allocateBatchesForMaterial(item.material._id, item.requestedQuantity, session);
          if (!fifoResult.success) {
            throw new Error(`FIFO allocation failed for ${material.name}: ${fifoResult.message}`);
          }

          const batchAllocations = fifoResult.data;
          item.batchAllocations = batchAllocations;

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
              note: `Xuất kho cho yêu cầu ${requisition.requisitionCode}. Lô: ${allocation.batchNumber}.`
            }], { session });
          }

          const updatedMaterial = await Material.findOneAndUpdate(
            { _id: material._id, currentStock: { $gte: item.requestedQuantity } },
            { $inc: { currentStock: -item.requestedQuantity } },
            { returnDocument: 'after', session }
          );

          if (!updatedMaterial) {
            throw new Error(`Insufficient stock for material ${material.name}.`);
          }

          if (material.shelf) await updateShelfLoad(material.shelf, session);
          item.actualQuantity = item.requestedQuantity;
        }

        // Update Production Order status
        const productionOrder = await ProductionOrder.findById(requisition.productionOrder).session(session);
        if (productionOrder) {
          for (const item of requisition.items) {
            const bomIndex = productionOrder.materials.findIndex(m => m.material.toString() === item.material._id.toString());
            if (bomIndex > -1) {
              productionOrder.materials[bomIndex].issuedQuantity += item.requestedQuantity;
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
            }
          } else if (productionOrder.status === ORDER_STATUS.INSUFFICIENT_MATERIALS || productionOrder.status === ORDER_STATUS.PENDING) {
            productionOrder.status = ORDER_STATUS.READY_TO_ASSIGN;
          }
          await productionOrder.save({ session });

        }
      }
    }

    await requisition.save({ session });
    await session.commitTransaction();

    if (productionStarted) {
      await notifyAssignedStaffProductionStarted(productionStarted.orderId, productionStarted.orderCode);
    }

    await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER], {
      domains: ["requisitions", "production", "inventory", "materials", "slips"],
      action: "status_updated",
      entity: "material_requisition",
      id: requisition._id,
      message: `Requisition ${requisition.requisitionCode || requisition._id} changed to ${status}.`,
      metaData: {
        requisitionId: requisition._id,
        requisitionCode: requisition.requisitionCode,
        orderId: requisition.productionOrder,
        status
      }
    });

    return ServiceResponse(true, `Requisition status updated to ${status}.`, requisition);
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

/**
 * Fetch global material requisition settings.
 */
export const getRequisitionSettings = async () => {
  try {
    let setting = await SystemSetting.findOne({ key: 'auto_accept_requisitions' });
    if (!setting) {
      setting = await SystemSetting.create({
        key: 'auto_accept_requisitions',
        value: false,
        description: 'Auto-accept material requisitions when stock becomes sufficient after import.'
      });
    }
    return { success: true, data: { autoAcceptRequisitions: setting.value } };
  } catch (error) {
    console.error('[materialRequisitionService] getRequisitionSettings error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Update global material requisition settings.
 */
export const updateRequisitionSettings = async (value) => {
  try {
    let setting = await SystemSetting.findOneAndUpdate(
      { key: 'auto_accept_requisitions' },
      { $set: { value: !!value } },
      { returnDocument: 'after', upsert: true }
    );
    return { success: true, message: 'Settings updated successfully.', data: { autoAcceptRequisitions: setting.value } };
  } catch (error) {
    console.error('[materialRequisitionService] updateRequisitionSettings error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Automatically transitions eligible PENDING requisitions to ACCEPTED status
 * if the global 'auto_accept_requisitions' setting is enabled and warehouse has enough stock.
 */
export const autoAcceptRequisitionsIfSufficient = async (materialIds = [], managerId = null, session = null) => {
  try {
    // 1. Fetch system setting
    const setting = await SystemSetting.findOne({ key: 'auto_accept_requisitions' }).session(session);
    const isEnabled = setting ? setting.value : false;
    if (!isEnabled) {
      console.log('[AutoAccept] Auto-accept requisition setting is disabled.');
      return { success: true, processedCount: 0 };
    }

    if (!materialIds || materialIds.length === 0) return { success: true, processedCount: 0 };

    // 2. Find pending issue/supplementary requisitions containing the updated materials
    const pendingRequisitions = await MaterialRequisition.find({
      status: REQUISITION_STATUS.PENDING,
      type: { $in: [REQUISITION_TYPE.ISSUE, REQUISITION_TYPE.SUPPLEMENTARY] },
      'items.material': { $in: materialIds }
    })
    .populate('items.material')
    .populate('createdBy', 'fullName')
    .session(session);

    if (pendingRequisitions.length === 0) return { success: true, processedCount: 0 };

    let processedCount = 0;
    for (const requisition of pendingRequisitions) {
      // 3. Check stock availability for this requisition
      const stockCheck = await checkStockAvailability(requisition.items, session);
      if (stockCheck.allAvailable) {
        // Auto-accept!
        requisition.status = REQUISITION_STATUS.ACCEPTED;
        requisition.acceptedAt = new Date();
        if (managerId) requisition.khoManager = managerId;
        requisition.notes = "Hệ thống tự động tiếp nhận khi đủ tồn kho vật liệu.";

        // Create Export Slip
        const slipItems = requisition.items.map(item => ({
          material: item.material._id,
          itemName: item.material.name,
          itemCode: item.material.code,
          unit: item.material.unit,
          quantity: {
            requested: item.requestedQuantity,
            actual: 0
          },
          unitPrice: item.material.price || 0,
          amount: 0
        }));

        const slipData = {
          type: INVENTORY_IMPORT_EXPORT_SLIP_TYPE.EXPORT,
          reason: `Hệ thống tự động tiếp nhận & tạo phiếu xuất theo yêu cầu ${requisition.requisitionCode}`,
          personName: requisition.createdBy?.fullName || 'Người yêu cầu',
          relatedProductionOrder: requisition.productionOrder,
          relatedRequisition: requisition._id,
          items: slipItems,
          date: new Date(),
          status: INVENTORY_IMPORT_EXPORT_SLIP_STATUS.PENDING
        };

        const slipResult = await createSlipService(slipData, managerId || requisition.createdBy?._id, session);
        if (!slipResult.success) {
          console.error(`[AutoAccept] Failed to create export slip for ${requisition.requisitionCode}: ${slipResult.message}`);
          continue;
        }

        requisition.relatedSlip = slipResult.data._id;
        await requisition.save({ session });
        processedCount++;
        console.log(`[AutoAccept] Automatically accepted requisition ${requisition.requisitionCode} and created slip.`);

        // Notify
        await emitDataChanged([ROLES.ADMIN, ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER], {
          domains: ["requisitions", "slips"],
          action: "status_updated",
          entity: "material_requisition",
          id: requisition._id,
          message: `Hệ thống tự động tiếp nhận yêu cầu vật tư ${requisition.requisitionCode} do đủ tồn kho.`,
          metaData: { requisitionId: requisition._id, requisitionCode: requisition.requisitionCode, status: REQUISITION_STATUS.ACCEPTED }
        });
      }
    }

    return { success: true, processedCount };
  } catch (error) {
    console.error('[AutoAccept] Error in autoAcceptRequisitionsIfSufficient:', error);
    return { success: false, error: error.message };
  }
};
