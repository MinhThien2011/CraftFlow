import * as importExportSlipService from "../services/importExportSlipService.js";
import { INVENTORY_IMPORT_EXPORT_SLIP_STATUS } from "../utils/constants.js";
import { logActivity } from "../utils/logger.js";
import { slipUpdateStatusValidator, slipValidatior } from "../validations/slipValidation.js";

export const createImportExportSlip = async (req, res) => {
    try {
        const userId = req.userId;
        const { error, value } = slipValidatior(req.body);
        if (error) {
            return res.status(400).json({
                status: 'error',
                message: 'Dữ liệu không hợp lệ.',
                details: error.details.map(d => d.message)
            });
        }

        const slipResult = await importExportSlipService.createSlipService(value, userId);
        if (!slipResult.success) {
            return res.status(400).json({
                status: 'error',
                message: slipResult.message
            });
        }

        res.status(201).json(slipResult);

        await logActivity({
            author: userId,
            action: 'CREATE_IMPORT_EXPORT_SLIP',
            module: 'IMPORT_EXPORT_SLIP',
            details: `User ${userId} created import/export slip: ${slipResult.data._id}`,
            targetId: slipResult.data._id,
            metadata: { status: slipResult.data.status }
        }, req, true);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Lỗi hệ thống khi tạo phiếu: ' + error.message
        });
    }
};

export const updateSlipByManager = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        const result = await importExportSlipService.updateSlipByManagerService(id, req.body, userId);

        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }

        // Log detailed changes
        if (result.changes && result.changes.length > 0) {
            await logActivity({
                author: userId,
                action: 'UPDATE_IMPORT_EXPORT_SLIP_DETAILS',
                module: 'IMPORT_EXPORT_SLIP',
                details: `User ${userId} updated slip ${id} fields: ${result.changes.map(c => c.field).join(', ')}`,
                targetId: id,
                metadata: { changes: result.changes }
            }, req, true);
        }

        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: 'Failed to update slip details: ' + error.message });
    }
};

export const updateSlipStatus = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        const { error, value } = slipUpdateStatusValidator(req.body);
        if (error) {
            return res.status(400).json({ error: error.details.map(d => d.message) });
        }

        const { status } = value;
        const result = await importExportSlipService.updateSlipStatusService(id, status, value, userId);

        if (result.success) {
            const { slip, warnings } = result.data;

            await logActivity({
                author: userId,
                action: 'UPDATE_IMPORT_EXPORT_SLIP_STATUS',
                module: 'IMPORT_EXPORT_SLIP',
                details: `User ${userId} updated slip ${id} status to ${status}`,
                targetId: id,
                metadata: { status, warnings: warnings?.length > 0 ? warnings : undefined }
            }, req, true);

            return res.status(200).json({
                success: true,
                data: slip,
                warnings: warnings?.length > 0 ? warnings : undefined
            });
        }

        return res.status(400).json({ success: false, message: result.message || 'Failed to update slip status', data: result.data });

    } catch (error) {
        console.error('[updateSlipStatus] unexpected error:', error);
        return res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};

export const getSlipById = async (req, res) => {
    try {
        const { id } = req.params;
        const slip = await importExportSlipService.getSlipByIdService(id);
        if (!slip) {
            return res.status(404).json({ error: 'Slip not found' });
        }
        res.status(200).json(slip);
    } catch (error) {
        res.status(400).json({ error: 'Failed to retrieve slip by id: ' + error.message });
    }
};

export const getAllSlips = async (req, res) => {
    try {
        const {
            type,
            page,
            limit,
            cursor,
            withTotal,
            status,
            slipNumber,
            personName,
            reason,
            warehouseName,
            startDate,
            endDate,
            creator,
            materialId,
            productId,
            category
        } = req.query;

        const query = {
            type,
            status,
            slipNumber,
            personName,
            reason,
            warehouseName,
            startDate,
            endDate,
            creator,
            materialId,
            productId,
            category,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            cursor,
            withTotal,
        }
        const result = await importExportSlipService.getAllSlipsService(query);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: 'Failed to retrieve slips: ' + error.message });
    }
};

export const uploadSlipImages = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const imageUrls = req.imageUrls || req.body.images; // Support both middleware and direct URLs

        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return res.status(400).json({ error: 'At least one image is required' });
        }

        const result = await importExportSlipService.uploadSlipImagesService(id, imageUrls, userId);

        if (result.success) {
            await logActivity({
                author: userId,
                action: 'UPLOAD_SLIP_IMAGES',
                module: 'IMPORT_EXPORT_SLIP',
                details: `User ${userId} uploaded images for slip ${id}. Late: ${result.data.isImageUploadLate}`,
                targetId: id,
                metadata: { isLate: result.data.isImageUploadLate }
            }, req, true);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error('[uploadSlipImages] error:', error);
        return res.status(500).json({ error: 'Failed to upload slip images: ' + error.message });
    }
};

export const getSlipFifoAudit = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await importExportSlipService.getSlipFifoAuditService(id);
        if (!result.success) {
            return res.status(400).json(result);
        }
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to retrieve FIFO audit: ' + error.message, data: null });
    }
};

export const getSlipFifoHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await importExportSlipService.getSlipFifoHistoryService(id);
        if (!result.success) {
            return res.status(400).json(result);
        }
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to retrieve FIFO history: ' + error.message, data: null });
    }
};
