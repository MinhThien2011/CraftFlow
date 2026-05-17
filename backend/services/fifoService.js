import InventoryBatch from '../models/InventoryBatch.js';
import Material from '../models/Material.js';
import Product from '../models/Product.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import Shelf from '../models/Shelf.js';
import { TRANSACTION_TYPE } from '../utils/constants.js';
import mongoose from 'mongoose';

const BATCH_PREFIX = 'BATCH';
const MAX_RETRY_ATTEMPTS = 10;

const toObjectId = (id) => id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id);

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
        const requestedQuantity = Number(quantityNeeded);
        if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
            throw new Error('quantityNeeded must be a positive number.');
        }

        const query = {
            isExhausted: false,
            quantityRemaining: { $gt: 0 },
            $or: [
                { expirationDate: null },
                { expirationDate: { $gt: new Date() } }
            ]
        };

        if (materialId) query.material = toObjectId(materialId);
        else if (productId) query.product = toObjectId(productId);
        else throw new Error('Either materialId or productId must be provided for batch allocation.');

        const totalAvailableResult = await InventoryBatch.aggregate([
            { $match: query },
            { $group: { _id: null, total: { $sum: '$quantityRemaining' } } }
        ]).session(session);

        const totalAvailable = totalAvailableResult[0]?.total || 0;
        if (totalAvailable < requestedQuantity) {
            return {
                success: false,
                message: `Not enough stock. Still need ${requestedQuantity - totalAvailable} more units.`,
                data: { allocations: [], shortfall: requestedQuantity - totalAvailable }
            };
        }

        const allocations = [];
        let remainingQuantity = requestedQuantity;

        while (remainingQuantity > 0) {
            const batch = await InventoryBatch.findOne(query)
                .sort({ receivedDate: 1, expirationDate: 1, _id: 1 })
                .session(session);

            if (!batch) {
                throw new Error(`Stock changed during allocation. Still need ${remainingQuantity} more units.`);
            }

            const availableInBatch = batch.quantityRemaining;
            const quantityToAllocate = Math.min(availableInBatch, remainingQuantity);

            const updatedBatch = await InventoryBatch.findOneAndUpdate(
                {
                    _id: batch._id,
                    isExhausted: false,
                    quantityRemaining: { $gte: quantityToAllocate }
                },
                { $inc: { quantityRemaining: -quantityToAllocate } },
                { new: true, session }
            );

            if (!updatedBatch) {
                continue;
            }

            if (updatedBatch.quantityRemaining <= 0 && !updatedBatch.isExhausted) {
                await InventoryBatch.updateOne(
                    { _id: updatedBatch._id },
                    { $set: { isExhausted: true } },
                    { session }
                );
            }

            allocations.push({
                batch: batch._id,
                batchNumber: batch.batchNumber,
                quantityAllocated: quantityToAllocate,
                expirationDate: batch.expirationDate
            });

            remainingQuantity -= quantityToAllocate;
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
        const batchCounterMap = new Map(); // Track counts per item code for auto-gen
        const usedBatchNumbers = new Set(); // Track all batch numbers used in this transaction

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
            code = code.toUpperCase();

            // Handle Batch Number generation
            let batchNumber = item.batchNumber;
            if (!batchNumber) {
                // Auto-generation logic
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const basePattern = `${BATCH_PREFIX}-${code}-${dateStr}-`;

                if (!batchCounterMap.has(code)) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dbCount = await InventoryBatch.countDocuments({
                        batchNumber: { $regex: `^${basePattern}` },
                        createdAt: { $gte: today }
                    }).session(session);
                    batchCounterMap.set(code, dbCount);
                }

                let currentCount = batchCounterMap.get(code);
                let candidate;
                do {
                    currentCount++;
                    candidate = `${basePattern}${currentCount.toString().padStart(4, '0')}`;
                } while (usedBatchNumbers.has(candidate)); // Ensure unique in this run

                batchCounterMap.set(code, currentCount);
                batchNumber = candidate;
            } else {
                // User provided batch number - handle potential duplicates in same import
                let baseBatch = batchNumber;
                let candidate = batchNumber;
                let suffix = 1;

                // If this number was already used in this run, append suffix
                while (usedBatchNumbers.has(candidate)) {
                    candidate = `${baseBatch}-${suffix++}`;
                }
                batchNumber = candidate;
            }

            usedBatchNumbers.add(batchNumber);

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

/**
 * Assign or move a batch to a new shelf.
 * Records a MOVE transaction.
 */
