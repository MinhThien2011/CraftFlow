import SystemLog from '../models/SystemLog.js';
import { standardlizeResponseDataHelper } from '../utils/standardlizeResponseData.js';
import { StatusCodes } from 'http-status-codes';
import * as sysLoggingService from '../services/sysLoggingService.js';
/**
 * Get system logs with filtering and pagination.
 */
export const getSystemLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      module, 
      action, 
      authorId, 
      startDate, 
      endDate 
    } = req.query;

    const query = {};

    if (module) query.module = module.toUpperCase();
    if (action) query.action = action.toUpperCase();
    if (authorId) query.author = authorId;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const result = await sysLoggingService.getSystemLogsService(query, parseInt(page), parseInt(limit));

        if (!result.success) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: result.message,
                data: null
            });
        }

        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'System logs retrieved successfully.',
            data: result.data
        });
    } catch (error) {
        console.error('[SystemController] getSystemLogs error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to retrieve system logs.',
            data: null
        });
    }
};
