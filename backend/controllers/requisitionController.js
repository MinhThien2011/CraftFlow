import { StatusCodes } from 'http-status-codes';
import * as requisitionService from '../services/materialRequisitionService.js';
import { logActivity } from '../utils/logger.js';
import { updateRequisitionStatusValidator } from '../validations/requisitionValidation.js';

export const getRequisitions = async (req, res) => {
  try {
    const { status, productionOrderId, search, page, limit, type } = req.query;
    const result = await requisitionService.getRequisitions({
      status,
      productionOrderId,
      search,
      page,
      limit,
      type
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
        success: false,
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
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.log("Error submitting material requisition:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to submit material requisition.',
      data: null
    });
  }
};

export const requestSupplementaryMaterials = async (req, res) => {
  try {
    const { productionOrderId, items, parentRequisitionId } = req.body;
    const result = await requisitionService.requestSupplementaryMaterials(
      productionOrderId,
      req.userId,
      items,
      parentRequisitionId
    );

    if (result.status === 'error') {
      return res.status(StatusCodes.BAD_REQUEST).json(result);
    }

    await logActivity({
      author: req.userId,
      action: 'REQUEST_SUPPLEMENTARY_MATERIALS',
      module: 'MATERIAL_REQUISITION',
      details: `Requested supplementary materials for production order: ${productionOrderId}`,
      targetId: result.data.requisition._id
    }, req);

    return res.status(StatusCodes.CREATED).json(result);
  } catch (error) {
    console.log("[RequisitionController] requestSupplementaryMaterials error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to request supplementary materials.',
      data: null
    });
  }
};

export const requestReturnMaterials = async (req, res) => {
  try {
    const { productionOrderId, items } = req.body;
    const result = await requisitionService.requestReturnMaterials(
      productionOrderId,
      req.userId,
      items
    );

    if (result.status === 'error') {
      return res.status(StatusCodes.BAD_REQUEST).json(result);
    }

    await logActivity({
      author: req.userId,
      action: 'REQUEST_RETURN_MATERIALS',
      module: 'MATERIAL_REQUISITION',
      details: `Requested material return for production order: ${productionOrderId}`,
      targetId: result.data.requisition._id
    }, req);

    return res.status(StatusCodes.CREATED).json(result);
  } catch (error) {
    console.log("[RequisitionController] requestReturnMaterials error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to request material return.',
      data: null
    });
  }
};

export const approveReturnRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const managerId = req.userId;
    const result = await requisitionService.approveReturnRequisition(id, managerId);

    if (result.status === 'error') {
      return res.status(StatusCodes.BAD_REQUEST).json(result);
    }

    await logActivity({
      author: managerId,
      action: 'APPROVE_RETURN_REQUISITION',
      module: 'MATERIAL_REQUISITION',
      details: `Approved material return requisition: ${id}. Created import slip: ${result.data.slip.slipNumber}`,
      targetId: id,
      metadata: { slipId: result.data.slip._id }
    }, req);

    return res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.log("[RequisitionController] approveReturnRequisition error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to approve material return.',
      data: null
    });
  }
};

export const updateRequisitionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await requisitionService.updateRequisitionByManager(id, req.body, req.userId);

    if (result.status === 'error') {
      return res.status(StatusCodes.BAD_REQUEST).json(result);
    }

    if (result.changes && result.changes.length > 0) {
      await logActivity({
        author: req.userId,
        action: 'UPDATE_REQUISITION_DETAILS',
        module: 'MATERIAL_REQUISITION',
        details: `Updated requisition ${id} details: ${result.changes.map(c => c.field).join(', ')}`,
        targetId: id,
        metadata: { changes: result.changes }
      }, req);
    }

    return res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.log("[RequisitionController] updateRequisitionDetails error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update material requisition details.',
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
        success: false,
        message: `Validation failed: ${error.details.map(d => d.message).join(', ')}`,
        data: null
      });
    }

    const { status, notes, evidenceImage } = value;
    const result = await requisitionService.updateRequisitionStatus(id, req.userId, status, { notes, evidenceImage });

    if (!result.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
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
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.log("Error updating requisition status:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update requisition status.',
      data: null
    });
  }
};