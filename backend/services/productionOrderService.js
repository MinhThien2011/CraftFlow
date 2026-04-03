import ProductionOrder from '../models/ProductionOrder.js';
import Product from '../models/Product.js';
import Material from '../models/Material.js';
import User from '../models/User.js';
import ProductionOrderAssignment from '../models/ProductionOrderAssignment.js';
import InventoryTransaction from '../models/InventoryTransaction.js'; // Import InventoryTransaction
import { ORDER_STATUS, ROLES, TRANSACTION_TYPE } from '../utils/constants.js'; // Import TRANSACTION_TYPE
import mongoose from 'mongoose';

/**
 * Create a new production order with stock check.
 */
export const createProductionOrder = async (orderData, creatorId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const product = await Product.findById(orderData.productId).lean();
    if (!product) {
      throw new Error('Product not found.');
    }

    // 1. Check stock availability for estimated materials
    const totalQuantity = orderData.quantity;
    let hasInsufficientStock = false;
    
    for (const item of product.estimateMaterialCost) {
      const material = await Material.findById(item.material).lean();

      if (!material) {
        throw new Error(`Material ${item.materialName || item.materialCode} not found in inventory.`);
      }

      const neededQuantity = item.quantity * totalQuantity;
      if (material.currentStock < neededQuantity) {
        hasInsufficientStock = true;
      }
    }

    // 2. Generate order code
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await ProductionOrder.countDocuments({
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    });
    const orderCode = `CF-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

    // 3. Create order
    const newOrder = new ProductionOrder({
      ...orderData,
      orderCode,
      createdBy: creatorId,
      status: hasInsufficientStock ? ORDER_STATUS.INSUFFICIENT_MATERIALS : ORDER_STATUS.READY_TO_ASSIGN
    });

    await newOrder.save({ session });
    await session.commitTransaction();
    
    return {
      status: 'success',
      message: hasInsufficientStock 
        ? 'Production order created with insufficient materials status.' 
        : 'Production order created and ready to assign.',
      data: { order: newOrder }
    };
  } catch (error) {
    await session.abortTransaction();
    console.error('[ProductionOrderService] createProductionOrder error:', error);
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
    console.error('[ProductionOrderService] checkOrderMaterials error:', error);
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
    console.error('[ProductionOrderService] getStaffSuggestions error:', error);
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
    const order = await ProductionOrder.findById(orderId);
    if (!order) throw new Error('Order not found.');

    if (order.status !== ORDER_STATUS.READY_TO_ASSIGN) {
      throw new Error(`Order must be in ${ORDER_STATUS.READY_TO_ASSIGN} status before assigning.`);
    }

    let totalAssigned = 0;
    const newAssignments = [];

    for (const assign of assignments) {
      const { staffId, assignedQuantity } = assign;
      
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

    if (totalAssigned > order.quantity) {
      throw new Error('Total assigned quantity exceeds order quantity.');
    }

    order.status = ORDER_STATUS.ASSIGNED;
    await order.save({ session });

    await session.commitTransaction();
    return {
      status: 'success',
      message: 'Assignments created successfully.',
      data: { assignments: newAssignments }
    };
  } catch (error) {
    await session.abortTransaction();
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
    console.error('[ProductionOrderService] reassignProductionOrder error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Update sub-order status and check if parent order is completed.
 */
export const updateAssignmentStatus = async (assignmentId, status, completedQuantity = 0) => {
  try {
    const assignment = await ProductionOrderAssignment.findById(assignmentId);
    if (!assignment) throw new Error('Assignment not found.');

    assignment.status = status;
    if (completedQuantity > 0) {
      assignment.completedQuantity = completedQuantity;
    }

    if (status === ORDER_STATUS.COMPLETED) {
      assignment.finishedAt = new Date();
      // Reduce staff workload upon completion
      await User.findByIdAndUpdate(assignment.staff, {
        $inc: { currentAssignedQuantity: -assignment.assignedQuantity }
      });
    }

    await assignment.save();

    // Check parent order completion
    const parentOrderId = assignment.productionOrder;
    const allAssignments = await ProductionOrderAssignment.find({ productionOrder: parentOrderId });
    
    const allCompleted = allAssignments.every(a => a.status === ORDER_STATUS.COMPLETED);
    
    if (allCompleted) {
      const completedOrder = await ProductionOrder.findByIdAndUpdate(parentOrderId, {
        status: ORDER_STATUS.COMPLETED,
        completedAt: new Date()
      }, { new: true }).lean();

      // Record product production into inventory
      if (completedOrder) {
        const product = await Product.findById(completedOrder.productId);
        if (product) {
          product.currentStock += completedOrder.quantity;
          product.totalProduced += completedOrder.quantity;
          await product.save();

          // Create an inventory transaction record
          await InventoryTransaction.create({
            product: product._id,
            quantity: completedOrder.quantity,
            type: TRANSACTION_TYPE.PRODUCTION_IN,
            notes: `Production order ${completedOrder.orderCode} completed.`,
            relatedOrder: completedOrder._id,
          });
        }
      }
    } else {
      // Check if any is in production
      const anyInProduction = allAssignments.some(a => 
        [ORDER_STATUS.IN_PRODUCTION, ORDER_STATUS.PARTIALLY_COMPLETE].includes(a.status)
      );
      if (anyInProduction) {
        await ProductionOrder.findByIdAndUpdate(parentOrderId, {
          status: ORDER_STATUS.IN_PRODUCTION
        });
      }
    }

    return {
      status: 'success',
      message: 'Assignment status updated.',
      data: { assignment, orderCompleted: allCompleted }
    };
  } catch (error) {
    console.error('[ProductionOrderService] updateAssignmentStatus error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};
