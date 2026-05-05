import InventoryBatch from '../models/InventoryBatch.js';
import Material from '../models/Material.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import { TRANSACTION_TYPE } from '../utils/constants.js';
import mongoose from 'mongoose';

const BATCH_PREFIX = 'BATCH';
const MAX_RETRY_ATTEMPTS = 10;

export const generateBatchNumber = async (materialCode = 'MAT') => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const basePattern = `${BATCH_PREFIX}-${materialCode.toUpperCase()}-${dateStr}-`;

    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const count = await InventoryBatch.countDocuments({
            batchNumber: { $regex: `^${basePattern}` },
            createdAt: { $gte: today }
        });

        const candidateNumber = `${basePattern}${(count + 1).toString().padStart(4, '0')}`;

        const existing = await InventoryBatch.findOne({ batchNumber: candidateNumber }).lean();
        if (!existing) {
            return candidateNumber;
        }
    }

    throw new Error(`Failed to generate unique batch number after ${MAX_RETRY_ATTEMPTS} attempts`);
};

export const createBatch = async (batchData) => {
    try {
        const batchNumber = batchData.batchNumber || await generateBatchNumber(batchData.materialCode);
        
        const batch = new InventoryBatch({
            ...batchData,
            batchNumber
        });

        await batch.save();
        return { success: true, data: batch, message: 'Batch created successfully' };
    } catch (error) {
        console.error('[FIFOService] createBatch error:', error);
        return { success: false, message: error.message, data: null };
    }
};

/**
 * Generic function to allocate batches using FIFO logic.
 * Works for both Materials and Products.
 */
export const allocateBatchesForItem = async ({ materialId, productId, quantityNeeded, session }) => {
    try {
        const query = {
            isExhausted: false,
            $or: [
                { expirationDate: null },
                { expirationDate: { $gt: new Date() } }
            ]
        };

        if (materialId) query.material = materialId;
        else if (productId) query.product = productId;
        else throw new Error('Either materialId or productId must be provided for batch allocation.');

        const batches = await InventoryBatch.find(query)
            .sort({ receivedDate: 1, expirationDate: 1 })
            .session(session);

        const allocations = [];
        let remainingQuantity = quantityNeeded;

        for (const batch of batches) {
            if (remainingQuantity <= 0) break;

            const availableInBatch = batch.quantityRemaining;
            const quantityToAllocate = Math.min(availableInBatch, remainingQuantity);

            if (quantityToAllocate > 0) {
                allocations.push({
                    batch: batch._id,
                    batchNumber: batch.batchNumber,
                    quantityAllocated: quantityToAllocate,
                    expirationDate: batch.expirationDate
                });

                batch.quantityRemaining -= quantityToAllocate;
                if (batch.quantityRemaining <= 0) {
                    batch.isExhausted = true;
                }
                await batch.save({ session });
                remainingQuantity -= quantityToAllocate;
            }
        }

        if (remainingQuantity > 0) {
            return {
                success: false,
                message: `Not enough stock. Still need ${remainingQuantity} more units.`,
                data: { allocations, shortfall: remainingQuantity }
            };
        }

        return { success: true, data: allocations, message: 'Batches allocated successfully' };
    } catch (error) {
        console.error('[FIFOService] allocateBatchesForItem error:', error);
        return { success: false, message: error.message, data: null };
    }
};

/**
 * Legacy wrapper for allocateBatchesForMaterial
 */
export const allocateBatchesForMaterial = async (materialId, quantityNeeded, session) => {
    return allocateBatchesForItem({ materialId, quantityNeeded, session });
};

