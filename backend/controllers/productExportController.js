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
                message: 'Dữ liệu không hợp lệ.',
                details: error.details.map(d => d.message)
            });
        }

        const userId = req.userId;
        const result = await productExportService.createExportRequest(value, userId);

        if (!result.success) {
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
            message: 'Lỗi hệ thống khi tạo yêu cầu xuất hàng.'
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
                message: 'Dữ liệu không hợp lệ.',
                details: error.details.map(d => d.message)
            });
        }

        const userId = req.userId;
        const result = await productExportService.updateRequestStatus(id, value.status, userId);

        if (!result.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(result);
        }

        // Invalidate caches
        clearCacheByPattern('product:list:*');
        clearCacheByPattern('inventory:*');

        await logActivity({
            author: userId,
            action: 'UPDATE_PRODUCT_EXPORT_STATUS',
            module: 'INVENTORY',
            details: `Cập nhật trạng thái yêu cầu xuất hàng ${id} thành ${value.status}`,
            targetId: id
        }, req);

        return res.status(StatusCodes.OK).json(result);
    } catch (error) {
        console.error('[ProductExportController] updateRequestStatus error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: 'Lỗi hệ thống khi cập nhật trạng thái yêu cầu.'
        });
    }
};

/**
 * Get all product export requests
 */
export const getAllExportRequests = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, requestCode } = req.query;
        const filters = {};

        if (status) filters.status = status;
        if (requestCode) filters.requestCode = new RegExp(requestCode, 'i');

        const result = await productExportService.getAllExportRequests(filters, parseInt(page), parseInt(limit));
        return res.status(StatusCodes.OK).json(result);
    } catch (error) {
        console.error('[ProductExportController] getAllExportRequests error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: 'Lỗi hệ thống khi lấy danh sách yêu cầu.'
        });
    }
};

/**
 * Get product export request by ID
 */
export const getExportRequestById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await productExportService.getRequestById(id);

        if (!result.success) {
            return res.status(result.statusCode || StatusCodes.NOT_FOUND).json(result);
        }

        return res.status(StatusCodes.OK).json(result);
    } catch (error) {
        console.error('[ProductExportController] getExportRequestById error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: 'Lỗi hệ thống khi lấy chi tiết yêu cầu.'
        });
    }
};
