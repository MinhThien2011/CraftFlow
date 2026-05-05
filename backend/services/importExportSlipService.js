import { generateSlipNumber } from "../utils/slipHelper.js";
import InventoryImportExportSlip from "../models/InventoryImportExportSlip.js";
import Material from "../models/Material.js";
import Product from "../models/Product.js";
import ProductionOrder from "../models/ProductionOrder.js";
import MaterialRequisition from "../models/MaterialRequisition.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import Shelf from "../models/Shelf.js";
import {
    INVENTORY_IMPORT_EXPORT_SLIP_STATUS,
    INVENTORY_IMPORT_EXPORT_SLIP_TYPE,
    TRANSACTION_TYPE,
    REQUISITION_STATUS,
    REQUISITION_TYPE
} from "../utils/constants.js";
import { updateShelfLoad } from "./shelfService.js";
import { createBatchesFromImport, generateBatchNumber, allocateBatchesForMaterial, allocateBatchesForItem } from "./fifoService.js";
import { autoUpdateInsufficientOrders } from "./productionOrderService.js";
import inventoryEvents from "../events/inventoryEvents.js";
import mongoose from "mongoose";


import { ServiceResponse } from "../utils/serviceHelper.js";

export const createSlipService = async (data, userId, session = null) => {
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

        const [slip] = await InventoryImportExportSlip.create([slipData], { session });
        return ServiceResponse(true, 'Slip created successfully', slip, 201);
    } catch (error) {
        console.log('[createSlipService] error:', error);
        return ServiceResponse(false, 'Failed to create slip: ' + error.message);
    }
};

export const updateSlipByManagerService = async (slipId, updateData, userId, session = null) => {
    try {
        const slip = await InventoryImportExportSlip.findById(slipId).session(session);
        if (!slip) throw new Error('Slip not found');

        // Fields allowed to be updated by Manager (excluding items)
        const allowedFields = [
            'date', 'unit', 'department', 'accounting',
            'personName', 'addressOrDepartment', 'reason',
            'warehouse', 'referenceDoc', 'notes', 'totalAmountInWords', 'originalDocsCount'
        ];

        let hasChanges = false;
        const changes = [];

        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                const oldValue = JSON.stringify(slip[field]);
                const newValue = JSON.stringify(updateData[field]);

                if (oldValue !== newValue) {
                    changes.push({
                        field,
                        oldValue: slip[field],
                        newValue: updateData[field]
                    });
                    slip[field] = updateData[field];
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            await slip.save({ session });
        }

        return ServiceResponse(true, hasChanges ? 'Slip updated successfully' : 'No changes detected', slip);
    } catch (error) {
        console.log('[updateSlipByManagerService] error:', error);
        return ServiceResponse(false, 'Failed to update slip: ' + error.message);
    }
};

/**
 * Internal helper to handle Material inventory updates.
 */
async function processMaterialUpdate(item, slip, userId, session, transactionDocs, warnings) {
    const material = await Material.findById(item.material).session(session);
    if (!material) {
        warnings.push(`Material ${item.material} not found, skipping.`);
        return;
    }

    let beforeStock = material.currentStock;
    const quantity = item.quantity.actual;

    if (slip.type === INVENTORY_IMPORT_EXPORT_SLIP_TYPE.EXPORT) {
        const fifoResult = await allocateBatchesForMaterial(item.material, quantity, session);
        if (!fifoResult.success) throw new Error(`FIFO failed for ${material.code}: ${fifoResult.message}`);

        for (const allocation of fifoResult.data) {
            transactionDocs.push({
                material: item.material,
                type: TRANSACTION_TYPE.SALES_OUT,
                quantity: -allocation.quantityAllocated,
                beforeStock,
                afterStock: beforeStock - allocation.quantityAllocated,
                performedBy: userId,
                note: `FIFO via ${slip.slipNumber}. Batch: ${allocation.batchNumber}`,
                orderRef: slip.slipNumber,
                batch: allocation.batch
            });
            beforeStock -= allocation.quantityAllocated;
        }
        material.currentStock -= quantity;
    } else {
        material.currentStock += quantity;
        if (item.shelf) material.shelf = item.shelf;
        transactionDocs.push({
            material: item.material,
            type: TRANSACTION_TYPE.PRODUCTION_IN,
            quantity,
            beforeStock,
            afterStock: material.currentStock,
            performedBy: userId,
            note: `Import via ${slip.slipNumber}`,
            orderRef: slip.slipNumber
        });
    }
    await material.save({ session });
    if (material.shelf) await updateShelfLoad(material.shelf);
}