export const createBatchesFromImport = async (importData, session) => {
    try {
        const { items, relatedPurchaseOrder, relatedImportSlip, relatedProductionOrder } = importData;
        const createdBatches = [];

        for (const item of items) {
            const isMaterial = !!item.material;
            const isProduct = !!item.product;
            
            if ((!isMaterial && !isProduct) || !item.quantity?.actual || item.quantity.actual <= 0) continue;

            let code = item.itemCode;
            if (!code) {
                const Model = isMaterial ? Material : mongoose.model('Product');
                const doc = await Model.findById(item.material || item.product).session(session);
                code = doc?.code || (isMaterial ? 'MAT' : 'PROD');
            }

            const batchNumber = item.batchNumber || await generateBatchNumber(code);

            const batch = new InventoryBatch({
                batchNumber,
                material: item.material || null,
                product: item.product || null,
                quantityReceived: item.quantity.actual,
                quantityRemaining: item.quantity.actual,
                unit: item.unit || 'unit',
                unitCost: item.unitPrice || 0,
                receivedDate: new Date(),
                expirationDate: item.expirationDate || null,
                shelf: item.shelf,
                relatedPurchaseOrder,
                relatedImportSlip,
                relatedProductionOrder,
                supplier: item.supplier || {}
            });

            await batch.save({ session });
            createdBatches.push(batch);
        }

        return { success: true, data: createdBatches, message: 'Batches created successfully' };
    } catch (error) {
        console.error('[FIFOService] createBatchesFromImport error:', error);
        return { success: false, message: error.message, data: null };
    }
};

export const getBatchesByMaterial = async (materialId, includeExhausted = false) => {
    try {
        const query = { material: materialId };
        if (!includeExhausted) {
            query.isExhausted = false;
        }

        const batches = await InventoryBatch.find(query)
            .sort({ receivedDate: 1, expirationDate: 1 })
            .populate('relatedPurchaseOrder', 'orderCode')
            .populate('relatedImportSlip', 'slipNumber')
            .lean();

        return { success: true, data: batches, message: 'Batches retrieved successfully' };
    } catch (error) {
        console.error('[FIFOService] getBatchesByMaterial error:', error);
        return { success: false, message: error.message, data: null };
    }
};

export const getExpiringBatches = async (daysAhead = 30) => {
    try {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        const batches = await InventoryBatch.find({
            isExhausted: false,
            expirationDate: {
                $ne: null,
                $lte: futureDate
            }
        })
        .populate('material', 'name code threshold')
        .sort({ expirationDate: 1 })
        .lean();

        return { success: true, data: batches, message: 'Expiring batches retrieved successfully' };
    } catch (error) {
        console.error('[FIFOService] getExpiringBatches error:', error);
        return { success: false, message: error.message, data: null };
    }
};

export const getMaterialStockFromBatches = async (materialId) => {
    try {
        const result = await InventoryBatch.aggregate([
            { $match: { material: new mongoose.Types.ObjectId(materialId), isExhausted: false } },
            {
                $group: {
                    _id: '$material',
                    totalQuantity: { $sum: '$quantityRemaining' },
                    oldestBatch: { $min: '$receivedDate' },
                    nearestExpiration: { $min: '$expirationDate' },
                    batchCount: { $sum: 1 }
                }
            }
        ]);

        if (result.length === 0) {
            return { success: true, data: { material: materialId, totalQuantity: 0, batchCount: 0 }, message: 'No active batches' };
        }

        return { success: true, data: result[0], message: 'Stock calculated from batches' };
    } catch (error) {
        console.error('[FIFOService] getMaterialStockFromBatches error:', error);
        return { success: false, message: error.message, data: null };
    }
};

export const reconcileMaterialStock = async (materialId, session) => {
    try {
        const result = await InventoryBatch.aggregate([
            { $match: { material: new mongoose.Types.ObjectId(materialId) } },
            {
                $group: {
                    _id: '$material',
                    totalFromBatches: { $sum: '$quantityRemaining' }
                }
            }
        ]);

        const totalFromBatches = result.length > 0 ? result[0].totalFromBatches : 0;

        const material = await Material.findById(materialId).session(session);
        if (material) {
            material.currentStock = totalFromBatches;
            await material.save({ session });
        }

        return { success: true, data: { material: materialId, correctedStock: totalFromBatches }, message: 'Stock reconciled' };
    } catch (error) {
        console.error('[FIFOService] reconcileMaterialStock error:', error);
        return { success: false, message: error.message, data: null };
    }
};
