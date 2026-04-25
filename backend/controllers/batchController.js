import * as fifoService from '../services/fifoService.js';
import { StatusCodes } from 'http-status-codes';

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
            status: 'error',
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
            status: 'error',
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
            status: 'error',
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
            status: 'error',
            message: error.message,
            data: null
        });
    }
};
