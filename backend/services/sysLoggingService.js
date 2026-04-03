import SystemLog from "../models/SystemLog.js";
import { standardlizeResponseDataHelper } from "../utils/standardlizeResponseData.js";

const MAX_LIMIT = 500; // Logs can be larger than other entities

/**
 * Get system logs with filtering and pagination.
 * Optimized with projection, lean() and parallel queries.
 */
export const getSystemLogsService = async (query, page = 1, limit = 50) => {
    try {
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [logs, count] = await Promise.all([
            SystemLog.find(query)
                .select('author action module details targetId createdAt ipAddress') // Projection
                .populate('author', 'username fullName role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            SystemLog.countDocuments(query)
        ]);

        return {
            success: true,
            message: 'System logs retrieved successfully.',
            data: {
                logs: standardlizeResponseDataHelper(logs),
                pagination: {
                    total: count,
                    page: pageNum,
                    limit: limitNum,
                    pages: Math.ceil(count / limitNum)
                }
            },
        };
    } catch (error) {
        console.error('[sysLoggingService] getSystemLogsService error:', error);
        return {
            success: false,
            message: error.message,
            data: null, 
        };
    }
}