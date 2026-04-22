import { StatusCodes } from 'http-status-codes';
import * as productionOrderService from '../services/productionOrderService.js';
import { logActivity } from '../utils/logger.js';
import { ROLES } from '../utils/constants.js';
import {
  createOrderValidator,
  assignOrderValidator,
  reassignTaskValidator,
  updateAssignmentStatusValidator
} from '../validations/productionValidation.js';

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

    res.status(StatusCodes.CREATED).json({
      status: 'success',
      message: result.message,
      data: result.data
    });
    setImmediate(async () => {
      await logActivity({
        author: req.userId,
        action: 'CREATE_PRODUCTION_ORDER',
        module: 'PRODUCTION',
        details: `Created order: ${result.data.order.orderCode}`,
        targetId: result.data.order._id
      }, req);
    })

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

    const { orderId, assignments } = value;
    const result = await productionOrderService.assignProductionOrder(orderId, assignments);

    if (result.status === 'error') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: result.message,
        data: null
      });
    }

    res.status(StatusCodes.OK).json({
      status: 'success',
      message: result.message,
      data: result.data
    });
    setImmediate(async () => {
      await logActivity({
        author: req.userId,
        action: 'ASSIGN_PRODUCTION_ORDER',
        module: 'PRODUCTION',
        details: `Admin assigned order ${orderId} to ${assignments.map(assignment => assignment.staffId).join(', ')}`,
        targetId: orderId
      }, req);
    })
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

    res.status(StatusCodes.OK).json({
      status: 'success',
      message: result.message,
      data: result.data
    });
    setImmediate(async () => {
      await logActivity({
        author: req.userId,
        action: 'REASSIGN_TASK',
        module: 'PRODUCTION',
        details: `Admin reassigned assignment ${assignmentId} to new staff`,
        targetId: assignmentId
      }, req);
    })
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

    const { id } = req.params;
    const { status, completedQuantity } = value;

    // Security check: Staff can only update their own assignments
    if (req.userRole === ROLES.STAFF) {
      const result = await productionOrderService.updateAssignmentStatus(id, status, completedQuantity, req.userId);
      if (result.status === 'error') {
        return res.status(StatusCodes.FORBIDDEN).json(result);
      }
      return res.status(StatusCodes.OK).json(result);
    }

    const result = await productionOrderService.updateAssignmentStatus(id, status, completedQuantity);

    if (result.status === 'error') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: result.message,
        data: null
      });
    }

    res.status(StatusCodes.OK).json({
      status: 'success',
      message: result.message,
      data: result.data
    });

    setImmediate(async () => {
      await logActivity({
        author: req.userId,
        action: 'UPDATE_ASSIGNMENT_STATUS',
        module: 'PRODUCTION',
        details: `Assignment ${id} updated to status ${status} with quantity ${completedQuantity}`,
        targetId: id
      }, req);
    })
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to update assignment status.',
      data: null
    });
  }
};

export const createStockInSlip = async (req, res) => {
  try {
    const { id } = req.params; // Order ID
    const slipData = req.body;

    const result = await productionOrderService.createStockInSlip(id, req.userId, slipData);

    if (result.status === 'error') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: result.message,
        data: null
      });
    }

    res.status(StatusCodes.CREATED).json({
      status: 'success',
      message: result.message,
      data: result.data
    });

    setImmediate(async () => {
      await logActivity({
        author: req.userId,
        action: 'CREATE_STOCK_IN_SLIP',
        module: 'PRODUCTION',
        details: `Production Manager created stock-in slip for order ${id}`,
        targetId: id
      }, req);
    })
  } catch (error) {
    console.log('[ProductionOrderController] createStockInSlip error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to create stock-in slip.',
      data: null
    });
  }
};
