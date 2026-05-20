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
                { returnDocument: "after", session }
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

export const getWarehouseFifoOverview = async (params = {}) => {
    try {
        const { search = '', type = 'all' } = params;

        const [batchGrouped, txGrouped] = await Promise.all([
            InventoryBatch.aggregate([
                {
                    $match: {
                        $or: [
                            { material: { $ne: null } },
                            { product: { $ne: null } }
                        ]
                    }
                },
                {
                    $group: {
                        _id: { material: '$material', product: '$product' },
                        batchCount: { $sum: 1 },
                        activeBatchCount: {
                            $sum: { $cond: [{ $gt: ['$quantityRemaining', 0] }, 1, 0] }
                        },
                        totalReceived: { $sum: '$quantityReceived' },
                        totalRemaining: { $sum: '$quantityRemaining' },
                        oldestReceivedDate: { $min: '$receivedDate' },
                        newestReceivedDate: { $max: '$receivedDate' }
                    }
                }
            ]),
            InventoryTransaction.aggregate([
                {
                    $match: {
                        $or: [
                            { material: { $ne: null } },
                            { product: { $ne: null } }
                        ]
                    }
                },
                {
                    $group: {
                        _id: { material: '$material', product: '$product' },
                        transactionCount: { $sum: 1 },
                        latestTransactionAt: { $max: '$createdAt' }
                    }
                }
            ])
        ]);

        const materialIds = [];
        const productIds = [];
        for (const row of batchGrouped) {
            if (row._id?.material) materialIds.push(row._id.material);
            if (row._id?.product) productIds.push(row._id.product);
        }

        const [materials, products] = await Promise.all([
            materialIds.length > 0 ? Material.find({ _id: { $in: materialIds } }).select('name code unit').lean() : [],
            productIds.length > 0 ? Product.find({ _id: { $in: productIds } }).select('name code unit').lean() : []
        ]);

        const materialMap = new Map(materials.map((m) => [m._id.toString(), m]));
        const productMap = new Map(products.map((p) => [p._id.toString(), p]));
        const txMap = new Map(txGrouped.map((t) => [`${t._id.material || ''}:${t._id.product || ''}`, t]));

        const normalizedSearch = search.trim().toLowerCase();
        const items = batchGrouped
            .map((row) => {
                const materialId = row._id?.material?.toString?.() || null;
                const productId = row._id?.product?.toString?.() || null;
                const itemType = materialId ? 'material' : 'product';
                if (type === 'material' && itemType !== 'material') return null;
                if (type === 'product' && itemType !== 'product') return null;

                const meta = materialId ? materialMap.get(materialId) : productMap.get(productId);
                if (!meta) return null;

                const tx = txMap.get(`${row._id.material || ''}:${row._id.product || ''}`);
                const result = {
                    itemType,
                    itemId: materialId || productId,
                    itemCode: meta.code || '',
                    itemName: meta.name || '',
                    unit: meta.unit || '',
                    summary: {
                        batchCount: Number(row.batchCount || 0),
                        activeBatchCount: Number(row.activeBatchCount || 0),
                        totalReceived: Number(row.totalReceived || 0),
                        totalRemaining: Number(row.totalRemaining || 0),
                        transactionCount: Number(tx?.transactionCount || 0),
                        oldestReceivedDate: row.oldestReceivedDate || null,
                        newestReceivedDate: row.newestReceivedDate || null,
                        latestTransactionAt: tx?.latestTransactionAt || null
                    }
                };

                if (!normalizedSearch) return result;
                const s = `${result.itemCode} ${result.itemName}`.toLowerCase();
                return s.includes(normalizedSearch) ? result : null;
            })
            .filter(Boolean)
            .sort((a, b) => (b.summary.latestTransactionAt || 0) - (a.summary.latestTransactionAt || 0));

        return { success: true, message: 'Warehouse FIFO overview retrieved successfully', data: items };
    } catch (error) {
        console.error('[FIFOService] getWarehouseFifoOverview error:', error);
        return { success: false, message: error.message, data: null };
    }
};

