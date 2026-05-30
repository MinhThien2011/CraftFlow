import { StatusCodes } from "http-status-codes";
import {
    createPurchaseOrderService,
    deletePurchaseOrderService,
    getAllPurchaseOrdersByIdService,
    getAllPurchaseOrdersService,
    updatePurchaseOrderService,
    updatePurchaseOrderStatusService
} from "../services/purchaseOrderService.js";
import { logActivity } from "../utils/logger.js";
import { clearCacheByPattern, getCachedData, setCachedData } from "../utils/redisFetching.js";
import { handleServiceResponse } from "../utils/responseHelper.js";
import {
    purchaseOrderValidator,
    updateStatusPurchaseOrderValidator
} from "../validations/PurchaseOrderValidation.js";

export const createPurchaseOrder = async (req, res) => {
    try {
        const { error, value } = purchaseOrderValidator(req.body);
        if (error) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: 'error',
                message: 'Validation failed',
                errors: error.details.map(d => d.message)
            });
        }

        const result = await createPurchaseOrderService(value, req.userId);
        if (result.success) {
            // Invalidate list cache
            await clearCacheByPattern('purchaseOrder:list:*');

            await logActivity({
                author: req.userId,
                action: 'CREATE_PURCHASE_ORDER',
                module: 'PURCHASE_ORDER',
                details: `Production manager created purchase order: ${result.data._id}`,
                targetId: result.data._id,
                metadata: { status: result.data.status }
            }, req, true);
        }

        return handleServiceResponse(res, result, StatusCodes.CREATED);
    } catch (error) {
        console.error('[createPurchaseOrder] error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: "Internal server error: " + error.message,
            data: null
        });
    }
}

export const updatePurchaseOrderStatus = async (req, res) => {
    try {
        const purchaseOrderId = req.params?.id;
        const { error, value } = updateStatusPurchaseOrderValidator(req.body);
        if (error) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: 'error',
                message: 'Validation failed',
                errors: error.details.map(d => d.message)
            });
        }

        const result = await updatePurchaseOrderStatusService(purchaseOrderId, {
            status: value.status,
            adminNotes: value.adminNotes
        }, req.userId);

        if (result.success) {
            await clearCacheByPattern('purchaseOrder:list:*');

            await logActivity({
                author: req.userId,
                action: 'UPDATE_PURCHASE_ORDER_STATUS',
                module: 'PURCHASE_ORDER',
                details: `Admin updated purchase order status: ${result.data._id}`,
                targetId: result.data._id,
                metadata: { status: result.data.status, adminNotes: result.data.adminNotes }
            }, req);
        }

        return handleServiceResponse(res, result);
    } catch (error) {
        console.error('[updatePurchaseOrderStatus] error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: "Internal server error: " + error.message,
            data: null
        });
    }
}

export const updatePurchaseOrder = async (req, res) => {
    try {
        const purchaseOrderId = req.body.id;
        const { error, value } = purchaseOrderValidator(req.body);
        if (error) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: 'error',
                message: 'Validation failed',
                errors: error.details.map(d => d.message)
            });
        }

        const result = await updatePurchaseOrderService(purchaseOrderId, value);
        if (result.success) {
            // Invalidate list cache
            await clearCacheByPattern('purchaseOrder:list:*');

            await logActivity({
                author: req.userId,
                action: 'UPDATE_PURCHASE_ORDER',
                module: 'PURCHASE_ORDER',
                details: `Production manager updated purchase order: ${result.data._id}`,
                targetId: result.data._id,
                metadata: { status: result.data.status }
            }, req);
        }

        return handleServiceResponse(res, result);
    } catch (error) {
        console.error('[updatePurchaseOrder] error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: "Internal server error: " + error.message,
            data: null
        });
    }
}

export const deletePurchaseOrder = async (req, res) => {
    try {
        const purchaseOrderId = req.params.id;
        const result = await deletePurchaseOrderService(purchaseOrderId);
        if (result.success) {
            // Invalidate list cache
            await clearCacheByPattern('purchaseOrder:list:*');

            if (result.data?._id) {
                await logActivity({
                    author: req.userId,
                    action: 'DELETE_PURCHASE_ORDER',
                    module: 'PURCHASE_ORDER',
                    details: `Purchase order deleted: ${result.data._id}`,
                    targetId: result.data._id,
                    metadata: { status: result.data.status }
                }, req);
            }
        }

        return handleServiceResponse(res, result);
    } catch (error) {
        console.error('[deletePurchaseOrder] error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: "Internal server error: " + error.message,
            data: null
        });
    }
}

export const getPurchaseOrderById = async (req, res) => {
    try {
        const result = await getAllPurchaseOrdersByIdService(req.params.id);
        return handleServiceResponse(res, result);
    } catch (error) {
        console.error('[getPurchaseOrderById] error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: "Internal server error: " + error.message,
            data: null
        });
    }
}

export const getAllPurchaseOrders = async (req, res) => {
    try {
        const { creator, status, page = 1, limit = 10, cursor, withTotal } = req.query;
        const cacheKey = `purchaseOrder:list:${JSON.stringify({ creator, status, page, limit, cursor, withTotal })}`;

        // 1. Try to get from Redis
        const cachedResult = await getCachedData(cacheKey);
        if (cachedResult) {
            return res.status(StatusCodes.OK).json({
                success: true,
                message: 'Purchase orders retrieved successfully (from cache)',
                data: cachedResult
            });
        }

        // 2. If not in cache, get from Service
        const result = await getAllPurchaseOrdersService(req.query);

        // 3. Cache the result if successful
        if (result.success) {
            setCachedData(cacheKey, result.data).catch(() => {});
        }

        return handleServiceResponse(res, result);
    } catch (error) {
        console.error('[getAllPurchaseOrders] error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: "Internal server error: " + error.message,
            data: null
        });
    }
}
