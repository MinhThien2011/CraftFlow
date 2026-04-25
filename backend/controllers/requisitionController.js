import { StatusCodes } from 'http-status-codes';
import * as requisitionService from '../services/materialRequisitionService.js';
import { logActivity } from '../utils/logger.js';
import { updateRequisitionStatusValidator } from '../validations/requisitionValidation.js';

export const getRequisitions = async (req, res) => {
  try {
    const { status, productionOrderId, search, page, limit } = req.query;
    const result = await requisitionService.getRequisitions({
      status,
      productionOrderId,
      search,
      page,
      limit
    });

    return res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.log("[RequisitionController] getRequisitions error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to retrieve material requisitions.',
      data: null
    });
  }
};

export const getRequisitionById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await requisitionService.getRequisitionById(id);

    if (result.status === 'error') {
      return res.status(StatusCodes.NOT_FOUND).json(result);
    }

    return res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.log("[RequisitionController] getRequisitionById error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to retrieve material requisition.',
      data: null
    });
  }
};

export const requestMaterials = async (req, res) => {
  try {
    const { productionOrderId, items } = req.body;
    const result = await requisitionService.requestMaterials(productionOrderId, req.userId, items);

    if (result.status === 'error') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: result.message,
        data: null
      });
    }

    await logActivity({
      author: req.userId,
      action: 'REQUEST_MATERIALS',
      module: 'MATERIAL_REQUISITION',
      details: `Requested materials for production order: ${productionOrderId}`,
      targetId: result.data._id
    }, req);

    return res.status(StatusCodes.CREATED).json({
      status: 'success',
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.log("Error submitting material requisition:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to submit material requisition.',
      data: null
    });
  }
};

export const updateRequisitionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateRequisitionStatusValidator(req.body);
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: `Validation failed: ${error.details.map(d => d.message).join(', ')}`,
        data: null
      });
    }

    const { status, notes, evidenceImage } = value;
    const result = await requisitionService.updateRequisitionStatus(id, req.userId, status, { notes, evidenceImage });

    if (result.status === 'error') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: result.message,
        data: null
      });
    }

    await logActivity({
      author: req.userId,
      action: 'UPDATE_REQUISITION_STATUS',
      module: 'MATERIAL_REQUISITION',
      details: `Updated status to ${status} for requisition: ${id}`,
      targetId: id
    }, req);

    return res.status(StatusCodes.OK).json({
      status: 'success',
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.log("Error updating requisition status:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to update requisition status.',
      data: null
    });
  }
};