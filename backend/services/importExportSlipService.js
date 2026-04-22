import { generateSlipNumber } from "../utils/slipHelper.js";
import InventoryImportExportSlip from "../models/InventoryImportExportSlip.js";
import Material from "../models/Material.js";
import Product from "../models/Product.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import { INVENTORY_IMPORT_EXPORT_SLIP_STATUS, INVENTORY_IMPORT_EXPORT_SLIP_TYPE, TRANSACTION_TYPE } from "../utils/constants.js";


export const createSlipService = async (data, userId) => {
    try {
        if (!data.slipNumber) {
            // Generate a new slip number if not provided
            data.slipNumber = await generateSlipNumber(data.type);
        }

        const slipData = {
            ...data,
            status: INVENTORY_IMPORT_EXPORT_SLIP_STATUS.PENDING,
            signatures: {
                ...(data.signatures || {}),
                creator: userId
            }
        };

        const slip = await InventoryImportExportSlip.create(slipData);
        return { success: true, data: slip, message: 'Slip created successfully' };
    } catch (error) {
        console.log('[createSlipService] error:', error);
        return { success: false, message: 'Failed to create slip: ' + error.message, data: null };
    }
};

export const updateSlipStatusService = async (slipId, newStatus, updateData, userId) => {
    try {
        const slip = await InventoryImportExportSlip.findById(slipId);
        if (!slip) throw new Error('Slip not found');

        const validTransitions = {
            [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.PENDING]: [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.RECEIVED],
            [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.RECEIVED]: [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.INSPECTED],
            [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.INSPECTED]: [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.IN_STOCK],
            [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.IN_STOCK]: []
        };

        if (!validTransitions[slip.status].includes(newStatus)) {
            throw new Error(`Invalid status transition from ${slip.status} to ${newStatus}`);
        }

        let warnings = [];

        // --- Handle RECEIVED Status (QR/Barcode scanning step) ---
        if (newStatus === INVENTORY_IMPORT_EXPORT_SLIP_STATUS.RECEIVED) {
            const { scannedItems } = updateData;
            if (!scannedItems || !Array.isArray(scannedItems)) {
                throw new Error('scannedItems array is required for RECEIVED status');
            }
            const slipItemsMap = new Map(slip.items.map(item => [item.itemCode, item]));
            const processedCodes = new Set();

            for (const scanned of scannedItems) {
                const slipItem = slipItemsMap.get(scanned.itemCode);

                if (!slipItem) {
                    warnings.push(`Item code ${scanned.itemCode} was not in the original request.`);
                    continue;
                }
                slipItem.quantity.actual = scanned.actualQuantity;
                processedCodes.add(scanned.itemCode);

                if (scanned.actualQuantity !== slipItem.quantity.requested) {
                    warnings.push(`Quantity discrepancy for ${scanned.itemCode}: Requested ${slipItem.quantity.requested}, Received ${scanned.actualQuantity}`);
                }
            }

            // Check for missing items
            for (const item of slip.items) {
                if (!processedCodes.has(item.itemCode)) {
                    warnings.push(`Item ${item.itemCode} was requested but not scanned.`);
                }
            }

            if (!slip.signatures.storekeeper) {
                slip.signatures.storekeeper = userId;
            }
        }

        // --- Handle IN_STOCK Status (Finalize & Update Inventory) ---
        if (newStatus === INVENTORY_IMPORT_EXPORT_SLIP_STATUS.IN_STOCK) {
            await finalizeInventoryUpdate(slip, userId);
        }

        if (updateData.signatures) {
            slip.signatures = { ...slip.signatures.toObject(), ...updateData.signatures };
        }
        if (updateData.images) {
            slip.images = [...new Set([...slip.images, ...updateData.images])];
        }
        if (updateData.notes) {
            slip.notes = updateData.notes;
        }

        slip.status = newStatus;
        await slip.save();

        return {
            success: true, message: "Slip status updated successfully", data: {
                slip, warnings
            }
        }
    } catch (error) {
        console.log('[updateSlipStatusService] error:', error);
        return { success: false, message: 'Failed to update slip status: ' + error.message, data: null };
    }
};

/**
 * Internal helper to update inventory levels and create transactions
 * Optimized with Promise.all for performance
 */
async function finalizeInventoryUpdate(slip, userId) {
    const updatePromises = slip.items.map(async (item) => {
        const Model = item.material ? Material : (item.product ? Product : null);
        if (!Model) return;

        const entityId = item.material || item.product;
        const doc = await Model.findById(entityId);
        if (!doc) return;

        const beforeStock = doc.currentStock;
        const change = item.quantity.actual;

        if (slip.type === INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT) {
            doc.currentStock += change;
        } else {
            doc.currentStock -= change;
        }

        await doc.save();

        // Determine transaction type
        let transType;
        if (slip.type === INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT) {
            transType = TRANSACTION_TYPE.PRODUCTION_IN;
        } else {
            transType = TRANSACTION_TYPE.SALES_OUT;
        }

        return InventoryTransaction.create({
            [item.material ? 'material' : 'product']: entityId,
            type: transType,
            quantity: change,
            beforeStock,
            afterStock: doc.currentStock,
            performedBy: userId,
            note: `Finalized via slip ${slip.slipNumber}`,
            orderRef: slip.slipNumber
        });
    });

    await Promise.all(updatePromises);
}

export const getSlipByIdService = async (id) => {
    try {
        const inventorySlips = await InventoryImportExportSlip.findById(id)
            .populate('signatures.creator', 'name email')
            .populate('signatures.storekeeper', 'name email')
            .populate('items.material')
            .populate('items.product');

        return { success: true, message: "get slip by id successfully", data: inventorySlips }
    } catch (error) {
        console.log('[getSlipByIdService] error:', error);
        return { success: false, message: 'Failed to retrieve slip by ID: ' + error.message, data: null };
    }
};

export const getAllSlipsService = async (query = {}) => {
    try {
        const {
            page = 1,
            limit = 10,
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
            productId
        } = query;
        const skip = (page - 1) * limit;

        const filter = {};

        // Exact match
        if (type) filter.type = type;
        if (status) filter.status = status;
        if (creator) filter['signatures.creator'] = creator;

        // Partial text search (regex)
        if (slipNumber) filter.slipNumber = { $regex: slipNumber, $options: 'i' };
        if (personName) filter.personName = { $regex: personName, $options: 'i' };
        if (reason) filter.reason = { $regex: reason, $options: 'i' };
        if (warehouseName) filter['warehouse.name'] = { $regex: warehouseName, $options: 'i' };

        // Date range search
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        // Search by items
        if (materialId) filter['items.material'] = materialId;
        if (productId) filter['items.product'] = productId;

        const [slips, total] = await Promise.all([
            InventoryImportExportSlip.find(filter)
                .skip(skip)
                .limit(parseInt(limit))
                .populate('signatures.creator', 'name email')
                .populate('signatures.storekeeper', 'name email')
                .sort({ createdAt: -1 }),
            InventoryImportExportSlip.countDocuments(filter)
        ]);

        return {
            success: true,
            message: "get all slips successfully",
            data: {
                slips,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit)
                }
            }
        };
    } catch (error) {
        console.log('[getAllSlipsService] error:', error);
        return { success: false, message: 'Failed to retrieve slips: ' + error.message, data: null };
    }
};