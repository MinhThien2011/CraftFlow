import { StatusCodes } from 'http-status-codes';
import * as productExportService from '../services/productExportService.js';
import {
    createExportRequestValidator,
    updateExportRequestStatusValidator
} from '../validations/productExportValidation.js';
import { logActivity } from '../utils/logger.js';
import { clearCacheByPattern } from '../utils/redisFetching.js';

/**
 * Create a new product export request (Production Manager)
 */
export const createExportRequest = async (req, res) => {
    try {
        const { error, value } = createExportRequestValidator(req.body);
        if (error) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: 'error',
                message: 'Invalid data.',
                details: error.details.map(d => d.message)
            });
        }

        const userId = req.userId;
        const result = await productExportService.createExportRequest(value, userId);

        if (result.status === 'error') {
            return res.status(StatusCodes.BAD_REQUEST).json(result);
        }

        await logActivity({
            author: userId,
            action: 'CREATE_PRODUCT_EXPORT_REQUEST',
            module: 'INVENTORY',
            details: `Đã tạo yêu cầu xuất hàng ${result.data.requestCode}`,
            targetId: result.data._id
        }, req);

        return res.status(StatusCodes.CREATED).json(result);
    } catch (error) {
        console.error('[ProductExportController] createExportRequest error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: 'error when system create export request.'
        });
    }
};

/**
 * Update request status (Admin)
 */
export const updateRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { error, value } = updateExportRequestStatusValidator(req.body);
        if (error) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: 'error',
                message: 'Invalid data.',
                details: error.details.map(d => d.message)
            });
        }

        const userId = req.userId;
        const result = await productExportService.updateRequestStatus(id, value.status, userId);

        if (result.status === 'error') {
            return res.status(StatusCodes.BAD_REQUEST).json(result);
        }

        // Invalidate caches
        clearCacheByPattern('product:list:*');
        clearCacheByPattern('inventory:*');

        await logActivity({
            author: userId,
            action: 'UPDATE_PRODUCT_EXPORT_STATUS',
            module: 'INVENTORY',
            details: `Updated export request ${id} status to ${value.status}`,
            targetId: id
        }, req);

        return res.status(StatusCodes.OK).json(result);
    } catch (error) {
        console.error('[ProductExportController] updateRequestStatus error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: 'error when system update export request status.'
        });
    }
};

/**
 * Get all product export requests
 */
export const getAllExportRequests = async (req, res) => {
    try {
        const filters = req.query || {};
        const result = await productExportService.getExportRequests(filters);

        if (result.status === 'error') {
            return res.status(StatusCodes.BAD_REQUEST).json(result);
        }

        return res.status(StatusCodes.OK).json(result);
    } catch (error) {
        console.error('[ProductExportController] getAllExportRequests error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: 'error when system get export requests.'
        });
    }
};
