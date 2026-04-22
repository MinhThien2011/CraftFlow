import * as importExportSlipService from "../services/importExportSlipService.js";
import { INVENTORY_IMPORT_EXPORT_SLIP_STATUS } from "../utils/constants.js";
import { logActivity } from "../utils/logger.js";
import { slipValidatior, receivedStatusValidation } from "../validations/SlipValidation.js";

export const createImportExportSlip = async (req, res) => {
    try {
        const userId = req.userId;
        const { error, value } = slipValidatior(req.body);
        if (error) {
            return res.status(400).json({ error: error.details.map(d => d.message) });
        }

        const slip = await importExportSlipService.createSlipService(value, userId);
        res.status(201).json(slip);
        setImmediate(async () => {
            await logActivity({
                author: userId,
                action: 'CREATE_IMPORT_EXPORT_SLIP',
                module: 'IMPORT_EXPORT_SLIP',
                details: `User ${userId} created import/export slip: ${slip._id}`,
                targetId: slip._id,
                metadata: { status: slip.status }
            }, req);
        })
    } catch (error) {
        res.status(400).json({ error: 'Failed to create import/export slip: ' + error.message });
    }
};

export const updateSlipStatus = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        let validatedData = req.body;

        // Specific validation for RECEIVED status (QR/Barcode scanning)
        if (status === INVENTORY_IMPORT_EXPORT_SLIP_STATUS.RECEIVED) {
            const { error, value } = receivedStatusValidation(req.body);
            if (error) {
                return res.status(400).json({ error: error.details.map(d => d.message) });
            }
            validatedData = value;
        }

        const { slip, warnings } = await importExportSlipService.updateSlipStatusService(id, status, validatedData, userId);

        res.status(200).json({
            success: true,
            data: slip,
            warnings: warnings.length > 0 ? warnings : undefined
        });
        setImmediate(async () => {
            await logActivity({
                author: userId,
                action: 'UPDATE_SLIP_STATUS',
                module: 'IMPORT_EXPORT_SLIP',
                details: `User ${userId} updated slip status to ${status}`,
                targetId: slip._id,
                metadata: { status }
            }, req);
        })
    } catch (error) {
        res.status(400).json({ error: 'Failed to update slip status: ' + error.message });
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
            status,
            slipNumber,
            personName,
            reason,
            warehouseName,
            startDate,
            endDate,
            creator,
            materialId,
            productId
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
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
        }
        const result = await importExportSlipService.getAllSlipsService(query);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: 'Failed to retrieve slips: ' + error.message });
    }
};