/**
 * Internal helper to handle Product inventory updates.
 */
async function processProductUpdate(item, slip, userId, session, transactionDocs, warnings) {
    const product = await Product.findById(item.product).session(session);
    if (!product) {
        warnings.push(`Product ${item.product} not found, skipping.`);
        return;
    }

    let beforeStock = product.currentStock;
    const quantity = item.quantity.actual;

    if (slip.type === INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT) {
        product.currentStock += quantity;
        if (item.shelf) product.shelf = item.shelf;
        transactionDocs.push({
            product: item.product,
            type: TRANSACTION_TYPE.PRODUCTION_IN,
            quantity,
            beforeStock,
            afterStock: product.currentStock,
            performedBy: userId,
            note: `Product import via ${slip.slipNumber}`,
            orderRef: slip.slipNumber
        });
    } else {
        const fifoResult = await allocateBatchesForItem({ productId: item.product, quantityNeeded: quantity, session });
        if (!fifoResult.success) throw new Error(`FIFO failed for product ${product.code}: ${fifoResult.message}`);

        for (const allocation of fifoResult.data) {
            transactionDocs.push({
                product: item.product,
                type: TRANSACTION_TYPE.SALES_OUT,
                quantity: -allocation.quantityAllocated,
                beforeStock,
                afterStock: beforeStock - allocation.quantityAllocated,
                performedBy: userId,
                note: `FIFO product via ${slip.slipNumber}. Batch: ${allocation.batchNumber}`,
                orderRef: slip.slipNumber,
                batch: allocation.batch
            });
            beforeStock -= allocation.quantityAllocated;
        }
        product.currentStock -= quantity;
    }
    await product.save({ session });
    if (product.shelf) await updateShelfLoad(product.shelf);
}

/**
 * Standardize slip status update with clean SRP.
 */
