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
import { ORDER_STATUS, ROLES, TRANSACTION_TYPE, REQUISITION_STATUS, REQUISITION_TYPE, INVENTORY_IMPORT_EXPORT_SLIP_TYPE, INVENTORY_IMPORT_EXPORT_SLIP_STATUS, PRIORITY } from '../utils/constants.js'; // Import TRANSACTION_TYPE
import { generateSlipNumber } from '../utils/slipHelper.js';
import mongoose from 'mongoose';
import { emitToRoles } from '../config/socket.js';
import { emitDataChanged, notifyUsersByRole } from './realtimeService.js';
import { applyCreatedAtCursor, buildListPagination, normalizePagination } from '../utils/pagination.js';


/**
 * Get all production orders with pagination and filters (Admin/Production Manager).
 */
export const getAllProductionOrders = async (queryParams) => {
  // Auto-heal old assignment records that have progress but are missing lastReportedAt
  try {
    await ProductionOrderAssignment.updateMany(
      { completedQuantity: { $gt: 0 }, lastReportedAt: null },
      { $set: { lastReportedAt: new Date() } }
    );
  } catch (err) {
    console.error("Auto-heal failed:", err);
  }
  try {
    const { status, priority, search, page = 1, limit = 10, cursor, withTotal = true } = queryParams;
    const { pageNum, limitNum, skip, cursor: cursorId, withTotal: shouldCount } = normalizePagination({ page, limit, cursor, withTotal });

    let filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$text = { $search: String(search).trim() };
    }
    filter = applyCreatedAtCursor(filter, cursorId);

    const totalPromise = shouldCount ? ProductionOrder.countDocuments(filter) : Promise.resolve(undefined);
    const [orders, total] = await Promise.all([
      ProductionOrder.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('products.product', 'name code unit baseCost')
        .populate('createdBy', 'fullName username')
        .lean(),
      totalPromise
    ]);

    // Fetch assignments for these orders
    const orderIds = orders.map(o => o._id);
    const assignments = await ProductionOrderAssignment.find({ productionOrder: { $in: orderIds } })
      .populate('staff', 'fullName username currentAssignedQuantity')
      .populate('product', 'name code unit')
      .lean();

    // Map assignments to their respective orders
    const ordersWithAssignments = orders.map(order => ({
      ...order,
      assignments: assignments.filter(a => a.productionOrder.toString() === order._id.toString())
    }));

    return {
      success: true,
      message: 'Production orders retrieved successfully.',
      data: {
        orders: ordersWithAssignments,
        pagination: buildListPagination({ items: orders, total, pageNum, limitNum, cursor: cursorId, withTotal: shouldCount })
      }
    };
  } catch (error) {
    console.error('[ProductionOrderService] getAllProductionOrders error:', error);
    return { success: false, message: error.message, data: null };
  }
};

/**
 * Get production orders assigned to a specific staff member.
 */
export const getStaffProductionOrders = async (staffId, queryParams) => {
  try {
    const { status, page = 1, limit = 10, cursor, withTotal = true } = queryParams;
    const { pageNum, limitNum, skip, cursor: cursorId, withTotal: shouldCount } = normalizePagination({ page, limit, cursor, withTotal });

    // First find assignments for this staff
    const assignments = await ProductionOrderAssignment.find({ staff: staffId })
      .select('productionOrder')
      .lean();

    const orderIds = assignments.map(a => a.productionOrder);

    let filter = { _id: { $in: orderIds } };
    if (status) filter.status = status;
    filter = applyCreatedAtCursor(filter, cursorId);

    const totalPromise = shouldCount ? ProductionOrder.countDocuments(filter) : Promise.resolve(undefined);
    const [orders, total] = await Promise.all([
      ProductionOrder.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('products.product', 'name code unit')
        .lean(),
      totalPromise
    ]);

    // Fetch assignments for these orders for THIS staff member
    const orderIdsRetrieved = orders.map(o => o._id);
    const orderAssignments = await ProductionOrderAssignment.find({
      productionOrder: { $in: orderIdsRetrieved },
      staff: staffId
    })
      .populate('staff', 'fullName username currentAssignedQuantity')
      .populate('product', 'name code unit')
      .lean();

    // Map assignments to their respective orders
    const ordersWithAssignments = orders.map(order => ({
      ...order,
      assignments: orderAssignments.filter(a => a.productionOrder.toString() === order._id.toString())
    }));

    return {
      success: true,
      message: 'Staff production orders retrieved successfully.',
      data: {
        orders: ordersWithAssignments,
        pagination: buildListPagination({ items: orders, total, pageNum, limitNum, cursor: cursorId, withTotal: shouldCount })
      }
    };
  } catch (error) {
    console.error('[ProductionOrderService] getStaffProductionOrders error:', error);
    return { success: false, message: error.message, data: null };
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

    if (!order) return { success: false, message: 'Production order not found.', data: null };

    const orderId = order._id;

    // Also get assignments for this order
    const assignments = await ProductionOrderAssignment.find({ productionOrder: orderId })
      .populate('staff', 'fullName username currentAssignedQuantity')
      .populate('product', 'name code unit')
      .lean();

    return {
      success: true,
      message: 'Production order details retrieved.',
      data: {
        ...order,
        assignments
      }
    };
  } catch (error) {
    console.error('[ProductionOrderService] getProductionOrderById error:', error);
    return { success: false, message: error.message, data: null };
  }
};

