import ProductionOrder from '../models/ProductionOrder.js';
import Product from '../models/Product.js';
import Material from '../models/Material.js';
import MaterialAlert from '../models/MaterialAlert.js';
import Bom from '../models/BOM.js';
import User from '../models/User.js';
import ProductionOrderAssignment from '../models/ProductionOrderAssignment.js';
import MaterialRequisition from '../models/MaterialRequisition.js';
import InventoryImportExportSlip from '../models/InventoryImportExportSlip.js';
import { createNotification } from './notificationService.js';
import { ORDER_STATUS, ROLES, TRANSACTION_TYPE, REQUISITION_STATUS, INVENTORY_IMPORT_EXPORT_SLIP_TYPE, INVENTORY_IMPORT_EXPORT_SLIP_STATUS, PRIORITY } from '../utils/constants.js'; // Import TRANSACTION_TYPE
import { generateSlipNumber } from '../utils/slipHelper.js';
import mongoose from 'mongoose';


/**
 * Get all production orders with pagination and filters (Admin/Production Manager).
 */
export const getAllProductionOrders = async (queryParams) => {
  try {
    const { status, priority, search, page = 1, limit = 10 } = queryParams;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { orderCode: { $regex: search, $options: 'i' } },
        { 'products.productName': { $regex: search, $options: 'i' } },
        { 'products.productCode': { $regex: search, $options: 'i' } }
      ];
    }

    const [orders, total] = await Promise.all([
      ProductionOrder.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('products.product', 'name code unit baseCost')
        .populate('createdBy', 'fullName username')
        .lean(),
      ProductionOrder.countDocuments(filter)
    ]);

    return {
      status: 'success',
      message: 'Production orders retrieved successfully.',
      data: {
        orders,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    };
  } catch (error) {
    console.error('[ProductionOrderService] getAllProductionOrders error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};

/**
 * Get production orders assigned to a specific staff member.
 */
export const getStaffProductionOrders = async (staffId, queryParams) => {
  try {
    const { status, page = 1, limit = 10 } = queryParams;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // First find assignments for this staff
    const assignments = await ProductionOrderAssignment.find({ staff: staffId })
      .select('productionOrder')
      .lean();

    const orderIds = assignments.map(a => a.productionOrder);

    const filter = { _id: { $in: orderIds } };
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      ProductionOrder.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('products.product', 'name code unit')
        .lean(),
      ProductionOrder.countDocuments(filter)
    ]);

    return {
      status: 'success',
      message: 'Staff production orders retrieved successfully.',
      data: {
        orders,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    };
  } catch (error) {
    console.error('[ProductionOrderService] getStaffProductionOrders error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};

/**
 * Get a single production order by ID or orderCode with full details.
 */
export const getProductionOrderById = async (orderIdentifier) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(orderIdentifier);
    const order = isObjectId
      ? await ProductionOrder.findById(orderIdentifier)
        .populate('products.product')
        .populate('createdBy', 'fullName username')
        .lean()
      : await ProductionOrder.findOne({ orderCode: orderIdentifier })
        .populate('products.product')
        .populate('createdBy', 'fullName username')
        .lean();

    if (!order) throw new Error('Production order not found.');

    const orderId = order._id;

    // Also get assignments for this order
    const assignments = await ProductionOrderAssignment.find({ productionOrder: orderId })
      .populate('staff', 'fullName username currentAssignedQuantity')
      .lean();

    return {
      status: 'success',
      message: 'Production order details retrieved.',
      data: {
        ...order,
        assignments
      }
    };
  } catch (error) {
    console.error('[ProductionOrderService] getProductionOrderById error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};

/**
 * Create a new production order with stock check and automatic material requisition.
 * Supports multiple products and automatic material alert creation.
 */
export const createProductionOrder = async (orderData, creatorId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { products: orderProducts, priority = PRIORITY.MEDIUM, deadline, autoDeadline } = orderData;

    if (!orderProducts || !Array.isArray(orderProducts) || orderProducts.length === 0) {
      throw new Error('At least one product is required for production order.');
    }

    // 1. Fetch products and calculate total material needs
    const productIdentifiers = orderProducts.map(p => p.productId || p.productCode);
    const products = await Product.find({
      $or: [
        { _id: { $in: productIdentifiers.filter(id => mongoose.Types.ObjectId.isValid(id)) } },
        { code: { $in: productIdentifiers } }
      ]
    }).lean();

    const productMap = new Map();
    products.forEach(p => {
      productMap.set(p._id.toString(), p);
      productMap.set(p.code, p);
    });

    const validatedProducts = [];
    const materialRequirements = new Map(); // materialId -> totalNeeded
    let totalEstimatedTime = 0;

    for (const item of orderProducts) {
      const product = productMap.get(item.productId || item.productCode);
      if (!product) {
        throw new Error(`Product ${item.productId || item.productCode} not found.`);
      }

      validatedProducts.push({
        product: product._id,
        quantity: item.quantity,
        productName: product.name,
        productCode: product.code
      });

      totalEstimatedTime += (product.estimatedProductionTime || 0) * item.quantity;

      // Aggregate materials
      for (const matCost of product.estimateMaterialCost) {
        const matId = matCost.material.toString();
        const needed = matCost.quantity * item.quantity;
        materialRequirements.set(matId, (materialRequirements.get(matId) || 0) + needed);
      }
    }

    // 2. Check stock availability
    const materialIds = Array.from(materialRequirements.keys());
    const materials = await Material.find({ _id: { $in: materialIds } }).session(session);
    const materialMap = new Map(materials.map(m => [m._id.toString(), m]));

    const shortages = [];
    let hasInsufficientStock = false;

    for (const [matId, neededQuantity] of materialRequirements.entries()) {
      const material = materialMap.get(matId);
      if (!material) {
        throw new Error(`Material ${matId} not found in inventory.`);
      }

      if (material.currentStock < neededQuantity) {
        hasInsufficientStock = true;
        shortages.push({
          material: material._id,
          materialCode: material.code,
          materialName: material.name,
          neededQuantity,
          availableQuantity: material.currentStock,
          shortageQuantity: neededQuantity - material.currentStock
        });
      }
    }

    // 3. Generate order code
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await ProductionOrder.countDocuments({
      createdAt: { $gte: today }
    }).session(session);

    const orderCode = `CF-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

    // 4. Create Production Order
    const newOrder = new ProductionOrder({
      orderCode,
      products: validatedProducts,
      priority,
      deadline,
      autoDeadline,
      estimatedCompletionTime: totalEstimatedTime,
      createdBy: creatorId,
      status: hasInsufficientStock ? ORDER_STATUS.INSUFFICIENT_MATERIALS : ORDER_STATUS.READY_TO_ASSIGN
    });

    await newOrder.save({ session });

    // 5. Create BOM snapshot for this production order
    const bomItems = Array.from(materialRequirements.entries()).map(([matId, needed]) => {
      const material = materialMap.get(matId);
      return {
        material: matId,
        qtyPerUnit: needed, // Total quantity needed for this order
        unit: material.unit,
        note: `Snapshot for order ${orderCode}`
      };
    });

    const newBom = new Bom({
      productionOrder: newOrder._id,
      items: bomItems,
      version: 'v1.0-order',
      isActive: true
    });

    await newBom.save({ session });

    // 6. Create Material Alerts if stock is insufficient
    if (hasInsufficientStock) {
      const alertPromises = shortages.map(shortage => {
        const newAlert = new MaterialAlert({
          ...shortage,
          productionOrder: newOrder._id,
          status: 'pending'
        });
        return newAlert.save({ session });
      });
      await Promise.all(alertPromises);
    }

    // 7. Automatically create Material Requisition
    const reqCount = await MaterialRequisition.countDocuments({
      createdAt: { $gte: today }
    }).session(session);
    const requisitionCode = `REQ-${dateStr}-${(reqCount + 1).toString().padStart(3, '0')}`;

    const newRequisition = new MaterialRequisition({
      requisitionCode,
      productionOrder: newOrder._id,
      createdBy: creatorId,
      items: Array.from(materialRequirements.entries()).map(([matId, needed]) => {
        const material = materialMap.get(matId);
        const available = material ? material.currentStock : 0;
        return {
          material: matId,
          requestedQuantity: needed,
          actualQuantity: Math.min(needed, available)
        };
      }),
      status: REQUISITION_STATUS.PENDING
    });

    await newRequisition.save({ session });

    // 8. Create Notification for Production Managers and Admins
    // We notify relevant staff that a new order has been created
    const notificationMessage = hasInsufficientStock
      ? `Đơn hàng ${orderCode} đã được tạo nhưng đang thiếu vật tư.`
      : `Đơn hàng ${orderCode} đã được tạo và sẵn sàng giao việc.`;

    // In a real scenario, you would fetch all users with PM role. 
    // For now, we notify the creator and log the notification intent.
    await createNotification({
      recipient: creatorId,
      title: 'Đơn sản xuất mới',
      message: notificationMessage,
      type: 'ORDER',
      priority: hasInsufficientStock ? 'HIGH' : 'MEDIUM',
      metaData: { orderId: newOrder._id, orderCode }
    });

    await session.commitTransaction();
    console.log(`[Production] Order ${orderCode} created successfully with ${validatedProducts.length} products.`);

    return {
      status: 'success',
      message: hasInsufficientStock
        ? `Production order created with ${shortages.length} material shortages. Material alerts generated.`
        : 'Production order created and ready to assign.',
      data: { order: newOrder, requisition: newRequisition, shortages }
    };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error('[ProductionOrderService] createProductionOrder error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Re-check stock and update order status to ready_to_assign if materials are enough.
 * Handles multiple products.
 */
export const checkOrderMaterials = async (orderId) => {
  try {
    const order = await ProductionOrder.findById(orderId).populate('products.product');
    if (!order) throw new Error('Order not found.');

    if (order.status !== ORDER_STATUS.INSUFFICIENT_MATERIALS) {
      return { status: 'error', message: 'Order is not in insufficient materials status.', data: null };
    }

    const materialRequirements = new Map();
    for (const item of order.products) {
      const product = item.product;
      for (const matCost of product.estimateMaterialCost) {
        const matId = matCost.material.toString();
        const needed = matCost.quantity * item.quantity;
        materialRequirements.set(matId, (materialRequirements.get(matId) || 0) + needed);
      }
    }

    const shortages = [];
    for (const [matId, neededQuantity] of materialRequirements.entries()) {
      const material = await Material.findById(matId).lean();
      if (!material) throw new Error(`Material ${matId} not found.`);

      if (material.currentStock < neededQuantity) {
        shortages.push({
          material: material.name,
          needed: neededQuantity,
          available: material.currentStock
        });
      }
    }

    if (shortages.length > 0) {
      return {
        status: 'error',
        message: `Still insufficient stock for ${shortages.length} materials.`,
        data: { shortages }
      };
    }

    order.status = ORDER_STATUS.READY_TO_ASSIGN;
    await order.save();

    // Mark alerts as resolved if they exist
    await MaterialAlert.updateMany(
      { productionOrder: orderId, status: 'pending' },
      { status: 'resolved' }
    );

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
 * Automatically check and update all INSUFFICIENT_MATERIALS orders.
 * Triggered when inventory is replenished.
 */
export const autoUpdateInsufficientOrders = async (materialIds = [], session = null) => {
  try {
    const query = { status: ORDER_STATUS.INSUFFICIENT_MATERIALS };

    // If specific materialIds are provided, only check orders that use those materials
    if (materialIds.length > 0) {
      // We need to find orders whose BOM contains these materials
      // For simplicity, we can fetch all INSUFFICIENT orders and check, 
      // but for better performance we can query by BOM if needed.
      // Here we'll use a more targeted query if materialIds are provided.
      const boms = await Bom.find({
        'items.material': { $in: materialIds },
        isActive: true
      }).select('productionOrder').lean();

      const orderIdsFromBoms = boms.map(b => b.productionOrder);
      query._id = { $in: orderIdsFromBoms };
    }

    const orders = await ProductionOrder.find(query)
      .populate('products.product')
      .session(session);

    if (orders.length === 0) return { status: 'success', updatedCount: 0 };

    let updatedCount = 0;
    for (const order of orders) {
      // Recalculate requirements
      const materialRequirements = new Map();
      for (const item of order.products) {
        const product = item.product;
        if (!product || !product.estimateMaterialCost) continue;

        for (const matCost of product.estimateMaterialCost) {
          const matId = matCost.material.toString();
          const needed = matCost.quantity * item.quantity;
          materialRequirements.set(matId, (materialRequirements.get(matId) || 0) + needed);
        }
      }

      // Check stock
      let isEnough = true;
      for (const [matId, neededQuantity] of materialRequirements.entries()) {
        const material = await Material.findById(matId).session(session).lean();
        if (!material || material.currentStock < neededQuantity) {
          isEnough = false;
          break;
        }
      }

      if (isEnough) {
        order.status = ORDER_STATUS.READY_TO_ASSIGN;
        await order.save({ session });

        // Resolve alerts
        await MaterialAlert.updateMany(
          { productionOrder: order._id, status: 'pending' },
          { status: 'resolved' },
          { session }
        );

        updatedCount++;
        console.log(`[Production] Order ${order.orderCode} auto-transitioned to READY_TO_ASSIGN`);
      }
    }

    return { status: 'success', updatedCount };
  } catch (error) {
    console.error('[ProductionOrderService] autoUpdateInsufficientOrders error:', error);
    return { status: 'error', message: error.message };
  }
};

/**
 * Assign sub-orders (tasks) to staff by product and quantity.
 * Supports splitting a single order product into multiple staff assignments.
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

    const productMap = new Map(order.products.map(p => [p.product.toString(), p.quantity]));
    const newAssignments = [];

    // Fetch existing assignments for this order to check total quantity per product
    const existingAssignments = await ProductionOrderAssignment.find({ productionOrder: orderId }).session(session);

    // Group existing assignments by product
    const assignedPerProduct = new Map();
    existingAssignments.forEach(a => {
      const productId = a.product.toString();
      assignedPerProduct.set(productId, (assignedPerProduct.get(productId) || 0) + a.assignedQuantity);
    });

    for (const assign of assignments) {
      const { staffId, productId, assignedQuantity } = assign;

      if (!staffMap.has(staffId)) {
        throw new Error(`Staff member with ID ${staffId} not found.`);
      }

      if (!productMap.has(productId)) {
        throw new Error(`Product ${productId} is not part of production order ${order.orderCode}.`);
      }

      const totalProductQty = productMap.get(productId);
      const currentlyAssignedQty = assignedPerProduct.get(productId) || 0;

      if (currentlyAssignedQty + assignedQuantity > totalProductQty) {
        throw new Error(`Total assigned quantity (${currentlyAssignedQty + assignedQuantity}) for product ${productId} exceeds order quantity (${totalProductQty}).`);
      }

      const newAssign = new ProductionOrderAssignment({
        productionOrder: orderId,
        product: productId,
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

      // Update our local tracking map
      assignedPerProduct.set(productId, currentlyAssignedQty + assignedQuantity);
    }

    order.status = ORDER_STATUS.ASSIGNED;
    await order.save({ session });

    await session.commitTransaction();

    // Log final results for debugging
    const summary = Array.from(assignedPerProduct.entries()).map(([pId, qty]) => `${pId}: ${qty}/${productMap.get(pId)}`);
    console.log(`[Production] Order ${orderId} assigned. Summary: ${summary.join(', ')}`);

    return {
      status: 'success',
      message: 'Assignments created successfully.',
      data: { assignments: newAssignments }
    };
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error('[ProductionOrderService] assignProductionOrder error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Update the overall production order status.
 * Only accessible by Production Manager or Admin.
 */
export const updateProductionOrderStatus = async (orderId, status, notes = '') => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await ProductionOrder.findById(orderId).session(session);
    if (!order) throw new Error('Production order not found.');

    const oldStatus = order.status;
    order.status = status;
    if (notes) order.holdReason = notes; // Using holdReason as a general note field for status changes

    if (status === ORDER_STATUS.COMPLETED && oldStatus !== ORDER_STATUS.COMPLETED) {
      order.completedAt = new Date();
    }

    await order.save({ session });
    await session.commitTransaction();

    return {
      status: 'success',
      message: `Production order status updated to ${status}.`,
      data: { order }
    };
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error('[ProductionOrderService] updateProductionOrderStatus error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Reassign sub-orders to staff.
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
 * Update sub-order (assignment) status and progress.
 * Staff can report their progress, while the system auto-transitions the parent order status.
 */
export const updateAssignmentStatus = async (assignmentId, status, completedQuantity = 0, actorId = null, actorRole = null) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const assignment = await ProductionOrderAssignment.findById(assignmentId).session(session);
    if (!assignment) throw new Error('Assignment not found.');

    const orderId = assignment.productionOrder;
    const order = await ProductionOrder.findById(orderId).session(session);
    if (!order) throw new Error('Parent production order not found.');

    // 1. Validation & Permissions
    const isStaff = actorRole === ROLES.STAFF;

    // If actor is staff, they can only update their own assignment
    if (isStaff && assignment.staff.toString() !== actorId.toString()) {
      throw new Error('You are not authorized to update this assignment.');
    }

    const oldStatus = assignment.status;
    const oldCompletedQty = assignment.completedQuantity;

    // 2. Update Assignment Fields
    assignment.status = status;

    if (completedQuantity !== undefined) {
      if (completedQuantity > assignment.assignedQuantity) {
        throw new Error(`Completed quantity (${completedQuantity}) cannot exceed assigned quantity (${assignment.assignedQuantity}).`);
      }
      assignment.completedQuantity = completedQuantity;
    }

    // Set timestamps based on status
    if (status === ORDER_STATUS.IN_PRODUCTION && !assignment.startedAt) {
      assignment.startedAt = new Date();
    }
    if (status === ORDER_STATUS.COMPLETED) {
      assignment.finishedAt = new Date();
      assignment.completedQuantity = assignment.assignedQuantity; // Auto-complete if marked as COMPLETED
    }

    // 3. Update Staff Workload if status changes to COMPLETED
    if (status === ORDER_STATUS.COMPLETED && oldStatus !== ORDER_STATUS.COMPLETED) {
      await User.findByIdAndUpdate(assignment.staff, {
        $inc: { currentAssignedQuantity: -assignment.assignedQuantity }
      }, { session });
    } else if (oldStatus === ORDER_STATUS.COMPLETED && status !== ORDER_STATUS.COMPLETED) {
      // If moving back from COMPLETED (e.g. by PM)
      await User.findByIdAndUpdate(assignment.staff, {
        $inc: { currentAssignedQuantity: assignment.assignedQuantity }
      }, { session });
    }

    // Milestone Reporting Logic (50%, 75%, 100%)
    const progressPercent = (assignment.completedQuantity / assignment.assignedQuantity) * 100;
    const milestones = [50, 75, 100];
    for (const milestone of milestones) {
      if (progressPercent >= milestone && !assignment.reportedMilestones.includes(milestone)) {
        assignment.reportedMilestones.push(milestone);
        assignment.lastReportedAt = new Date();
      }
    }

    await assignment.save({ session });

    // 4. Auto-transition Parent Order Status
    const allAssignments = await ProductionOrderAssignment.find({ productionOrder: orderId }).session(session);

    const allCompleted = allAssignments.every(a => a.status === ORDER_STATUS.COMPLETED);
    const anyInProduction = allAssignments.some(a => a.status === ORDER_STATUS.IN_PRODUCTION);
    const anyCompleted = allAssignments.some(a => a.status === ORDER_STATUS.COMPLETED);

    let newOrderStatus = order.status;

    if (allCompleted) {
      newOrderStatus = ORDER_STATUS.COMPLETED;
      order.completedAt = new Date();
    } else if (anyInProduction || anyCompleted) {
      newOrderStatus = anyCompleted ? ORDER_STATUS.PARTIALLY_COMPLETE : ORDER_STATUS.IN_PRODUCTION;
    }

    if (newOrderStatus !== order.status) {
      order.status = newOrderStatus;
      await order.save({ session });
      console.log(`[Production] Order ${order.orderCode} auto-transitioned to ${newOrderStatus}`);
    }

    await session.commitTransaction();

    return {
      status: 'success',
      message: 'Assignment updated successfully.',
      data: { assignment, orderStatus: order.status }
    };
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error('[ProductionOrderService] updateAssignmentStatus error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Production Manager creates an internal stock-in receipt for a completed order.
 */
export const createStockInSlip = async (orderIdentifier, managerId, slipData = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(orderIdentifier);
    const order = isObjectId
      ? await ProductionOrder.findById(orderIdentifier).populate('products.product').session(session)
      : await ProductionOrder.findOne({ orderCode: orderIdentifier }).populate('products.product').session(session);

    if (!order) {
      console.error('Production order not found:', orderIdentifier);
      return {
        success: false,
        message: 'Production order not found.',
        data: null
      };
    }

    const orderId = order._id;

    if (order.status !== ORDER_STATUS.COMPLETED) {
      console.error('Production order not completed:', order);
      return {
        success: false,
        message: 'Production order must be completed before creating stock-in slip.',
        data: null
      };
    }

    // Check if a slip already exists for this order
    const existingSlip = await InventoryImportExportSlip.findOne({ relatedProductionOrder: orderId }).session(session);
    if (existingSlip) {
      console.error('A stock-in slip already exists for this production order:', existingSlip);
      return {
        success: false,
        message: 'A stock-in slip already exists for this production order.',
        data: null
      };
    }

    const slipNumber = await generateSlipNumber(INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT);

    const slipItems = order.products.map(pItem => {
      const quantity = pItem.quantity;
      const unitPrice = pItem.product.baseCost || 0;

      return {
        product: pItem.product._id,
        itemName: pItem.product.name,
        itemCode: pItem.product.code,
        unit: pItem.product.unit || 'cái',
        quantity: {
          requested: quantity,
          actual: 0 // Default actual to 0 until warehouse manager confirms
        },
        unitPrice: unitPrice,
        amount: 0 // Amount is 0 because actual quantity is 0
      };
    });

    const totalAmount = 0; // Total amount is 0 initially

    const newSlip = new InventoryImportExportSlip({
      type: INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT,
      slipNumber,
      relatedProductionOrder: orderId,
      reason: `Nhập kho thành phẩm từ lệnh sản xuất ${order.orderCode}`,
      items: slipItems,
      totalAmount,
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
      success: true,
      message: 'Internal stock-in slip created. Waiting for Warehouse Manager approval.',
      data: { slip: newSlip }
    };
  } catch (error) {
    await session.abortTransaction();
    console.log('[ProductionOrderService] createStockInSlip error:', error);
    return { success: false, message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Get BOM for a specific production order by ID or orderCode.
 */
export const getBomByOrderId = async (orderIdentifier) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(orderIdentifier);
    const order = isObjectId
      ? await ProductionOrder.findById(orderIdentifier).lean()
      : await ProductionOrder.findOne({ orderCode: orderIdentifier }).lean();

    if (!order) {
      return {
        success: false,
        message: 'Production order not found.',
        data: null
      };
    }

    const orderId = order._id;

    const bom = await Bom.findOne({ productionOrder: orderId })
      .populate('items.material', 'name code unit price')
      .lean();

    if (!bom) {
      console.error('BOM not found for this production order:', orderId);
      return {
        success: false,
        message: 'BOM not found for this production order.',
        data: null
      };
    }

    return {
      success: true,
      message: 'BOM retrieved successfully.',
      data: bom
    };
  } catch (error) {
    console.log('[ProductionOrderService] getBomByOrderId error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};