export const updateSlipStatusService = async (slipId, newStatus, updateData, userId) => {
    try {
        const slip = await InventoryImportExportSlip.findById(slipId);
        if (!slip) return ServiceResponse(false, 'Slip not found');

        const isImport = slip.type === INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT;
        const currentStatus = slip.status.trim();
        const targetStatus = newStatus.trim();

        // --- 1. Validate Status Transition ---
        const validTransitions = isImport ? {
            [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.PENDING]: [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.RECEIVED, INVENTORY_IMPORT_EXPORT_SLIP_STATUS.CANCELLED],
            [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.RECEIVED]: [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.INSPECTED, INVENTORY_IMPORT_EXPORT_SLIP_STATUS.CANCELLED],
            [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.INSPECTED]: [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.IN_STOCK, INVENTORY_IMPORT_EXPORT_SLIP_STATUS.CANCELLED],
            [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.IN_STOCK]: [],
            [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.CANCELLED]: []
        } : {
            [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.PENDING]: [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.RECEIVED, INVENTORY_IMPORT_EXPORT_SLIP_STATUS.CANCELLED],
            [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.RECEIVED]: [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.INSPECTING, INVENTORY_IMPORT_EXPORT_SLIP_STATUS.CANCELLED],
            [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.INSPECTING]: [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.COMPLETED, INVENTORY_IMPORT_EXPORT_SLIP_STATUS.CANCELLED],
            [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.COMPLETED]: [],
            [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.CANCELLED]: []
        };

        if (!validTransitions[currentStatus]?.includes(targetStatus)) {
            return ServiceResponse(false, `Invalid status transition from ${currentStatus} to ${targetStatus} for ${slip.type} slip`);
        }

        // --- 2. Data Validation & Integrity Checks ---
        const inputItems = [...(updateData.items || []), ...(updateData.scannedItems || [])];

        const slipItemIdentifiers = new Set();
        slip.items.forEach(item => {
            if (item.itemCode) slipItemIdentifiers.add(item.itemCode.toString());
            if (item.material) slipItemIdentifiers.add(item.material.toString());
            if (item.product) slipItemIdentifiers.add(item.product.toString());
        });

        for (const item of inputItems) {
            const identifier = item.itemCode || item.material || item.product;
            if (!identifier || !slipItemIdentifiers.has(identifier.toString())) {
                return ServiceResponse(false, `Item identifier '${identifier || 'unknown'}' in update data does not match any item in slip ${slip.slipNumber}`);
            }
        }

        if (targetStatus === INVENTORY_IMPORT_EXPORT_SLIP_STATUS.RECEIVED) {
            if (inputItems.length === 0) return ServiceResponse(false, 'Update data must contain items when transitioning to RECEIVED status');
            for (const item of inputItems) {
                if (item.provisionalQuantity === undefined || item.provisionalQuantity === null || item.provisionalQuantity < 0) {
                    return ServiceResponse(false, `Item ${item.itemCode || 'at identifier ' + (item.material || item.product)} is missing valid provisionalQuantity`);
                }
            }
        }

        if (targetStatus === INVENTORY_IMPORT_EXPORT_SLIP_STATUS.INSPECTED || targetStatus === INVENTORY_IMPORT_EXPORT_SLIP_STATUS.INSPECTING) {
            if (inputItems.length === 0) return ServiceResponse(false, 'Update data must contain items when transitioning to INSPECTED status');
            for (const item of inputItems) {
                if (item.actualQuantity === undefined || item.actualQuantity === null || item.actualQuantity < 0) {
                    return ServiceResponse(false, `Item ${item.itemCode || 'at identifier ' + (item.material || item.product)} is missing valid actualQuantity`);
                }
            }
        }

        let warnings = [];
        const updatesMap = new Map();
        inputItems.forEach(item => {
            const qty = item.actualQuantity ?? item.provisionalQuantity;
            const itemData = { quantity: qty, itemNote: item.itemNote, batchNumber: item.batchNumber, expirationDate: item.expirationDate, shelf: item.shelf };
            if (item.itemCode) updatesMap.set(item.itemCode.toString(), itemData);
            if (item.material) updatesMap.set(item.material.toString(), itemData);
            if (item.product) updatesMap.set(item.product.toString(), itemData);
        });

        for (const slipItem of slip.items) {
            const updateInfo = updatesMap.get(slipItem.itemCode) ?? updatesMap.get(slipItem.material?.toString()) ?? updatesMap.get(slipItem.product?.toString());
            if (updateInfo) {
                if (targetStatus === INVENTORY_IMPORT_EXPORT_SLIP_STATUS.RECEIVED) slipItem.quantity.provisional = updateInfo.quantity;
                else if (targetStatus === INVENTORY_IMPORT_EXPORT_SLIP_STATUS.INSPECTED || targetStatus === INVENTORY_IMPORT_EXPORT_SLIP_STATUS.INSPECTING) {
                    slipItem.quantity.actual = updateInfo.quantity;
                    if (slipItem.quantity.actual !== slipItem.quantity.requested) warnings.push(`Số lượng lệch cho mã ${slipItem.itemCode}: Yêu cầu ${slipItem.quantity.requested}, Thực tế ${slipItem.quantity.actual}`);
                }
                if (updateInfo.itemNote) slipItem.itemNote = updateInfo.itemNote;
                if (isImport && (targetStatus === INVENTORY_IMPORT_EXPORT_SLIP_STATUS.INSPECTED)) {
                    slipItem.batchNumber = updateInfo.batchNumber || slipItem.batchNumber || await generateBatchNumber(slipItem.itemCode);
                    if (updateInfo.expirationDate) slipItem.expirationDate = updateInfo.expirationDate;
                    if (updateInfo.shelf) slipItem.shelf = updateInfo.shelf;
                    else if (!slipItem.shelf) {
                        const Model = slipItem.material ? Material : (slipItem.product ? Product : null);
                        if (Model) {
                            const doc = await Model.findById(slipItem.material || slipItem.product).select('shelf');
                            if (doc?.shelf) slipItem.shelf = doc.shelf;
                        }
                    }
                }
            }
        }

        if (targetStatus === INVENTORY_IMPORT_EXPORT_SLIP_STATUS.IN_STOCK || targetStatus === INVENTORY_IMPORT_EXPORT_SLIP_STATUS.COMPLETED) {
            const zeroActualItems = slip.items.filter(item => item.quantity.actual === 0);
            if (zeroActualItems.length > 0) return ServiceResponse(false, `Cannot complete slip while there are items with actual quantity 0: ${zeroActualItems.map(i => i.itemCode).join(', ')}`);
        }

        if (targetStatus === INVENTORY_IMPORT_EXPORT_SLIP_STATUS.RECEIVED && !slip.signatures.storekeeper) {
            slip.signatures.storekeeper = userId;
        }

        slip.status = targetStatus;

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (targetStatus === INVENTORY_IMPORT_EXPORT_SLIP_STATUS.IN_STOCK || targetStatus === INVENTORY_IMPORT_EXPORT_SLIP_STATUS.COMPLETED) {
                if (isImport) {
                    await createBatchesFromImport({
                        items: slip.items.map(item => ({
                            material: item.material,
                            product: item.product,
                            itemCode: item.itemCode,
                            unit: item.unit,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            batchNumber: item.batchNumber,
                            expirationDate: item.expirationDate,
                            shelf: item.shelf
                        })),
                        relatedPurchaseOrder: slip.relatedPurchaseOrder,
                        relatedImportSlip: slip._id,
                        relatedProductionOrder: slip.relatedProductionOrder
                    }, session);
                }

                const transactionDocs = [];
                for (const item of slip.items) {
                    if (item.material) await processMaterialUpdate(item, slip, userId, session, transactionDocs, warnings);
                    else if (item.product) await processProductUpdate(item, slip, userId, session, transactionDocs, warnings);
                }

                if (transactionDocs.length > 0) await InventoryTransaction.create(transactionDocs, { session });

                inventoryEvents.emit('inventory_finalized', { slip, userId, session });

                slip.finalizedAt = new Date();
                if (isImport) slip.inStockAt = slip.finalizedAt;
            }

            await slip.save({ session });
            await session.commitTransaction();
            return ServiceResponse(true, `Slip updated to ${targetStatus}`, { slip, warnings });
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    } catch (error) {
        console.error('[updateSlipStatusService] error:', error);
        return ServiceResponse(false, error.message);
    }
};

