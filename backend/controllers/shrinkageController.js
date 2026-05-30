import { StatusCodes } from 'http-status-codes';
import * as shrinkageService from '../services/shrinkageService.js';
import {
    createShrinkageReportValidator,
    updateShrinkageStatusValidator,
    createShrinkageReturnRequestValidator
} from '../validations/shrinkageValidation.js';
import { logActivity } from '../utils/logger.js';
import { clearCacheByPattern } from '../utils/redisFetching.js';

/**
 * Create a new shrinkage report (Kho Manager)
 */
export const createShrinkageReport = async (req, res) => {
    try {
        const { error, value } = createShrinkageReportValidator(req.body);
        if (error) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: 'error',
                message: error.details.map(d => d.message).join(', ')
            });
        }

        const userId = req.userId;
        const result = await shrinkageService.createShrinkageReport(value, userId);

        if (result.status === 'error') {
            return res.status(StatusCodes.BAD_REQUEST).json(result);
        }

        // Invalidate related caches
        clearCacheByPattern('shrinkage:*');
        clearCacheByPattern('material:*');

        await logActivity({
            author: userId,
            action: 'CREATE_SHRINKAGE_REPORT',
            module: 'INVENTORY',
            details: `Created shrinkage report ${result.data.reportCode} for material ${value.materialId}`,
            targetId: result.data._id
        }, req);

        return res.status(StatusCodes.CREATED).json(result);
    } catch (error) {
        console.error('[ShrinkageController] createShrinkageReport error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: 'Failed to create shrinkage report.'
        });
    }
};

/**
 * Update shrinkage report status (Admin/Approver)
 */
export const updateShrinkageStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { error, value } = updateShrinkageStatusValidator(req.body);
        if (error) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: 'error',
                message: error.details.map(d => d.message).join(', ')
            });
        }

        const userId = req.userId;
        const result = await shrinkageService.updateShrinkageStatus(id, value, userId);

        if (result.status === 'error') {
            return res.status(StatusCodes.BAD_REQUEST).json(result);
        }

        // Invalidate caches
        clearCacheByPattern('shrinkage:*');
        if (value.status === 'accepted') {
            clearCacheByPattern('material:*');
            clearCacheByPattern('inventory:*');
        }

        await logActivity({
            author: userId,
            action: 'UPDATE_SHRINKAGE_STATUS',
            module: 'INVENTORY',
            details: `Updated shrinkage report ${id} status to ${value.status}`,
            targetId: id
        }, req);

        return res.status(StatusCodes.OK).json(result);
    } catch (error) {
        console.error('[ShrinkageController] updateShrinkageStatus error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: 'Failed to update shrinkage report status.'
        });
    }
};

/**
 * Get all shrinkage reports
 */
export const getAllShrinkageReports = async (req, res) => {
    try {
        const filters = req.query || {};
        const result = await shrinkageService.getShrinkageReports(filters);

        if (result.status === 'error') {
            return res.status(StatusCodes.BAD_REQUEST).json(result);
        }

        return res.status(StatusCodes.OK).json(result);
    } catch (error) {
        console.error('[ShrinkageController] getAllShrinkageReports error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: 'Failed to retrieve shrinkage reports.'
        });
    }
};

export const createShrinkageReturnRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { error, value } = createShrinkageReturnRequestValidator(req.body || {});
        if (error) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: 'error',
                message: error.details.map(d => d.message).join(', ')
            });
        }

        const result = await shrinkageService.createReturnRequestFromShrinkage(id, value, req.userId);
        if (result.status === 'error') {
            return res.status(StatusCodes.BAD_REQUEST).json(result);
        }

        clearCacheByPattern('shrinkage:*');
        clearCacheByPattern('requisition:*');

        return res.status(StatusCodes.OK).json(result);
    } catch (error) {
        console.error('[ShrinkageController] createShrinkageReturnRequest error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: 'Failed to create return request from shrinkage report.'
        });
    }
};

export const getShrinkageSummary = async (req, res) => {
    try {
        const result = await shrinkageService.getShrinkageSummary(req.query || {});
        if (result.status === 'error') {
            return res.status(StatusCodes.BAD_REQUEST).json(result);
        }
        return res.status(StatusCodes.OK).json(result);
    } catch (error) {
        console.error('[ShrinkageController] getShrinkageSummary error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: 'Failed to get shrinkage summary.'
        });
    }
};