export const getStaffProductionOrderById = async (orderIdentifier, staffId) => {
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

    if (!order) return { success: false, message: 'Production order not found.', data: null };

    const assignments = await ProductionOrderAssignment.find({
      productionOrder: order._id,
      staff: staffId
    })
      .populate('staff', 'fullName username currentAssignedQuantity')
      .populate('product', 'name code unit')
      .lean();

    if (!assignments.length) {
      return { success: false, message: 'You are not assigned to this production order.', data: null };
    }

    return {
      success: true,
      message: 'Production order details retrieved.',
      data: {
        ...order,
        assignments
      }
    };
  } catch (error) {
    console.error('[ProductionOrderService] getStaffProductionOrderById error:', error);
    return { success: false, message: error.message, data: null };
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

    // Notify Production Managers and Admins real-time
    emitToRoles([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER], 'production_order_created', {
      orderId: newOrder._id,
      orderCode,
      message: notificationMessage
    });

    await session.commitTransaction();
    console.log(`[Production] Order ${orderCode} created successfully with ${validatedProducts.length} products.`);

    await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER], {
      domains: ["production", "requisitions", "materials", "inventory", "alerts"],
      action: "created",
      entity: "production_order",
      id: newOrder._id,
      message: notificationMessage,
      metaData: { orderId: newOrder._id, orderCode, hasInsufficientStock }
    });

    if (hasInsufficientStock) {
      await notifyUsersByRole({
        roles: [ROLES.ADMIN, ROLES.PRODUCTION_MANAGER],
        excludeUserId: creatorId,
        title: 'Canh bao thieu vat tu',
        message: notificationMessage,
        type: 'ORDER',
        priority: 'HIGH',
        metaData: { orderId: newOrder._id, orderCode, shortages }
      });

      await emitToRoles([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER], 'material_shortage_created', {
        orderId: newOrder._id,
        orderCode,
        shortages,
        message: notificationMessage
      });
    }

    return {
      success: true,
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

    await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER], {
      domains: ["production", "alerts", "materials", "inventory"],
      action: "materials_resolved",
      entity: "production_order",
      id: order._id,
      message: `Materials are now sufficient for order ${order.orderCode}.`,
      metaData: { orderId: order._id, orderCode: order.orderCode, status: order.status }
    });

    return {
      success: true,
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
      success: true,
      message: 'Staff suggestions retrieved.',
      data: { suggestions }
    };
  } catch (error) {
    console.log('[ProductionOrderService] getStaffSuggestions error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};

/**
 * Suggest an assignment distribution for a production order based on staff workload.
 * Scales the number of assigned staff based on order quantity to prevent overload.
 */
export const suggestOrderAssignments = async (orderId) => {
  try {
    const order = await ProductionOrder.findById(orderId).populate('products.product').lean();
    if (!order) throw new Error('Order not found.');

    const staffResult = await getStaffSuggestions();
    const staffList = staffResult.data.suggestions; // Already sorted by currentAssignedQuantity ASC

    if (staffList.length === 0) throw new Error('No staff members available for assignment.');

    const suggestedAssignments = [];

    for (const p of order.products) {
      const quantity = p.quantity;
      const productId = p.product?._id || p.product;

      // 1. Determine how many staff we need based on quantity
      // Logic: 1 person for every ~200 items, but at least 1 and at most all available staff.
      // For very large orders (e.g. 100k), it will naturally use all staff.
      const IDEAL_QTY_PER_PERSON = 200;
      let targetStaffCount = Math.min(staffList.length, Math.max(1, Math.ceil(quantity / IDEAL_QTY_PER_PERSON)));

      // If it's a "large" order for the current workforce, ensure we use at least 50% of staff if available
      if (quantity > 1000 && staffList.length > 5) {
        targetStaffCount = Math.max(targetStaffCount, Math.floor(staffList.length * 0.5));
      }

      const selectedStaff = staffList.slice(0, targetStaffCount);

      // 2. Distribute quantity among selected staff
      // We want to give slightly more to those with 0 workload, but keep it balanced.
      let remainingQty = quantity;

      // Calculate weights based on "free capacity"
      // Since we don't have a fixed max capacity, we use a relative score:
      // Score = 1 / (1 + currentWorkload)
      const scores = selectedStaff.map(s => 1 / (1 + (s.currentAssignedQuantity || 0)));
      const totalScore = scores.reduce((a, b) => a + b, 0);

      for (let i = 0; i < selectedStaff.length; i++) {
        let share = 0;
        if (i === selectedStaff.length - 1) {
          // Last person gets the remainder to avoid rounding issues
          share = remainingQty;
        } else {
          // Proportionate share based on score
          share = Math.floor(quantity * (scores[i] / totalScore));

          // Ensure we don't assign 0 if there's quantity left, unless it's really tiny
          if (share === 0 && remainingQty > 0) share = 1;
        }

        if (share > 0) {
          suggestedAssignments.push({
            staffId: selectedStaff[i]._id,
            productId,
            assignedQuantity: share
          });
          remainingQty -= share;
        }
      }
    }

    return {
      success: true,
      message: 'Assignment suggestions generated with dynamic scaling.',
      data: { suggestions: suggestedAssignments }
    };
  } catch (error) {
    console.log('[ProductionOrderService] suggestOrderAssignments error:', error);
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

    if (orders.length === 0) return { success: true, updatedCount: 0 };

    let updatedCount = 0;
    const updatedOrders = [];
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

      // 1. Resolve individual MaterialAlerts that are now sufficient
      const alertsToCheck = await MaterialAlert.find({
        productionOrder: order._id,
        status: { $in: ['pending', 'ordered'] }
      }).session(session);

      for (const alert of alertsToCheck) {
        const material = await Material.findById(alert.material).session(session).lean();
        if (material && material.currentStock >= alert.neededQuantity) {
          alert.status = 'resolved';
          await alert.save({ session });
          console.log(`[Production] MaterialAlert ${alert._id} for material ${alert.materialCode} resolved.`);
        }
      }

      // 2. Check if the ENTIRE order is now enough to transition status
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

        // Double check all alerts for this order are resolved
        await MaterialAlert.updateMany(
          { productionOrder: order._id, status: { $in: ['pending', 'ordered'] } },
          { status: 'resolved' },
          { session }
        );

        updatedCount++;
        updatedOrders.push({ orderId: order._id, orderCode: order.orderCode });
        console.log(`[Production] Order ${order.orderCode} auto-transitioned to READY_TO_ASSIGN`);
      }
    }

    if (updatedOrders.length > 0 && !session) {
      await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER], {
        domains: ["production", "alerts", "materials", "inventory"],
        action: "materials_resolved",
        entity: "production_order",
        message: `${updatedOrders.length} production order(s) are ready to assign.`,
        metaData: { orders: updatedOrders }
      });
    }

    return { success: true, updatedCount };
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
    if (!order) return { status: 'error', message: 'Order not found.' };

    if (order.status !== ORDER_STATUS.READY_TO_ASSIGN && order.status !== ORDER_STATUS.ASSIGNED) {
      return { status: 'error', message: `Order must be in ${ORDER_STATUS.READY_TO_ASSIGN} or ${ORDER_STATUS.ASSIGNED} status before assigning.` };
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
        return { status: 'error', message: `Staff member with ID ${staffId} not found.` };
      }

      if (!productMap.has(productId)) {
        return { status: 'error', message: `Product ${productId} is not part of production order ${order.orderCode}.` };
      }

      const totalProductQty = productMap.get(productId);
      const currentlyAssignedQty = assignedPerProduct.get(productId) || 0;

      if (currentlyAssignedQty + assignedQuantity > totalProductQty) {
        return { status: 'error', message: `Total assigned quantity (${currentlyAssignedQty + assignedQuantity}) for product ${productId} exceeds order quantity (${totalProductQty}).` };
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

    // Notify staff about new assignments
    for (const assign of newAssignments) {
      await createNotification({
        recipient: assign.staff,
        title: 'Nhiệm vụ sản xuất mới',
        message: `Bạn được phân công nhiệm vụ mới cho đơn hàng ${order.orderCode}.`,
        type: 'TASK',
        priority: 'MEDIUM',
        metaData: { assignmentId: assign._id, orderId: order._id }
      });
    }

    await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.STAFF], {
      domains: ["production"],
      action: "assigned",
      entity: "production_order",
      id: order._id,
      message: `Order ${order.orderCode} was assigned to staff.`,
      metaData: { orderId: order._id, orderCode: order.orderCode, assignmentIds: newAssignments.map(a => a._id) }
    });

    // Log final results for debugging
    const summary = Array.from(assignedPerProduct.entries()).map(([pId, qty]) => `${pId}: ${qty}/${productMap.get(pId)}`);
    console.log(`[Production] Order ${orderId} assigned. Summary: ${summary.join(', ')}`);

    return {
      success: true,
      message: 'Phân công nhân sự thành công.',
      data: { assignments: newAssignments }
    };
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error('[ProductionOrderService] assignProductionOrder error:', error);
    return { success: false, message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Update the overall production order status.
 * Only accessible by Production Manager or Admin.
 */
const createOrGetFinishedGoodsStockInSlip = async ({
  order,
  actorId,
  session,
  notes = '',
  personInOut = 'Bo phan san xuat'
}) => {
  const existingSlip = await InventoryImportExportSlip.findOne({
    type: INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT,
    relatedProductionOrder: order._id,
    'items.product': { $exists: true }
  }).session(session);

  if (existingSlip) return { slip: existingSlip, created: false };

  const productIds = order.products
    .map((item) => item.product?._id || item.product)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  const products = await Product.find({ _id: { $in: productIds } })
    .select('name code unit baseCost')
    .session(session)
    .lean();
  const productMap = new Map(products.map((item) => [item._id.toString(), item]));

  const slipNumber = await generateSlipNumber(INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT);
  const slipItems = order.products.map((item) => {
    const productId = (item.product?._id || item.product)?.toString();
    const productInfo = productMap.get(productId) || {};
    return {
      product: productId,
      itemName: item.productName || productInfo.name || 'Finished Product',
      itemCode: item.productCode || productInfo.code || `P-${productId?.slice(-6) || 'NA'}`,
      unit: productInfo.unit || 'cai',
      quantity: {
        requested: item.quantity,
        actual: 0
      },
      unitPrice: productInfo.baseCost || 0,
      amount: 0
    };
  });

  try {
    const [newSlip] = await InventoryImportExportSlip.create([{
      slipNumber,
      type: INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT,
      status: INVENTORY_IMPORT_EXPORT_SLIP_STATUS.PENDING,
      relatedProductionOrder: order._id,
      reason: `Nhap kho thanh pham cho don hang ${order.orderCode}`,
      items: slipItems,
      totalAmount: 0,
      signatures: {
        creator: actorId,
        personInOut
      },
      notes: notes?.trim() || `Tu dong tao khi hoan thanh don ${order.orderCode}`
    }], { session });

    return { slip: newSlip, created: true };
  } catch (error) {
    if (error?.code === 11000) {
      const duplicatedSlip = await InventoryImportExportSlip.findOne({
        type: INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT,
        relatedProductionOrder: order._id,
        'items.product': { $exists: true }
      }).session(session);
      if (duplicatedSlip) return { slip: duplicatedSlip, created: false };
    }
    throw error;
  }
};

export const updateProductionOrderStatus = async (orderId, status, notes = '') => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await ProductionOrder.findById(orderId).session(session);
    if (!order) return { success: false, message: 'Production order not found.', data: null };

    const oldStatus = order.status;
    let stockInResult = null;
    order.status = status;
    if (notes) order.holdReason = notes; // Using holdReason as a general note field for status changes

    if (status === ORDER_STATUS.COMPLETED && oldStatus !== ORDER_STATUS.COMPLETED) {
      order.completedAt = new Date();
      stockInResult = await createOrGetFinishedGoodsStockInSlip({
        order,
        actorId: order.createdBy,
        session,
        notes
      });
    }

    await order.save({ session });
    await session.commitTransaction();

    // Notify about status change
    await createNotification({
      recipient: order.createdBy,
      title: 'Cập nhật đơn sản xuất',
      message: `Đơn hàng ${order.orderCode} đã chuyển sang trạng thái: ${status}.`,
      type: 'ORDER',
      priority: 'MEDIUM',
      metaData: { orderId: order._id, status }
    });

    await emitToRoles([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.STAFF], 'production_order_status_updated', {
      orderId: order._id,
      orderCode: order.orderCode,
      status,
      message: `Production order ${order.orderCode} changed to ${status}.`
    });

    await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.STAFF], {
      domains: ["production"],
      action: "status_updated",
      entity: "production_order",
      id: order._id,
      message: `Production order ${order.orderCode} changed to ${status}.`,
      metaData: { orderId: order._id, orderCode: order.orderCode, status }
    });

    if (stockInResult?.slip && stockInResult.created) {
      await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER], {
        domains: ["production", "slips", "inventory", "products"],
        action: "stock_in_slip_created",
        entity: "inventory_slip",
        id: stockInResult.slip._id,
        message: `Stock-in slip ${stockInResult.slip.slipNumber} was created for order ${order.orderCode}.`,
        metaData: {
          slipId: stockInResult.slip._id,
          slipNumber: stockInResult.slip.slipNumber,
          orderId: order._id,
          orderCode: order.orderCode
        }
      });

      await notifyUsersByRole({
        roles: [ROLES.KHO_MANAGER],
        excludeUserId: order.createdBy,
        title: 'Co phieu nhap thanh pham moi',
        message: `Phieu nhap ${stockInResult.slip.slipNumber} cho don ${order.orderCode} dang cho xu ly.`,
        type: 'INVENTORY',
        priority: 'HIGH',
        metaData: {
          slipId: stockInResult.slip._id,
          slipNumber: stockInResult.slip.slipNumber,
          orderId: order._id
        }
      });
    }

    return {
      success: true,
      message: stockInResult?.slip
        ? `Da cap nhat trang thai don hang sang ${status} va ${stockInResult.created ? 'tao' : 'xac nhan'} phieu nhap kho thanh pham ${stockInResult.slip.slipNumber}.`
        : `Da cap nhat trang thai don hang sang ${status}.`,
      data: {
        order,
        stockInSlip: stockInResult?.slip || null,
        stockInSlipAutoCreated: !!stockInResult?.created
      }
    };
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error('[ProductionOrderService] updateProductionOrderStatus error:', error);
    return { success: false, message: error.message, data: null };
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
    const assignment = await ProductionOrderAssignment.findById(assignmentId).session(session);
    if (!assignment) return { success: false, message: 'Assignment not found.', data: null };

    if (assignment.status === ORDER_STATUS.COMPLETED) {
      return { success: false, message: 'Cannot reassign a completed assignment.', data: null };
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

    // Notify new staff
    await createNotification({
      recipient: newStaffId,
      title: 'Nhiệm vụ sản xuất mới',
      message: `Bạn được phân công nhiệm vụ mới cho đơn hàng ${assignment.productionOrder}. Số lượng: ${assignment.assignedQuantity}.`,
      type: 'TASK',
      priority: 'HIGH',
      metaData: { assignmentId: assignment._id, orderId: assignment.productionOrder }
    });

    await session.commitTransaction();

    await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.STAFF], {
      domains: ["production"],
      action: "reassigned",
      entity: "production_assignment",
      id: assignment._id,
      message: `Production assignment ${assignment._id} was reassigned.`,
      metaData: { assignmentId: assignment._id, orderId: assignment.productionOrder, newStaffId }
    });

    return {
      success: true,
      message: 'Đã thay đổi nhân sự thành công.',
      data: { assignment }
    };
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.log('[ProductionOrderService] reassignProductionOrder error:', error);
    return { success: false, message: error.message, data: null };
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

    // Check if staff has already reported today
    if (isStaff && assignment.lastReportedAt) {
      const lastReportDate = new Date(assignment.lastReportedAt);
      const today = new Date();
      const isSameDay = lastReportDate.getFullYear() === today.getFullYear() &&
                        lastReportDate.getMonth() === today.getMonth() &&
                        lastReportDate.getDate() === today.getDate();
      if (isSameDay) {
        throw new Error('Bạn đã gửi báo cáo cho công việc này hôm nay rồi. Mỗi ngày chỉ được báo cáo tối đa 1 lần.');
      }
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
      assignment.lastReportedAt = new Date();
    }

    // Auto-adjust status based on completed quantity
    if (assignment.completedQuantity === assignment.assignedQuantity) {
      assignment.status = ORDER_STATUS.COMPLETED;
    } else if (assignment.completedQuantity > 0 && assignment.status === ORDER_STATUS.ASSIGNED) {
      assignment.status = ORDER_STATUS.IN_PRODUCTION;
    }

    // Set timestamps based on status
    if (assignment.status === ORDER_STATUS.IN_PRODUCTION && !assignment.startedAt) {
      assignment.startedAt = new Date();
    }
    if (assignment.status === ORDER_STATUS.COMPLETED) {
      assignment.finishedAt = new Date();
      try {
        assignment.completedQuantity = assignment.assignedQuantity; // Auto-complete if marked as COMPLETED
      } catch (error) {
        throw new Error(`Error updating completed quantity: ${error.message}`);
      }
    }

    // 3. Update Staff Workload if status changes to COMPLETED
    if (assignment.status === ORDER_STATUS.COMPLETED && oldStatus !== ORDER_STATUS.COMPLETED) {
      await User.findByIdAndUpdate(assignment.staff, {
        $inc: { currentAssignedQuantity: -assignment.assignedQuantity }
      }, { session });
    } else if (oldStatus === ORDER_STATUS.COMPLETED && assignment.status !== ORDER_STATUS.COMPLETED) {
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

    await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.STAFF], {
      domains: ["production", "products", "inventory"],
      action: "assignment_status_updated",
      entity: "production_assignment",
      id: assignment._id,
      message: `Assignment ${assignment._id} changed to ${status}.`,
      metaData: {
        assignmentId: assignment._id,
        orderId: order._id,
        orderCode: order.orderCode,
        assignmentStatus: assignment.status,
        orderStatus: order.status
      }
    });

    return {
      success: true,
      message: 'Assignment updated successfully.',
      data: { assignment, orderStatus: order.status }
    };
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error('[ProductionOrderService] updateAssignmentStatus error:', error);
    return { success: false, message: error.message, data: null };
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
    const existingSlip = await InventoryImportExportSlip.findOne({
      type: INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT,
      relatedProductionOrder: orderId,
      'items.product': { $exists: true }
    }).session(session);
    if (existingSlip) {
      return {
        success: true,
        message: 'Stock-in slip already exists for this production order.',
        data: { slip: existingSlip, alreadyExists: true }
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
      slipNumber,
      type: INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT,
      status: INVENTORY_IMPORT_EXPORT_SLIP_STATUS.PENDING,
      relatedProductionOrder: orderId,
      items: slipItems,
      totalAmount,
      reason: `Nhap kho thanh pham cho don hang ${order.orderCode}`,
      signatures: {
        creator: managerId,
        personInOut: slipData.personInOut || 'Bo phan san xuat'
      },
      notes: slipData.notes || `Nhập kho thành phẩm cho đơn hàng ${order.orderCode}`,
    });

    await newSlip.save({ session });

    // Link slip to order
    order.stockInSlip = newSlip._id;
    await order.save({ session });

    await session.commitTransaction();

    await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER], {
      domains: ["production", "slips", "inventory", "products"],
      action: "stock_in_slip_created",
      entity: "inventory_slip",
      id: newSlip._id,
      message: `Stock-in slip ${slipNumber} was created for order ${order.orderCode}.`,
      metaData: { slipId: newSlip._id, slipNumber, orderId: order._id, orderCode: order.orderCode }
    });

    await notifyUsersByRole({
      roles: [ROLES.KHO_MANAGER],
      excludeUserId: managerId,
      title: 'Co phieu nhap thanh pham moi',
      message: `Phieu nhap ${slipNumber} cho don ${order.orderCode} dang cho xu ly.`,
      type: 'INVENTORY',
      priority: 'HIGH',
      metaData: { slipId: newSlip._id, slipNumber, orderId: order._id }
    });

    return {
      success: true,
      message: 'Stock-in slip created successfully.',
      data: { slip: newSlip }
    };
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error('[ProductionOrderService] createStockInSlip error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Update an existing production order.
 * Handles re-calculating material requirements and alerts.
 */
export const updateProductionOrder = async (orderId, updateData, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await ProductionOrder.findById(orderId).session(session);
    if (!order) throw new Error('Order not found.');

    if ([ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED].includes(order.status)) {
      throw new Error(`Không thể chỉnh sửa đơn hàng đang ở trạng thái ${order.status}.`);
    }

    const { products: orderProducts, priority, deadline, notes, reason } = updateData;

    // 1. Check if quantity update is allowed
    const isProductionStarted = [
      ORDER_STATUS.IN_PRODUCTION,
      ORDER_STATUS.PARTIALLY_COMPLETE,
      ORDER_STATUS.COMPLETED
    ].includes(order.status);

    if (orderProducts && isProductionStarted) {
      throw new Error('Đơn hàng đã bắt đầu sản xuất, không thể thay đổi số lượng sản phẩm. Chỉ có thể cập nhật hạn hoàn thành và ghi chú.');
    }

    // 2. Update basic fields
    if (priority) order.priority = priority;
    if (deadline) order.deadline = deadline;
    if (notes !== undefined) order.notes = notes;

    // Log the update reason
    const logEntry = `\n[${new Date().toLocaleString()}] Chỉnh sửa bởi ${userId}. Lý do: ${reason}`;
    order.notes = (order.notes || '') + logEntry;

    // 3. Handle product and material updates
    if (orderProducts && Array.isArray(orderProducts)) {
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
      const newMaterialRequirements = new Map();
      let totalEstimatedTime = 0;

      for (const item of orderProducts) {
        const product = productMap.get(item.productId || item.productCode);
        if (!product) throw new Error(`Sản phẩm ${item.productId || item.productCode} không tồn tại.`);

        validatedProducts.push({
          product: product._id,
          quantity: item.quantity,
          productName: product.name,
          productCode: product.code
        });

        totalEstimatedTime += (product.estimatedProductionTime || 0) * item.quantity;

        for (const matCost of product.estimateMaterialCost) {
          const matId = matCost.material.toString();
          const needed = matCost.quantity * item.quantity;
          newMaterialRequirements.set(matId, (newMaterialRequirements.get(matId) || 0) + needed);
        }
      }

      // Calculate old requirements from BOM
      const oldBom = await Bom.findOne({ productionOrder: orderId }).session(session);
      const oldRequirements = new Map();
      if (oldBom) {
        oldBom.items.forEach(item => {
          oldRequirements.set(item.material.toString(), item.qtyPerUnit);
        });
      }

      order.products = validatedProducts;
      order.estimatedCompletionTime = totalEstimatedTime;

      // 4. Re-check materials and handle Requisitions
      const materialIds = Array.from(newMaterialRequirements.keys());
      const materials = await Material.find({ _id: { $in: materialIds } }).session(session);
      const materialMap = new Map(materials.map(m => [m._id.toString(), m]));

      const shortages = [];
      let hasInsufficientStock = false;

      for (const [matId, neededQuantity] of newMaterialRequirements.entries()) {
        const material = materialMap.get(matId);
        if (!material) throw new Error(`Vật tư ${matId} không tồn tại.`);

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

      // Only update status if it's not already in production/assigned
      if (![ORDER_STATUS.ASSIGNED, ORDER_STATUS.IN_PRODUCTION].includes(order.status)) {
        order.status = hasInsufficientStock ? ORDER_STATUS.INSUFFICIENT_MATERIALS : ORDER_STATUS.READY_TO_ASSIGN;
      }

      // 5. Update BOM snapshot
      await Bom.deleteMany({ productionOrder: orderId }).session(session);
      const bomItems = Array.from(newMaterialRequirements.entries()).map(([matId, needed]) => {
        const material = materialMap.get(matId);
        return {
          material: matId,
          qtyPerUnit: needed,
          unit: material ? material.unit : '',
          note: `Updated Snapshot for order ${order.orderCode}`
        };
      });
      const newBom = new Bom({
        productionOrder: orderId,
        items: bomItems,
        version: 'v1.1-updated',
        isActive: true
      });
      await newBom.save({ session });

      // 6. Update Material Alerts
      await MaterialAlert.deleteMany({ productionOrder: orderId }).session(session);
      if (hasInsufficientStock) {
        const alertPromises = shortages.map(shortage => {
          const newAlert = new MaterialAlert({
            ...shortage,
            productionOrder: orderId,
            status: 'pending'
          });
          return newAlert.save({ session });
        });
        await Promise.all(alertPromises);
      }

      // 7. Handle Material Requisitions Sync
      const existingRequisitions = await MaterialRequisition.find({
        productionOrder: orderId,
        status: { $ne: REQUISITION_STATUS.CANCELLED }
      }).session(session);

      const pendingReq = existingRequisitions.find(r => r.status === REQUISITION_STATUS.PENDING && r.type === REQUISITION_TYPE.ISSUE);
      const processedReqs = existingRequisitions.filter(r => r.status !== REQUISITION_STATUS.PENDING || r.type !== REQUISITION_TYPE.ISSUE);

      if (pendingReq) {
        // If there's a pending requisition, we can replace it
        await MaterialRequisition.findByIdAndDelete(pendingReq._id).session(session);

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const reqCount = await MaterialRequisition.countDocuments({ createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } }).session(session);
        const requisitionCode = `REQ-${dateStr}-${(reqCount + 1).toString().padStart(3, '0')}`;

        const newRequisition = new MaterialRequisition({
          requisitionCode,
          productionOrder: orderId,
          createdBy: userId,
          items: Array.from(newMaterialRequirements.entries()).map(([matId, needed]) => {
            const material = materialMap.get(matId);
            return {
              material: matId,
              requestedQuantity: needed,
              actualQuantity: 0
            };
          }),
          status: REQUISITION_STATUS.PENDING,
          notes: `Tạo lại yêu cầu sau khi chỉnh sửa đơn hàng. Lý do: ${reason}`
        });
        await newRequisition.save({ session });
      } else if (processedReqs.length > 0) {
        // If requisition is already being processed/approved, check if we need supplementary materials
        const supplementaryItems = [];

        for (const [matId, neededQuantity] of newMaterialRequirements.entries()) {
          const oldNeeded = oldRequirements.get(matId) || 0;
          if (neededQuantity > oldNeeded) {
            supplementaryItems.push({
              material: matId,
              requestedQuantity: neededQuantity - oldNeeded,
              actualQuantity: 0
            });
          }
        }

        if (supplementaryItems.length > 0) {
          const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const reqCount = await MaterialRequisition.countDocuments({ createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } }).session(session);
          const requisitionCode = `SUP-${dateStr}-${(reqCount + 1).toString().padStart(3, '0')}`;

          const supRequisition = new MaterialRequisition({
            requisitionCode,
            productionOrder: orderId,
            createdBy: userId,
            items: supplementaryItems,
            type: REQUISITION_TYPE.SUPPLEMENTARY,
            status: REQUISITION_STATUS.PENDING,
            notes: `Yêu cầu bổ sung vật tư do tăng số lượng đơn hàng. Lý do: ${reason}`
          });
          await supRequisition.save({ session });
        }
      } else {
        // No requisitions at all (maybe order was just created and not checked yet)
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const reqCount = await MaterialRequisition.countDocuments({ createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } }).session(session);
        const requisitionCode = `REQ-${dateStr}-${(reqCount + 1).toString().padStart(3, '0')}`;

        const newRequisition = new MaterialRequisition({
          requisitionCode,
          productionOrder: orderId,
          createdBy: userId,
          items: Array.from(newMaterialRequirements.entries()).map(([matId, needed]) => {
            return {
              material: matId,
              requestedQuantity: needed,
              actualQuantity: 0
            };
          }),
          status: REQUISITION_STATUS.PENDING
        });
        await newRequisition.save({ session });
      }
    }

    await order.save({ session });
    await session.commitTransaction();

    await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER], {
      domains: ["production", "requisitions", "materials", "inventory", "alerts"],
      action: "updated",
      entity: "production_order",
      id: order._id,
      message: `Production order ${order.orderCode} was updated.`,
      metaData: { orderId: order._id, orderCode: order.orderCode, status: order.status }
    });

    return {
      success: true,
      message: 'Cập nhật đơn sản xuất thành công.',
      data: { order }
    };
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error('[ProductionOrderService] updateProductionOrder error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Cancel a production order.
 * Cancels assignments and material requisitions.
 */
export const cancelProductionOrder = async (orderId, reason, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await ProductionOrder.findById(orderId).session(session);
    if (!order) throw new Error('Order not found.');

    if (order.status === ORDER_STATUS.COMPLETED) {
      throw new Error('Cannot cancel a completed order.');
    }

    // 1. Update Order Status
    order.status = ORDER_STATUS.CANCELLED;
    order.notes = (order.notes || '') + `\n[CANCELLED] Reason: ${reason} (by ${userId})`;
    await order.save({ session });

    // 2. Cancel Assignments
    const assignments = await ProductionOrderAssignment.find({ productionOrder: orderId }).session(session);
    for (const assignment of assignments) {
      if (assignment.status !== ORDER_STATUS.COMPLETED) {
        // Update staff workload
        await User.findByIdAndUpdate(assignment.staff, {
          $inc: { currentAssignedQuantity: -assignment.assignedQuantity }
        }, { session });

        assignment.status = ORDER_STATUS.CANCELLED;
        assignment.notes = (assignment.notes || '') + `\n[CANCELLED] Order cancelled: ${reason}`;
        await assignment.save({ session });

        // Notify staff
        await createNotification({
          recipient: assignment.staff,
          title: 'Nhiệm vụ bị hủy',
          message: `Nhiệm vụ sản xuất cho đơn ${order.orderCode} đã bị hủy. Lý do: ${reason}`,
          type: 'TASK',
          priority: 'MEDIUM',
          metaData: { orderId, assignmentId: assignment._id }
        });
      }
    }

    // 3. Cancel Requisitions and Alerts
    await MaterialRequisition.updateMany(
      { productionOrder: orderId, status: REQUISITION_STATUS.PENDING },
      { status: 'cancelled' },
      { session }
    );

    await MaterialAlert.updateMany(
      { productionOrder: orderId, status: 'pending' },
      { status: 'ignored' },
      { session }
    );

    await session.commitTransaction();

    await emitDataChanged([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.STAFF, ROLES.KHO_MANAGER], {
      domains: ["production", "requisitions", "alerts"],
      action: "cancelled",
      entity: "production_order",
      id: order._id,
      message: `Production order ${order.orderCode} was cancelled.`,
      metaData: { orderId: order._id, orderCode: order.orderCode, reason }
    });

    return {
      success: true,
      message: 'Production order cancelled successfully.',
      data: { order }
    };
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error('[ProductionOrderService] cancelProductionOrder error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Get BOM (Material Snapshot) for a specific order.
 */
export const getBomByOrderId = async (orderId) => {
  try {
    const bom = await Bom.findOne({ productionOrder: orderId }).populate('items.material').lean();
    if (!bom) return { success: false, message: 'BOM snapshot not found for this order.', data: null };

    return {
      success: true,
      message: 'BOM retrieved.',
      data: bom
    };
  } catch (error) {
    console.log('[ProductionOrderService] getBomByOrderId error:', error);
    return { success: false, message: error.message, data: null };
  }
};

/**
 * Get list of material alerts for Production Manager.
 */
export const getMaterialAlerts = async (queryParams) => {
  try {
    const { status = 'pending', page = 1, limit = 20, cursor, withTotal = true } = queryParams;
    const { pageNum, limitNum, skip, cursor: cursorId, withTotal: shouldCount } = normalizePagination({ page, limit, cursor, withTotal });

    let filter = {};
    if (status !== 'all') filter.status = status;
    filter = applyCreatedAtCursor(filter, cursorId);

    const totalPromise = shouldCount ? MaterialAlert.countDocuments(filter) : Promise.resolve(undefined);
    const [alerts, total] = await Promise.all([
      MaterialAlert.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('material', 'name code unit currentStock threshold')
        .populate('productionOrder', 'orderCode status')
        .lean(),
      totalPromise
    ]);

    return {
      success: true,
      message: 'Material alerts retrieved successfully.',
      data: {
        alerts,
        pagination: buildListPagination({ items: alerts, total, pageNum, limitNum, cursor: cursorId, withTotal: shouldCount })
      }
    };
  } catch (error) {
    console.error('[ProductionOrderService] getMaterialAlerts error:', error);
    return { success: false, message: error.message, data: null };
  }
};