export const assignBatchLocation = async (batchId, shelfId, userId, note = '') => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const batch = await InventoryBatch.findById(batchId).session(session);
        if (!batch) {
            await session.abortTransaction();
            return { success: false, message: 'Batch not found', data: null };
        }

        const shelf = await Shelf.findById(shelfId).session(session);
        if (!shelf) {
            await session.abortTransaction();
            return { success: false, message: 'Shelf not found', data: null };
        }

        if (shelf.status === 'Maintenance') {
            await session.abortTransaction();
            return { success: false, message: 'Shelf is under maintenance', data: null };
        }

        const oldShelfId = batch.shelf;
        if (oldShelfId?.toString() === shelfId.toString()) {
            await session.abortTransaction();
            return { success: true, message: `Batch ${batch.batchNumber} is already assigned to shelf ${shelf.shelfCode}`, data: batch };
        }

        const oldShelf = oldShelfId ? await Shelf.findById(oldShelfId).session(session) : null;

        // Update batch shelf
        batch.shelf = shelfId;
        await batch.save({ session });

        // Update shelf loads
        // Decrement old shelf if it existed
        if (oldShelf) {
            oldShelf.currentLoad = Math.max(0, oldShelf.currentLoad - batch.quantityRemaining);
            if (oldShelf.currentLoad < oldShelf.maxCapacity && oldShelf.status === 'Full') {
                oldShelf.status = 'Available';
            }
            await oldShelf.save({ session });
        }

        // Increment new shelf
        shelf.currentLoad += batch.quantityRemaining;
        if (shelf.currentLoad >= shelf.maxCapacity) {
            shelf.status = 'Full';
        }
        await shelf.save({ session });

        // Record transaction
        await mongoose.model('InventoryTransaction').create([{
            material: batch.material,
            product: batch.product,
            batch: batch._id,
            type: TRANSACTION_TYPE.MOVE,
            quantity: 0, // Movement doesn't change quantity
            beforeStock: batch.quantityRemaining,
            afterStock: batch.quantityRemaining,
            performedBy: userId,
            location: shelf.shelfCode,
            note: note || `Moved from ${oldShelf ? oldShelf.shelfCode : 'Unassigned'} to ${shelf.shelfCode}`
        }], { session });

        await session.commitTransaction();

        return {
            success: true,
            message: `Batch ${batch.batchNumber} assigned to shelf ${shelf.shelfCode}`,
            data: batch
        };
    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        console.error('[FIFOService] assignBatchLocation error:', error);
        return { success: false, message: error.message, data: null };
    } finally {
        session.endSession();
    }
};

/**
 * Get all active batches with filters (for assignment UI)
 */
export const getActiveBatches = async (params = {}) => {
    try {
        const { search, unassignedOnly, type } = params;
        const query = { isExhausted: false };

        if (unassignedOnly === 'true') {
            query.shelf = null;
        }

        if (type === 'Material') query.material = { $ne: null };
        if (type === 'Product') query.product = { $ne: null };

        if (search) {
            query.batchNumber = { $regex: search, $options: 'i' };
        }

        const batches = await InventoryBatch.find(query)
            .populate('material', 'name code unit')
            .populate('product', 'name code unit')
            .populate('shelf', 'shelfCode warehouseSection')
            .sort({ receivedDate: -1 })
            .lean();

        return { success: true, data: batches, message: 'Active batches retrieved successfully' };
    } catch (error) {
        console.error('[FIFOService] getActiveBatches error:', error);
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

/**
 * Trace a batch by its batch number.
 * Returns batch details, current location, and transaction history.
 */
export const traceBatchByNumber = async (batchNumber) => {
    try {
        // 1. Find the batch
        const batch = await InventoryBatch.findOne({ batchNumber })
            .populate('material', 'name code unit')
            .populate('product', 'name code unit')
            .populate({
                path: 'shelf',
                select: 'shelfCode warehouseSection zone aisle level bin'
            })
            .populate('relatedImportSlip', 'slipNumber type status')
            .populate('relatedPurchaseOrder', 'orderCode')
            .lean();

        if (!batch) {
            return { success: false, message: `Batch ${batchNumber} not found`, data: null };
        }

        // 2. Find transaction history for this batch
        const history = await mongoose.model('InventoryTransaction').find({ batch: batch._id })
            .populate('performedBy', 'fullName username')
            .sort({ createdAt: -1 })
            .lean();

        return {
            success: true,
            message: 'Batch traceability data retrieved successfully',
            data: {
                batch,
                history
            }
        };
    } catch (error) {
        console.error('[FIFOService] traceBatchByNumber error:', error);
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

/**
 * Emergency function to backfill batches for items that have currentStock 
 * but no corresponding active batches.
 */
export const backfillInitialBatches = async () => {
    try {
        const materials = await Material.find({ currentStock: { $gt: 0 } });
        let matCount = 0;

        for (const mat of materials) {
            const batchCount = await InventoryBatch.countDocuments({ material: mat._id, isExhausted: false });
            if (batchCount === 0) {
                await InventoryBatch.create({
                    batchNumber: `BATCH-${mat.code}-BACKFILL-${Date.now()}`,
                    material: mat._id,
                    quantityReceived: mat.currentStock,
                    quantityRemaining: mat.currentStock,
                    unit: mat.unit,
                    receivedDate: new Date(),
                    shelf: mat.shelf,
                    notes: 'Auto-backfilled due to stock discrepancy'
                });
                matCount++;
            }
        }

        const products = await Product.find({ currentStock: { $gt: 0 } });
        let prodCount = 0;

        for (const prod of products) {
            const batchCount = await InventoryBatch.countDocuments({ product: prod._id, isExhausted: false });
            if (batchCount === 0) {
                await InventoryBatch.create({
                    batchNumber: `BATCH-${prod.code}-BACKFILL-${Date.now()}`,
                    product: prod._id,
                    quantityReceived: prod.currentStock,
                    quantityRemaining: prod.currentStock,
                    unit: prod.unit,
                    receivedDate: new Date(),
                    shelf: prod.shelf,
                    notes: 'Auto-backfilled due to stock discrepancy'
                });
                prodCount++;
            }
        }

        return {
            success: true,
            message: `Backfilled ${matCount} materials and ${prodCount} products.`,
            data: { matCount, prodCount }
        };
    } catch (error) {
        console.error('[FIFOService] backfillInitialBatches error:', error);
        return { success: false, message: error.message };
    }
};