export const uploadSlipImagesService = async (slipId, imageUrls, userId) => {
    try {
        const slip = await InventoryImportExportSlip.findById(slipId);
        if (!slip) throw new Error('Slip not found');

        // Only allow image upload for Import slips when they are IN_STOCK
        if (slip.type === INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT && slip.status !== INVENTORY_IMPORT_EXPORT_SLIP_STATUS.IN_STOCK) {
            console.log('[uploadSlipImagesService] error:', 'Only IN_STOCK slips can have images uploaded');
            return { success: false, message: 'Only IN_STOCK slips can have images uploaded', data: null };
        }

        // Only allow image upload for Export slips when they are COMPLETED
        if (slip.type === INVENTORY_IMPORT_EXPORT_SLIP_TYPE.EXPORT && slip.status !== INVENTORY_IMPORT_EXPORT_SLIP_STATUS.COMPLETED) {
            console.log('[uploadSlipImagesService] error:', 'Only COMPLETED slips can have images uploaded');
            return { success: false, message: 'Only COMPLETED slips can have images uploaded', data: null };
        }

        const uploadTime = new Date();

        // If status is IN_STOCK or COMPLETED, check the 3-day deadline
        const finalizedAt = slip.inStockAt || slip.finalizedAt;
        if ((slip.status === INVENTORY_IMPORT_EXPORT_SLIP_STATUS.IN_STOCK || slip.status === INVENTORY_IMPORT_EXPORT_SLIP_STATUS.COMPLETED) && finalizedAt) {
            const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
            const deadline = new Date(finalizedAt.getTime() + threeDaysInMs);

            if (uploadTime > deadline) {
                slip.isImageUploadLate = true;
                console.log(`[ImportExportSlip] Image upload for slip ${slip.slipNumber} is LATE.`);
            }
        }

        slip.images = [...new Set([...slip.images, ...imageUrls])];
        slip.imageUploadedAt = uploadTime;

        // Automatically change status to VERIFIED for completed export slips upon image upload
        if (slip.type === INVENTORY_IMPORT_EXPORT_SLIP_TYPE.EXPORT && slip.status === INVENTORY_IMPORT_EXPORT_SLIP_STATUS.COMPLETED) {
            slip.status = INVENTORY_IMPORT_EXPORT_SLIP_STATUS.VERIFIED;
            console.log(`[ImportExportSlip] Slip ${slip.slipNumber} marked as VERIFIED after image upload.`);
        }

        await slip.save();

        return {
            success: true,
            message: slip.isImageUploadLate ? "Images uploaded successfully (LATE)" : "Images uploaded successfully",
            data: slip
        };
    } catch (error) {
        console.log('[uploadSlipImagesService] error:', error);
        return { success: false, message: 'Failed to upload images: ' + error.message, data: null };
    }
};

