import * as fifoService from '../services/fifoService.js';
import { StatusCodes } from 'http-status-codes';
import { handleServiceResponse } from '../utils/responseHelper.js';
export const getBatchesByMaterial = async (req, res) => {
    try {
        const { materialId } = req.params;
        const { includeExhausted } = req.query;

        const result = await fifoService.getBatchesByMaterial(
            materialId,
            includeExhausted === 'true'
        );

        if (!result.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(result);
        }

        return res.status(StatusCodes.OK).json(result);
    } catch (error) {
        console.error('[BatchController] getBatchesByMaterial error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message,
            data: null
        });
    }
};

export const getExpiringBatches = async (req, res) => {
    try {
        const { days } = req.query;
        const daysAhead = parseInt(days) || 30;

        const result = await fifoService.getExpiringBatches(daysAhead);

        if (!result.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(result);
        }

        return res.status(StatusCodes.OK).json(result);
    } catch (error) {
        console.error('[BatchController] getExpiringBatches error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message,
            data: null
        });
    }
};

export const getMaterialStockFromBatches = async (req, res) => {
    try {
        const { materialId } = req.params;

        const result = await fifoService.getMaterialStockFromBatches(materialId);

        if (!result.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(result);
        }

        return res.status(StatusCodes.OK).json(result);
    } catch (error) {
        console.error('[BatchController] getMaterialStockFromBatches error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message,
            data: null
        });
    }
};

export const reconcileStock = async (req, res) => {
    try {
        const { materialId } = req.params;

        const result = await fifoService.reconcileMaterialStock(materialId);

        if (!result.success) {
            return res.status(StatusCodes.BAD_REQUEST).json(result);
        }

        return res.status(StatusCodes.OK).json(result);
    } catch (error) {
        console.error('[BatchController] reconcileStock error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message,
            data: null
        });
    }
};

export const traceBatch = async (req, res) => {
    try {
        const { batchNumber } = req.params;

        const result = await fifoService.traceBatchByNumber(batchNumber);

        if (!result.success) {
            return res.status(StatusCodes.NOT_FOUND).json(result);
        }

        return handleServiceResponse(res, result);
    } catch (error) {
        console.error('[BatchController] traceBatch error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message,
            data: null
        });
    }
};

export const getActiveBatches = async (req, res) => {
    try {
        const result = await fifoService.getActiveBatches(req.query);
        return handleServiceResponse(res, result);
    } catch (error) {
        console.error('[BatchController] getActiveBatches error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message,
            data: null
        });
    }
};

export const assignLocation = async (req, res) => {
    try {
        const { batchId } = req.params;
        const { shelfId, note } = req.body;
        const userId = req.userId;

        if (!batchId || !shelfId) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Batch ID and Shelf ID are required',
                data: null
            });
        }

        const result = await fifoService.assignBatchLocation(batchId, shelfId, userId, note);
        return handleServiceResponse(res, result);
    } catch (error) {
        console.error('[BatchController] assignLocation error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message,
            data: null
        });
    }
};
