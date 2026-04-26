import { StatusCodes } from 'http-status-codes';
import * as productionOrderService from '../services/productionOrderService.js';
import { logActivity } from '../utils/logger.js';
import { ROLES } from '../utils/constants.js';
import { clearCacheByPattern, getCachedData, setCachedData } from "../utils/redisFetching.js";
import {
  createOrderValidator,
  assignOrderValidator,
  reassignTaskValidator,
  updateAssignmentStatusValidator,
  createStockInSlipValidator
} from '../validations/productionValidation.js';

export const getListProductionOrder = async (req, res) => {
  try {
    const { status, priority, search, page = 1, limit = 10 } = req.query;
    const userId = req.userId;
    const userRole = req.userRole;

    const cacheKey = `production:list:${JSON.stringify({ userId, userRole, status, priority, search, page, limit })}`;

    // 1. Try to get from Redis
    const cachedResult = await getCachedData(cacheKey);
    if (cachedResult) {
      return res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'Production orders retrieved successfully (from cache)',
        data: cachedResult
      });
    }

    // 2. If not in cache, get from Service based on role
    let result;
    if (userRole === ROLES.STAFF) {
      result = await productionOrderService.getStaffProductionOrders(userId, req.query);
    } else {
      result = await productionOrderService.getAllProductionOrders(req.query);
    }

    if (result.status === 'error') {
      return res.status(StatusCodes.BAD_REQUEST).json(result);
    }

    // 3. Cache the result
    await setCachedData(cacheKey, result.data);

    return res.status(StatusCodes.OK).json(result);

  } catch (error) {
    console.error('[ProductionOrderController] getListProductionOrder error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to get production order list.',
      data: null
    });
  }
};

export const getProductionOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `production:detail:${id}`;

    // 1. Try cache
    const cachedResult = await getCachedData(cacheKey);
    if (cachedResult) {
      return res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'Production order details retrieved (from cache)',
        data: cachedResult
      });
    }

    const result = await productionOrderService.getProductionOrderById(id);

    if (result.status === 'error') {
      return res.status(StatusCodes.NOT_FOUND).json(result);
    }

    // 2. Cache result
    await setCachedData(cacheKey, result.data);

    return res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.error('[ProductionOrderController] getProductionOrderById error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to get production order details.',
      data: null
    });
  }
};

export const createOrder = async (req, res) => {
  try {
    const { error, value } = createOrderValidator(req.body);
    if (error) {
      const errorMessages = error.details.map(detail => detail.message).join(', ');
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: `Validation failed: ${errorMessages}`,
        data: null
      });
    }

    const result = await productionOrderService.createProductionOrder(value, req.userId);

    if (result.status === 'error') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: result.message,
        data: null
      });
    }

    // Invalidate caches
    clearCacheByPattern('production:list:*');

    await logActivity({
      author: req.userId,
      action: 'CREATE_PRODUCTION_ORDER',
      module: 'PRODUCTION',
      details: `Created order: ${result.data.order.orderCode}`,
      targetId: result.data.order._id
    }, req);

    return res.status(StatusCodes.CREATED).json({
      status: 'success',
      message: result.message,
      data: result.data
    });

  } catch (error) {
    console.log('[ProductionOrderController] createOrder error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to create production order.',
      data: null
    });
  }
};

export const getSuggestions = async (req, res) => {
  try {
    const result = await productionOrderService.getStaffSuggestions();
    return res.status(StatusCodes.OK).json({
      status: 'success',
      message: result.message,
      data: result.data
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to get staff suggestions.',
      data: null
    });
  }
};

export const assignOrder = async (req, res) => {
  try {
    const { error, value } = assignOrderValidator(req.body);
    if (error) {
      const errorMessages = error.details.map(detail => detail.message).join(', ');
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: `Validation failed: ${errorMessages}`,
        data: null
      });
    }

    const userId = req.userId;
    const { orderId, assignments } = value;
    const result = await productionOrderService.assignProductionOrder(orderId, assignments);

    if (result.status === 'error') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: result.message,
        data: null
      });
    }

    // Invalidate caches
    clearCacheByPattern('production:list:*');
    clearCacheByPattern(`production:detail:${orderId}`);

    await logActivity({
      author: userId,
      action: 'ASSIGN_PRODUCTION_ORDER',
      module: 'PRODUCTION',
      details: `Admin assigned order ${orderId} to ${assignments.map(assignment => assignment.staffId).join(', ')}`,
      targetId: orderId
    }, req);

    return res.status(StatusCodes.OK).json({
      status: 'success',
      message: result.message,
      data: result.data
    });

  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to assign production order.',
      data: null
    });
  }
};

