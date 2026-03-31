import SystemLog from '../models/SystemLog.js';
import { StatusCodes } from 'http-status-codes';

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

    const logs = await SystemLog.find(query)
      .populate('author', 'username fullName role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit).lean();

    const count = await SystemLog.countDocuments(query);
    
    const standardlizeLog = logs.map(log => ({
      ...log,
      createdAt: log.createdAt.toLocaleString(),
      ipAddress: log.ipAddress || 'N/A',
      userAgent: log.userAgent || 'N/A',
    }));
    
    return res.status(StatusCodes.OK).json({
      data: {
        logs: standardlizeLog,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalLogs: count
      }
    });
  } catch (error) {
    console.error('[SystemController] getSystemLogs error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: { message: 'Failed to retrieve system logs.', error: error.message }
    });
  }
};