/**
 * Internal helper to update inventory levels and create transactions
 * Optimized with Promise.all for performance
 */
async function finalizeInventoryUpdate(slip, userId, session) {
    if (slip.type === INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT) {
        const batchResult = await createBatchesFromImport({
            items: slip.items.map(item => ({
                material: item.material,
                product: item.product,
                itemCode: item.itemCode,
                unit: item.unit,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                batchNumber: item.batchNumber,
                expirationDate: item.expirationDate,
                shelf: item.shelf
            })),
            relatedPurchaseOrder: slip.relatedPurchaseOrder,
            relatedImportSlip: slip._id,
            relatedProductionOrder: slip.relatedProductionOrder
        }, session);

        if (!batchResult.success) {
            throw new Error(`Failed to create inventory batches: ${batchResult.message}`);
        }
    }

    const warnings = [];
    const transactionDocs = [];

    for (const item of slip.items) {
        // --- Case 1: Item is a Material ---
        if (item.material) {
            const material = await Material.findById(item.material).session(session);
            if (!material) {
                warnings.push(`Material ${item.material} not found, skipping.`);
                continue;
            }

            const beforeStock = material.currentStock;
            const quantityToIssue = item.quantity.actual;

            if (slip.type === INVENTORY_IMPORT_EXPORT_SLIP_TYPE.EXPORT) {
                const fifoResult = await allocateBatchesForMaterial(
                    item.material,
                    quantityToIssue,
                    session
                );

                if (!fifoResult.success) {
                    throw new Error(
                        `FIFO allocation failed for material ${material.code} (${material.name}): ${fifoResult.message}`
                    );
                }

                const batchAllocations = fifoResult.data;

                for (const allocation of batchAllocations) {
                    transactionDocs.push({
                        material: item.material,
                        type: TRANSACTION_TYPE.SALES_OUT,
                        quantity: -allocation.quantityAllocated,
                        beforeStock,
                        afterStock: beforeStock,
                        performedBy: userId,
                        note: `FIFO issue via slip ${slip.slipNumber}. Batch: ${allocation.batchNumber}. ${item.itemNote || ''}`,
                        orderRef: slip.slipNumber,
                        batch: allocation.batch
                    });

                    beforeStock -= allocation.quantityAllocated;
                }

                material.currentStock -= quantityToIssue;
                await material.save({ session });

                if (material.shelf) {
                    await updateShelfLoad(material.shelf);
                }
            } else {
                material.currentStock += quantityToIssue;
                if (item.shelf && material.shelf?.toString() !== item.shelf.toString()) {
                    material.shelf = item.shelf;
                }
                await material.save({ session });

                if (material.shelf) {
                    await updateShelfLoad(material.shelf);
                }

                transactionDocs.push({
                    material: item.material,
                    type: TRANSACTION_TYPE.PRODUCTION_IN,
                    quantity: quantityToIssue,
                    beforeStock,
                    afterStock: material.currentStock,
                    performedBy: userId,
                    note: `Finalized import via slip ${slip.slipNumber}. ${item.itemNote || ''}`,
                    orderRef: slip.slipNumber
                });
            }
        }
        // --- Case 2: Item is a Product (Finished Goods) ---
        else if (item.product) {
            const product = await Product.findById(item.product).session(session);
            if (!product) {
                warnings.push(`Product ${item.product} not found, skipping.`);
                continue;
            }

            const beforeStock = product.currentStock;
            const quantityToUpdate = item.quantity.actual;

            if (slip.type === INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT) {
                // Product Import: Usually finished goods coming from production
                product.currentStock += quantityToUpdate;

                // Update shelf if provided
                if (item.shelf && product.shelf?.toString() !== item.shelf.toString()) {
                    product.shelf = item.shelf;
                }

                await product.save({ session });

                if (product.shelf) {
                    await updateShelfLoad(product.shelf);
                }

                transactionDocs.push({
                    product: item.product,
                    type: TRANSACTION_TYPE.PRODUCTION_IN,
                    quantity: quantityToUpdate,
                    beforeStock,
                    afterStock: product.currentStock,
                    performedBy: userId,
                    note: `Nhập kho thành phẩm từ sản xuất via slip ${slip.slipNumber}. ${item.itemNote || ''}`,
                    orderRef: slip.slipNumber
                });
            } else {
                // Product Export: Apply FIFO logic
                const fifoResult = await allocateBatchesForItem({
                    productId: item.product,
                    quantityNeeded: quantityToUpdate,
                    session
                });

                if (!fifoResult.success) {
                    throw new Error(
                        `FIFO allocation failed for product ${product.code} (${product.name}): ${fifoResult.message}`
                    );
                }

                const batchAllocations = fifoResult.data;

                for (const allocation of batchAllocations) {
                    transactionDocs.push({
                        product: item.product,
                        type: TRANSACTION_TYPE.SALES_OUT,
                        quantity: -allocation.quantityAllocated,
                        beforeStock,
                        afterStock: beforeStock,
                        performedBy: userId,
                        note: `FIFO product export via slip ${slip.slipNumber}. Batch: ${allocation.batchNumber}. ${item.itemNote || ''}`,
                        orderRef: slip.slipNumber,
                        batch: allocation.batch
                    });

                    beforeStock -= allocation.quantityAllocated;
                }

                product.currentStock -= quantityToUpdate;
                await product.save({ session });

                if (product.shelf) {
                    await updateShelfLoad(product.shelf);
                }
            }
        }
    }

    if (transactionDocs.length > 0) {
        await InventoryTransaction.create(transactionDocs, { session, ordered: true });
    }

    // --- Post-Inventory Update Logic ---
    // 1. Trigger auto-update for orders with insufficient materials
    if (slip.type === INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT) {
        const materialIds = slip.items.map(item => item.material).filter(id => !!id);
        await autoUpdateInsufficientOrders(materialIds, session);
    }

    // 2. Handle Material Requisitions & Production Orders (Existing logic)
    if (slip.relatedRequisition) {
        const requisition = await MaterialRequisition.findById(slip.relatedRequisition).session(session);
        if (requisition) {
            if (requisition.type === REQUISITION_TYPE.RETURN) {
                // If this is a return slip being completed, finalize the requisition and update production order
                requisition.status = REQUISITION_STATUS.RETURNED;
                requisition.completedAt = new Date();

                const productionOrder = await ProductionOrder.findById(requisition.productionOrder).session(session);
                if (productionOrder) {
                    for (const item of slip.items) {
                        if (item.material) {
                            const matId = item.material.toString();
                            const bomIndex = productionOrder.materials.findIndex(m => m.material.toString() === matId);
                            if (bomIndex > -1) {
                                productionOrder.materials[bomIndex].returnedQuantity += item.quantity.actual;
                            } else {
                                // Material was not in initial BOM, add it as returned
                                productionOrder.materials.push({
                                    material: item.material,
                                    plannedQuantity: 0,
                                    issuedQuantity: 0,
                                    returnedQuantity: item.quantity.actual,
                                    unit: item.unit
                                });
                            }

                            // Also update returnedQuantity in requisition items for tracking
                            const reqItemIndex = requisition.items.findIndex(ri => ri.material.toString() === matId);
                            if (reqItemIndex > -1) {
                                requisition.items[reqItemIndex].returnedQuantity = item.quantity.actual;
                            }
                        }
                    }
                    await productionOrder.save({ session });
                }
                await requisition.save({ session });
                console.log(`[ImportExportSlip] Finalized return requisition ${requisition.requisitionCode} via slip ${slip.slipNumber}`);
            } else {
                // For normal issue/supplementary requisitions
                requisition.status = REQUISITION_STATUS.COMPLETED;
                requisition.completedAt = new Date();

                const productionOrder = await ProductionOrder.findById(requisition.productionOrder).session(session);
                if (productionOrder) {
                    for (const item of slip.items) {
                        if (item.material) {
                            const matId = item.material.toString();
                            const bomIndex = productionOrder.materials.findIndex(m => m.material.toString() === matId);
                            if (bomIndex > -1) {
                                productionOrder.materials[bomIndex].issuedQuantity += item.quantity.actual;
                            }

                            // Update actualQuantity in requisition items
                            const reqItemIndex = requisition.items.findIndex(ri => ri.material.toString() === matId);
                            if (reqItemIndex > -1) {
                                requisition.items[reqItemIndex].actualQuantity = item.quantity.actual;
                            }
                        }
                    }
                    await productionOrder.save({ session });
                }
                await requisition.save({ session });
                console.log(`[ImportExportSlip] Finalized issue requisition ${requisition.requisitionCode} via slip ${slip.slipNumber}`);
            }
        }
    }

    return warnings;
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