export const checkMaterials = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await productionOrderService.checkOrderMaterials(id);

    if (result.status === 'error') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: result.message,
        data: result.data
      });
    }

    // Invalidate caches
    clearCacheByPattern('production:list:*');
    clearCacheByPattern(`production:detail:${id}`);

    return res.status(StatusCodes.OK).json({
      status: 'success',
      message: result.message,
      data: result.data
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to check order materials.',
      data: null
    });
  }
};

export const reassignTask = async (req, res) => {
  try {
    const { error, value } = reassignTaskValidator(req.body);
    if (error) {
      const errorMessages = error.details.map(detail => detail.message).join(', ');
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: `Validation failed: ${errorMessages}`,
        data: null
      });
    }

    const { assignmentId, newStaffId, reason } = value;
    const result = await productionOrderService.reassignProductionOrder(assignmentId, newStaffId, reason);

    if (result.status === 'error') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: result.message,
        data: null
      });
    }

    // Invalidate caches
    clearCacheByPattern('production:list:*');
    if (result.data?.assignment?.productionOrder) {
      clearCacheByPattern(`production:detail:${result.data.assignment.productionOrder}`);
    }

    await logActivity({
      author: req.userId,
      action: 'REASSIGN_TASK',
      module: 'PRODUCTION',
      details: `Admin reassigned assignment ${assignmentId} to new staff`,
      targetId: assignmentId
    }, req);

    return res.status(StatusCodes.OK).json({
      status: 'success',
      message: result.message,
      data: result.data
    });

  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to reassign task.',
      data: null
    });
  }
};

export const updateAssignmentStatus = async (req, res) => {
  try {
    const { error, value } = updateAssignmentStatusValidator(req.body);
    if (error) {
      const errorMessages = error.details.map(detail => detail.message).join(', ');
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: `Validation failed: ${errorMessages}`,
        data: null
      });
    }
    const userId = req.userId;
    const { id } = req.params;
    const { status, completedQuantity } = value;

    let result;
    // Security check: Staff can only update their own assignments
    if (req.userRole === ROLES.STAFF) {
      result = await productionOrderService.updateAssignmentStatus(id, status, completedQuantity, userId);
    } else {
      result = await productionOrderService.updateAssignmentStatus(id, status, completedQuantity);
    }

    if (result.status === 'error') {
      return res.status(req.userRole === ROLES.STAFF ? StatusCodes.FORBIDDEN : StatusCodes.BAD_REQUEST).json(result);
    }

    // Invalidate caches
    clearCacheByPattern('production:list:*');
    if (result.data?.productionOrderId) {
      clearCacheByPattern(`production:detail:${result.data.productionOrderId}`);
    }

    await logActivity({
      author: userId,
      action: 'UPDATE_ASSIGNMENT_STATUS',
      module: 'PRODUCTION',
      details: `Assignment ${id} updated to status ${status} with quantity ${completedQuantity}`,
      targetId: id
    }, req);

    return res.status(StatusCodes.OK).json({
      status: 'success',
      message: result.message,
      data: result.data
    });


  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to update assignment status.',
      data: null
    });
  }
};

export const getBom = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await productionOrderService.getBomByOrderId(id);

    if (!result.success ) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: 'error',
        message: result.message,
        data: null
      });
    }

    return res.status(StatusCodes.OK).json({
      status: 'success',
      message: result.message,
      data: result.data
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to get BOM.',
      data: null
    });
  }
};

export const createStockInSlip = async (req, res) => {
  try {
    const { error, value } = createStockInSlipValidator(req.body);
    if (error) {
      const errorMessages = error.details.map(detail => detail.message).join(', ');
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: `Validation failed: ${errorMessages}`,
        data: null
      });
    }

    const { id } = req.params; // Order ID
    const result = await productionOrderService.createStockInSlip(id, req.userId, value);

    if (!result.success ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: result.message,
        data: null
      });
    }

    await logActivity({
      author: req.userId,
      action: 'CREATE_STOCK_IN_SLIP',
      module: 'PRODUCTION',
      details: `Production Manager created stock-in slip for order ${id}`,
      targetId: id
    }, req);

    return res.status(StatusCodes.CREATED).json({
      status: 'success',
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.log('[ProductionOrderController] createStockInSlip error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to create stock-in slip.',
      data: null
    });
  }
};
