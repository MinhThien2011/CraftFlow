import { StatusCodes } from 'http-status-codes';
import * as requisitionService from '../services/materialRequisitionService.js';
import { logActivity } from '../utils/logger.js';

export const requestMaterials = async (req, res) => {
  try {
    const { assignmentId, items } = req.body;
    const result = await requisitionService.requestMaterials(assignmentId, req.userId, items);
    
    if (result.status === 'error') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: result.message,
        data: null
      });
    }

    return res.status(StatusCodes.CREATED).json({
      status: 'success',
      message: result.message,
      data: result.data
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Failed to submit material requisition.',
      data: null
    });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const result = await requisitionService.updateRequisitionStatus(id, req.userId, status, notes);
    
    if (result.status === 'error') {
      return res.status(StatusCodes.BAD_REQUEST).json({
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
      message: 'Failed to update requisition status.',
      data: null
    });
  }
};