export const getItemFifoHistory = async ({ itemType, itemId }) => {
    try {
        if (!itemType || !itemId || !['material', 'product'].includes(itemType)) {
            return { success: false, message: 'itemType and itemId are required', data: null };
        }

        const filter = itemType === 'material' ? { material: itemId } : { product: itemId };
        const entity = itemType === 'material'
            ? await Material.findById(itemId).select('name code unit').lean()
            : await Product.findById(itemId).select('name code unit').lean();

        if (!entity) {
            return { success: false, message: `${itemType} not found`, data: null };
        }

        const outboundTypes = new Set([
            TRANSACTION_TYPE.SALES_OUT,
            TRANSACTION_TYPE.DAMAGE_OUT,
            TRANSACTION_TYPE.ISSUE,
            TRANSACTION_TYPE.DEDUCT,
            TRANSACTION_TYPE.ALLOCATE
        ]);

        const [batches, transactions] = await Promise.all([
            InventoryBatch.find(filter)
                .populate('shelf', 'shelfCode warehouseSection zone aisle level bin status')
                .populate('relatedImportSlip', 'slipNumber status date')
                .populate('relatedPurchaseOrder', 'orderCode status')
                .populate('relatedProductionOrder', 'orderCode status')
                .sort({ receivedDate: 1, createdAt: 1, _id: 1 })
                .lean(),
            InventoryTransaction.find(filter)
                .populate('batch', 'batchNumber')
                .populate('performedBy', 'fullName username email')
                .populate('productionOrder', 'orderCode status')
                .populate('requisition', 'requisitionCode status')
                .populate('purchaseOrder', 'orderCode status')
                .sort({ createdAt: 1, _id: 1 })
                .lean()
        ]);

        const result = {
            itemType,
            itemId,
            itemCode: entity.code || '',
            itemName: entity.name || '',
            unit: entity.unit || '',
            summary: {
                batchCount: batches.length,
                activeBatchCount: batches.filter((b) => Number(b.quantityRemaining || 0) > 0).length,
                totalReceived: batches.reduce((sum, b) => sum + Number(b.quantityReceived || 0), 0),
                totalRemaining: batches.reduce((sum, b) => sum + Number(b.quantityRemaining || 0), 0),
                transactionCount: transactions.length
            },
            batches: batches.map((batch) => ({
                batchId: batch._id,
                batchNumber: batch.batchNumber,
                receivedDate: batch.receivedDate,
                expirationDate: batch.expirationDate || null,
                quantityReceived: Number(batch.quantityReceived || 0),
                quantityRemaining: Number(batch.quantityRemaining || 0),
                unitCost: Number(batch.unitCost || 0),
                isExhausted: Boolean(batch.isExhausted),
                currentLocation: batch.shelf ? {
                    shelfId: batch.shelf._id,
                    shelfCode: batch.shelf.shelfCode || '',
                    warehouseSection: batch.shelf.warehouseSection || '',
                    zone: batch.shelf.zone || '',
                    aisle: batch.shelf.aisle || '',
                    level: batch.shelf.level || '',
                    bin: batch.shelf.bin || '',
                    status: batch.shelf.status || ''
                } : null,
                source: {
                    importSlipNumber: batch.relatedImportSlip?.slipNumber || null,
                    purchaseOrderCode: batch.relatedPurchaseOrder?.orderCode || null,
                    productionOrderCode: batch.relatedProductionOrder?.orderCode || null
                }
            })),
            transactions: transactions.map((tx) => {
                const rawQty = Number(tx.quantity || 0);
                const signedQuantity = outboundTypes.has(tx.type) ? -Math.abs(rawQty) : Math.abs(rawQty);
                return {
                    transactionId: tx._id,
                    createdAt: tx.createdAt,
                    type: tx.type,
                    quantity: rawQty,
                    signedQuantity,
                    beforeStock: tx.beforeStock ?? null,
                    afterStock: tx.afterStock ?? null,
                    batchId: tx.batch?._id || null,
                    batchNumber: tx.batch?.batchNumber || null,
                    location: tx.location || null,
                    orderRef: tx.orderRef || null,
                    productionOrderCode: tx.productionOrder?.orderCode || null,
                    requisitionCode: tx.requisition?.requisitionCode || null,
                    purchaseOrderCode: tx.purchaseOrder?.orderCode || null,
                    performedBy: tx.performedBy ? {
                        userId: tx.performedBy._id,
                        name: tx.performedBy.fullName || tx.performedBy.username || '',
                        email: tx.performedBy.email || null
                    } : null,
                    note: tx.note || null
                };
            })
        };

        return { success: true, message: 'FIFO item history retrieved successfully', data: result };
    } catch (error) {
        console.error('[FIFOService] getItemFifoHistory error:', error);
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

export const getBatchesByProductionOrder = async (productionOrderId) => {
    try {
        const MaterialRequisition = mongoose.model('MaterialRequisition');
        const InventoryTransaction = mongoose.model('InventoryTransaction');
        const InventoryImportExportSlip = mongoose.model('InventoryImportExportSlip');

        // Find all requisitions related to the production order
        const requisitions = await MaterialRequisition.find({ productionOrder: productionOrderId }).lean();
        const requisitionIds = requisitions.map(r => r._id);
        
        // Find all slips related to these requisitions or the production order
        const slips = await InventoryImportExportSlip.find({
            $or: [
                { relatedProductionOrder: productionOrderId },
                { relatedRequisition: { $in: requisitionIds } }
            ]
        }).select('slipNumber').lean();
        
        const slipNumbers = slips.map(s => s.slipNumber);

        // Fetch all transactions related to this production order/requisitions/slips that issued stock
        const transactions = await InventoryTransaction.find({
            type: { $in: ['sales_out', 'issue'] },
            $or: [
                { productionOrder: productionOrderId },
                { requisition: { $in: requisitionIds } },
                { orderRef: { $in: slipNumbers } }
            ]
        })
        .populate('batch')
        .populate('material', 'name code unit')
        .lean();

        // Also check if any batch allocations are saved in the requisitions directly
        const directAllocations = [];
        for (const req of requisitions) {
            for (const item of req.items || []) {
                for (const allocation of item.batchAllocations || []) {
                    if (allocation.batch) {
                        directAllocations.push({
                            material: item.material,
                            batch: allocation.batch,
                            quantityAllocated: allocation.quantityAllocated
                        });
                    }
                }
            }
        }

        const batchMap = new Map();

        // Process transactions
        for (const tx of transactions) {
            if (!tx.batch) continue;
            const batchIdStr = tx.batch._id.toString();
            const matIdStr = tx.material ? tx.material._id.toString() : (tx.batch.material ? tx.batch.material.toString() : '');
            if (!matIdStr) continue;

            const quantityAllocated = Math.abs(tx.quantity);
            const key = `${matIdStr}:${batchIdStr}`;

            if (!batchMap.has(key)) {
                batchMap.set(key, {
                    batch: tx.batch,
                    materialId: matIdStr,
                    quantityAllocated: 0
                });
            }
            batchMap.get(key).quantityAllocated += quantityAllocated;
        }

        // Process direct allocations
        for (const alloc of directAllocations) {
            const batchIdStr = alloc.batch.toString();
            const matIdStr = alloc.material.toString();
            const key = `${matIdStr}:${batchIdStr}`;

            if (!batchMap.has(key)) {
                const InventoryBatch = mongoose.model('InventoryBatch');
                const batch = await InventoryBatch.findById(alloc.batch).lean();
                if (batch) {
                    batchMap.set(key, {
                        batch,
                        materialId: matIdStr,
                        quantityAllocated: 0
                    });
                }
            }
            const existing = batchMap.get(key);
            if (existing) {
                existing.quantityAllocated += alloc.quantityAllocated;
            }
        }

        // Convert the map to the final structure
        const result = Array.from(batchMap.values()).map(item => {
            return {
                _id: item.batch._id,
                batchNumber: item.batch.batchNumber,
                quantityRemaining: item.batch.quantityRemaining,
                quantityReceived: item.batch.quantityReceived,
                expirationDate: item.batch.expirationDate,
                material: item.materialId,
                quantityUsed: item.quantityAllocated
            };
        });

        return { success: true, data: result, message: 'Production order batches retrieved successfully' };
    } catch (error) {
        console.error('[FIFOService] getBatchesByProductionOrder error:', error);
        return { success: false, message: error.message, data: null };
    }
};
