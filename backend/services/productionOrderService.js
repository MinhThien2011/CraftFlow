import ProductionOrder from '../models/ProductionOrder.js';
import Product from '../models/Product.js';
import Material from '../models/Material.js';
import User from '../models/User.js';
import ProductionOrderAssignment from '../models/ProductionOrderAssignment.js';
import InventoryTransaction from '../models/InventoryTransaction.js'; // Import InventoryTransaction
import MaterialRequisition from '../models/MaterialRequisition.js';
import InventoryImportExportSlip from '../models/InventoryImportExportSlip.js';
import { ORDER_STATUS, ROLES, TRANSACTION_TYPE, REQUISITION_STATUS, INVENTORY_IMPORT_EXPORT_SLIP_TYPE, INVENTORY_IMPORT_EXPORT_SLIP_STATUS } from '../utils/constants.js'; // Import TRANSACTION_TYPE
import { generateSlipNumber } from '../utils/slipHelper.js';
import mongoose from 'mongoose';

/**
 * Create a new production order with stock check and automatic material requisition.
 */
export const createProductionOrder = async (orderData, creatorId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const product = await Product.findById(orderData.productId).lean();
    if (!product) throw new Error('Product not found.');

    // 1. Check stock availability for estimated materials - Optimized with batch fetch
    const materialIds = product.estimateMaterialCost.map(item => item.material);
    const materials = await Material.find({ _id: { $in: materialIds } }).session(session).lean();

    const materialMap = new Map(materials.map(m => [m._id.toString(), m]));
    let hasInsufficientStock = false;

    for (const item of product.estimateMaterialCost) {
      const material = materialMap.get(item.material.toString());
      if (!material) {
        throw new Error(`Material ${item.materialName || item.materialCode} not found in inventory.`);
      }

      const neededQuantity = item.quantity * orderData.quantity;
      if (material.currentStock < neededQuantity) {
        hasInsufficientStock = true;
      }
    }

    // 2. Generate order code
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await ProductionOrder.countDocuments({
      createdAt: { $gte: today }
    }).session(session);

    const orderCode = `CF-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

    // Calculate total estimated time for the whole order
    const estimatedCompletionTime = orderData.quantity * (product.estimatedProductionTime || 0);

    // 3. Create order
    const newOrder = new ProductionOrder({
      ...orderData,
      orderCode,
      estimatedCompletionTime,
      createdBy: creatorId,
      status: hasInsufficientStock ? ORDER_STATUS.INSUFFICIENT_MATERIALS : ORDER_STATUS.READY_TO_ASSIGN
    });

    await newOrder.save({ session });

    // 4. Automatically create Material Requisition (Phiếu xuất vật liệu)
    const reqCount = await MaterialRequisition.countDocuments({
      createdAt: { $gte: today }
    }).session(session);
    const requisitionCode = `REQ-${dateStr}-${(reqCount + 1).toString().padStart(3, '0')}`;

    const newRequisition = new MaterialRequisition({
      requisitionCode,
      productionOrder: newOrder._id,
      createdBy: creatorId,
      items: product.estimateMaterialCost.map(item => ({
        material: item.material,
        requestedQuantity: item.quantity * orderData.quantity
      })),
      status: REQUISITION_STATUS.PENDING
    });

    await newRequisition.save({ session });

    await session.commitTransaction();
    console.log(`[Production] Order ${orderCode} and Requisition ${requisitionCode} created successfully.`);

    return {
      status: 'success',
      message: hasInsufficientStock
        ? 'Production order created with insufficient materials status. Requisition pending.'
        : 'Production order created and ready to assign. Requisition pending.',
      data: { order: newOrder, requisition: newRequisition }
    };
  } catch (error) {
    await session.abortTransaction();
    console.log('[ProductionOrderService] createProductionOrder error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Re-check stock and update order status to ready_to_assign if materials are enough.
 */
export const checkOrderMaterials = async (orderId) => {
  try {
    const order = await ProductionOrder.findById(orderId).populate('productId');
    if (!order) throw new Error('Order not found.');

    if (order.status !== ORDER_STATUS.INSUFFICIENT_MATERIALS) {
      return { status: 'error', message: 'Order is not in insufficient materials status.', data: null };
    }

    const product = order.productId;
    const totalQuantity = order.quantity;

    for (const item of product.estimateMaterialCost) {
      const material = await Material.findById(item.material).lean();

      if (!material) throw new Error(`Material ${item.materialName || item.materialCode} not found.`);

      const neededQuantity = item.quantity * totalQuantity;
      if (material.currentStock < neededQuantity) {
        return {
          status: 'error',
          message: `Still insufficient stock for ${material.name}. Needed: ${neededQuantity}, Available: ${material.currentStock}`,
          data: { material: material.name, needed: neededQuantity, available: material.currentStock }
        };
      }
    }

    order.status = ORDER_STATUS.READY_TO_ASSIGN;
    await order.save();

    return {
      status: 'success',
      message: 'Materials are now sufficient. Order is ready to be assigned.',
      data: { order }
    };
  } catch (error) {
    console.log('[ProductionOrderService] checkOrderMaterials error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};

/**
 * Get staff suggestions based on current workload.
 */
export const getStaffSuggestions = async () => {
  try {
    // Find all staff users
    const staff = await User.find({ isActive: true })
      .populate('role')
      .lean();

    const staffList = staff.filter(u => u.role && u.role.roleName === ROLES.STAFF);

    // Sort by workload (currentAssignedQuantity) ascending
    const suggestions = staffList.sort((a, b) =>
      (a.currentAssignedQuantity || 0) - (b.currentAssignedQuantity || 0)
    );

    return {
      status: 'success',
      message: 'Staff suggestions retrieved.',
      data: { suggestions }
    };
  } catch (error) {
    console.log('[ProductionOrderService] getStaffSuggestions error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};

/**
 * Assign sub-orders to staff.
 */
export const assignProductionOrder = async (orderId, assignments) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await ProductionOrder.findById(orderId).session(session);
    if (!order) throw new Error('Order not found.');

    if (order.status !== ORDER_STATUS.READY_TO_ASSIGN && order.status !== ORDER_STATUS.ASSIGNED) {
      throw new Error(`Order must be in ${ORDER_STATUS.READY_TO_ASSIGN} or ${ORDER_STATUS.ASSIGNED} status before assigning.`);
    }

    const staffIds = assignments.map(a => a.staffId);
    const staffMembers = await User.find({ _id: { $in: staffIds } }).session(session);
    const staffMap = new Map(staffMembers.map(s => [s._id.toString(), s]));

    let totalAssigned = 0;
    const newAssignments = [];

    // Fetch existing assignments to check total quantity
    const existingAssignments = await ProductionOrderAssignment.find({ productionOrder: orderId }).session(session);
    const alreadyAssignedQuantity = existingAssignments.reduce((sum, a) => sum + a.assignedQuantity, 0);

    for (const assign of assignments) {
      const { staffId, assignedQuantity } = assign;

      if (!staffMap.has(staffId)) {
        throw new Error(`Staff member with ID ${staffId} not found.`);
      }

      const newAssign = new ProductionOrderAssignment({
        productionOrder: orderId,
        staff: staffId,
        assignedQuantity,
        status: ORDER_STATUS.ASSIGNED
      });

      await newAssign.save({ session });

      // Update staff workload
      await User.findByIdAndUpdate(staffId, {
        $inc: { currentAssignedQuantity: assignedQuantity }
      }, { session });

      newAssignments.push(newAssign);
      totalAssigned += assignedQuantity;
    }

    if (alreadyAssignedQuantity + totalAssigned > order.quantity) {
      throw new Error(`Total assigned quantity (${alreadyAssignedQuantity + totalAssigned}) exceeds order quantity (${order.quantity}).`);
    }

    order.status = ORDER_STATUS.ASSIGNED;
    await order.save({ session });

    await session.commitTransaction();
    console.log(`[Production] Order ${orderId} assigned to ${newAssignments.length} staff members. Total assigned: ${alreadyAssignedQuantity + totalAssigned}/${order.quantity}`);

    return {
      status: 'success',
      message: 'Assignments created successfully.',
      data: { assignments: newAssignments }
    };
  } catch (error) {
    await session.abortTransaction();
    console.log('[ProductionOrderService] assignProductionOrder error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Reassign a sub-order to a different staff.
 */
export const reassignProductionOrder = async (assignmentId, newStaffId, reason = '') => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const assignment = await ProductionOrderAssignment.findById(assignmentId);
    if (!assignment) throw new Error('Assignment not found.');

    if (assignment.status === ORDER_STATUS.COMPLETED) {
      throw new Error('Cannot reassign a completed assignment.');
    }

    const oldStaffId = assignment.staff;
    const quantity = assignment.assignedQuantity;

    // 1. Update old staff workload
    await User.findByIdAndUpdate(oldStaffId, {
      $inc: { currentAssignedQuantity: -quantity }
    }, { session });

    // 2. Update new staff workload
    await User.findByIdAndUpdate(newStaffId, {
      $inc: { currentAssignedQuantity: quantity }
    }, { session });

    // 3. Update assignment record
    assignment.previousStaff = oldStaffId;
    assignment.staff = newStaffId;
    assignment.reassignedAt = new Date();
    assignment.notes = (assignment.notes || '') + `\n[REASSIGNED] Reason: ${reason}`;

    await assignment.save({ session });

    await session.commitTransaction();
    return {
      status: 'success',
      message: 'Assignment reassigned successfully.',
      data: { assignment }
    };
  } catch (error) {
    await session.abortTransaction();
    console.log('[ProductionOrderService] reassignProductionOrder error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Update sub-order status and check if parent order is completed.
 * Enhanced with milestone reporting (50%, 75%, 100%) and better logging.
 * @param {string} assignmentId - ID of the assignment to update
 * @param {string} status - New status
 * @param {number} completedQuantity - New completed quantity
 * @param {string} [actorId] - Optional actor ID for security check (if staff)
 */
export const updateAssignmentStatus = async (assignmentId, status, completedQuantity = 0, actorId = null) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const assignment = await ProductionOrderAssignment.findById(assignmentId).populate({
      path: 'productionOrder',
      populate: { path: 'productId' }
    });
    if (!assignment) throw new Error('Assignment not found.');

    // Security check: If actor is provided, it must be the assigned staff
    if (actorId && assignment.staff.toString() !== actorId.toString()) {
      throw new Error('You are not authorized to update this assignment.');
    }

    const oldStatus = assignment.status;
    assignment.status = status;

    // Set startedAt when first moving to IN_PRODUCTION
    if (status === ORDER_STATUS.IN_PRODUCTION && !assignment.startedAt) {
      assignment.startedAt = new Date();
      console.log(`[Production] Assignment ${assignmentId} started at ${assignment.startedAt}`);
    }

    if (completedQuantity > 0) {
      if (completedQuantity > assignment.assignedQuantity) {
        throw new Error(`Completed quantity (${completedQuantity}) cannot exceed assigned quantity (${assignment.assignedQuantity}).`);
      }
      assignment.completedQuantity = completedQuantity;
    }

    // Milestone Reporting Logic (50%, 75%, 100%)
    const progressPercent = (assignment.completedQuantity / assignment.assignedQuantity) * 100;
    const milestones = [50, 75, 100];

    for (const milestone of milestones) {
      if (progressPercent >= milestone && !assignment.reportedMilestones.includes(milestone)) {
        assignment.reportedMilestones.push(milestone);
        assignment.lastReportedAt = new Date();

        // Calculate time-based progress for logging/analytics
        let timeProgressMsg = '';
        if (assignment.startedAt) {
          const product = assignment.productionOrder.productId;
          const estimatedTimePerUnit = product.estimatedProductionTime || 0; // assuming minutes
          const totalEstimatedMinutes = assignment.assignedQuantity * estimatedTimePerUnit;
          const actualElapsedMinutes = (new Date() - assignment.startedAt) / (1000 * 60);

          timeProgressMsg = `(Time progress: ${actualElapsedMinutes.toFixed(1)}/${totalEstimatedMinutes} mins)`;
        }

        console.log(`[ProductionReport] Milestone ${milestone}% reached for Assignment ${assignmentId}. Quantity: ${assignment.completedQuantity}/${assignment.assignedQuantity} ${timeProgressMsg}`);
      }
    }

    if (status === ORDER_STATUS.COMPLETED) {
      // Force 100% milestone if completed
      if (!assignment.reportedMilestones.includes(100)) {
        assignment.reportedMilestones.push(100);
      }
      assignment.completedQuantity = assignment.assignedQuantity; // Ensure full quantity
      assignment.finishedAt = new Date();

      // Reduce staff workload upon completion
      await User.findByIdAndUpdate(assignment.staff, {
        $inc: { currentAssignedQuantity: -assignment.assignedQuantity }
      }, { session });
    }

    await assignment.save({ session });

    // Check parent order completion
    const parentOrderId = assignment.productionOrder._id;
    const allAssignments = await ProductionOrderAssignment.find({ productionOrder: parentOrderId }).session(session);

    const allCompleted = allAssignments.every(a => a.status === ORDER_STATUS.COMPLETED);

    if (allCompleted) {
      const completedOrder = await ProductionOrder.findByIdAndUpdate(parentOrderId, {
        status: ORDER_STATUS.COMPLETED,
        completedAt: new Date()
      }, { session, returnDocument: 'after' }).lean();

      // Note: Product inventory is no longer updated here. 
      // It will be updated via InventoryImportExportSlip created by Production Manager.

      console.log(`[Production] Parent Order ${parentOrderId} fully completed. Waiting for Stock-In Slip.`);
    } else {
      // Check if any is in production
      const anyInProduction = allAssignments.some(a =>
        [ORDER_STATUS.IN_PRODUCTION, ORDER_STATUS.PARTIALLY_COMPLETE].includes(a.status)
      );
      if (anyInProduction) {
        await ProductionOrder.findByIdAndUpdate(parentOrderId, {
          status: ORDER_STATUS.IN_PRODUCTION
        }, { session });
      }
    }

    await session.commitTransaction();
    return {
      status: 'success',
      message: 'Assignment status updated and progress tracked.',
      data: {
        assignment,
        orderCompleted: allCompleted,
        newMilestones: assignment.reportedMilestones
      }
    };
  } catch (error) {
    await session.abortTransaction();
    console.log('[ProductionOrderService] updateAssignmentStatus error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Production Manager creates an internal stock-in receipt for a completed order.
 */
export const createStockInSlip = async (orderId, managerId, slipData) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await ProductionOrder.findById(orderId).populate('productId').session(session);
    if (!order) throw new Error('Production order not found.');
    if (order.status !== ORDER_STATUS.COMPLETED) {
      throw new Error('Production order must be completed before creating stock-in slip.');
    }

    // Check if a slip already exists for this order
    const existingSlip = await InventoryImportExportSlip.findOne({ relatedProductionOrder: orderId }).session(session);
    if (existingSlip) {
      throw new Error('A stock-in slip already exists for this production order.');
    }

    const slipNumber = await generateSlipNumber(INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT);

    const newSlip = new InventoryImportExportSlip({
      type: INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT,
      slipNumber,
      relatedProductionOrder: orderId,
      reason: `Nhập kho thành phẩm từ lệnh sản xuất ${order.orderCode}`,
      items: [{
        product: order.productId._id,
        itemName: order.productId.name,
        itemCode: order.productId.code,
        unit: order.productId.unit || 'cái',
        quantity: {
          requested: order.quantity,
          actual: slipData.actualQuantity || order.quantity
        },
        unitPrice: order.productId.baseCost || 0
      }],
      signatures: {
        creator: managerId,
        personInOut: slipData.personInOut || 'Bộ phận sản xuất'
      },
      images: slipData.images || [],
      notes: slipData.notes || '',
      status: INVENTORY_IMPORT_EXPORT_SLIP_STATUS.PENDING
    });

    await newSlip.save({ session });
    await session.commitTransaction();

    return {
      status: 'success',
      message: 'Internal stock-in slip created. Waiting for Warehouse Manager approval.',
      data: { slip: newSlip }
    };
  } catch (error) {
    await session.abortTransaction();
    console.log('[ProductionOrderService] createStockInSlip error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
  }
};
