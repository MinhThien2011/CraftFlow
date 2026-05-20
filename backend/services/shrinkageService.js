import mongoose from 'mongoose';
import InventoryShrinkageReport from '../models/InventoryShrinkageReport.js';
import InventoryBatch from '../models/InventoryBatch.js';
import Material from '../models/Material.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import MaterialRequisition from '../models/MaterialRequisition.js';
import ProductionOrder from '../models/ProductionOrder.js';
import { SHRINKAGE_STATUS, TRANSACTION_TYPE } from '../utils/constants.js';
import { generateAtomicCode } from '../utils/codeGenerator.js';
import { ServiceResponse } from '../utils/serviceHelper.js';
import { requestReturnMaterials } from './materialRequisitionService.js';

/**
 * Create a new shrinkage report (Kho Manager)
 */
export const createShrinkageReport = async (reportData, userId) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const {
            batchId,
            materialId,
            productionOrderId,
            shrinkageAmount,
            shrinkageReason,
            shrinkageImage,
            notableMetrics
        } = reportData;

        if (!productionOrderId) {
            throw new Error('Production order is required for shrinkage reporting.');
        }

        const productionOrder = await ProductionOrder.findById(productionOrderId)
            .select('_id materials.material')
            .lean()
            .session(session);

        if (!productionOrder) {
            throw new Error('Production order not found.');
        }

        const orderMaterialIdSet = new Set(
            (productionOrder.materials || []).map((item) => String(item.material))
        );

        if (!orderMaterialIdSet.has(String(materialId))) {
            throw new Error('Material does not belong to the selected production order.');
        }

        // Verify batch exists and belongs to material
        const batch = await InventoryBatch.findById(batchId).session(session);
        if (!batch) throw new Error('Inventory batch not found.');
        if (batch.material.toString() !== materialId) {
            throw new Error('Batch does not belong to the specified material.');
        }

        // Verify enough stock in batch for reporting (not deducting yet)
        if (batch.quantityRemaining < shrinkageAmount) {
            throw new Error(`Reported shrinkage (${shrinkageAmount}) exceeds remaining stock in batch (${batch.quantityRemaining}).`);
        }

        const reportCode = await generateAtomicCode('SHR', 'shrinkage_code');
        const totalReceivedQuantity = Number(batch.quantityReceived || 0);
        const remainingQuantity = Number(batch.quantityRemaining || 0);
        const totalUsedQuantity = Math.max(totalReceivedQuantity - remainingQuantity, 0);
        const returnableQuantity = Math.max(remainingQuantity - Number(shrinkageAmount), 0);

        const report = new InventoryShrinkageReport({
            reportCode,
            batch: batchId,
            material: materialId,
            productionOrder: productionOrderId || null,
            shrinkageAmount,
            totalReceivedQuantity,
            totalUsedQuantity,
            remainingQuantity,
            returnableQuantity,
            notableMetrics: notableMetrics || '',
            shrinkageReason,
            shrinkageImage,
            createdBy: userId,
            status: SHRINKAGE_STATUS.PENDING
        });

        await report.save({ session });
        await session.commitTransaction();

        return ServiceResponse(true, 'Shrinkage report created successfully and is pending review.', report);
    } catch (error) {
        await session.abortTransaction();
        console.error('[ShrinkageService] createShrinkageReport error:', error);
        return ServiceResponse(false, error.message);
    } finally {
        session.endSession();
    }
};

/**
 * Update shrinkage report status (Admin/Approver)
 */
export const updateShrinkageStatus = async (reportId, updateData, userId) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { status, adminNotes } = updateData;
        const report = await InventoryShrinkageReport.findById(reportId).session(session);
        
        if (!report) throw new Error('Shrinkage report not found.');

        // Prevent redundant updates
        if (report.status === status) {
            throw new Error(`Report is already in ${status} status.`);
        }

        // If report was already accepted/rejected, it shouldn't be changed (Final states)
        if ([SHRINKAGE_STATUS.ACCEPTED, SHRINKAGE_STATUS.REJECTED].includes(report.status)) {
            throw new Error(`Cannot update a report that has already been ${report.status}.`);
        }

        const oldStatus = report.status;
        report.status = status;
        report.adminNotes = adminNotes || report.adminNotes;

        // Track who did what at each stage
        if (status === SHRINKAGE_STATUS.CHECKING) {
            report.checkedBy = userId;
        } else if (status === SHRINKAGE_STATUS.RESOLVED) {
            report.resolvedBy = userId;
            report.resolvedAt = new Date();
        } else if (status === SHRINKAGE_STATUS.ACCEPTED || status === SHRINKAGE_STATUS.REJECTED) {
            report.decisionBy = userId;
            report.decisionAt = new Date();

            // CRITICAL: Deduct inventory only when ACCEPTED
            if (status === SHRINKAGE_STATUS.ACCEPTED) {
                const batch = await InventoryBatch.findById(report.batch).session(session);
                if (!batch) throw new Error('Inventory batch not found for stock deduction.');

                if (batch.quantityRemaining < report.shrinkageAmount) {
                    throw new Error(`Stock in batch (${batch.quantityRemaining}) is now less than reported shrinkage (${report.shrinkageAmount}). Please re-evaluate.`);
                }

                // 1. Deduct from batch
                batch.quantityRemaining -= report.shrinkageAmount;
                if (batch.quantityRemaining <= 0) {
                    batch.isExhausted = true;
                }
                await batch.save({ session });

                // 2. Deduct from material total stock
                const material = await Material.findById(report.material).session(session);
                if (material) {
                    material.currentStock -= report.shrinkageAmount;
                    await material.save({ session });
                }

                // 3. Create Inventory Transaction record for audit trail
                const transaction = new InventoryTransaction({
                    material: report.material,
                    type: TRANSACTION_TYPE.ADJUST,
                    quantity: -report.shrinkageAmount, // Negative for deduction
                    sender: 'Warehouse',
                    receiver: 'System (Shrinkage)',
                    note: `Shrinkage Adjustment: ${report.reportCode} - Reason: ${report.shrinkageReason}`,
                    relatedBatch: report.batch,
                    performedBy: userId
                });
                await transaction.save({ session });
            }
        }

        await report.save({ session });
        await session.commitTransaction();

        return ServiceResponse(true, `Shrinkage report status updated to ${status}.`, report);
    } catch (error) {
        await session.abortTransaction();
        console.error('[ShrinkageService] updateShrinkageStatus error:', error);
        return ServiceResponse(false, error.message);
    } finally {
        session.endSession();
    }
};

/**
 * Get all shrinkage reports with filters
 */
export const getShrinkageReports = async (filters = {}) => {
    try {
        const query = {};
        if (filters.status) query.status = filters.status;
        if (filters.materialId) query.material = filters.materialId;
        if (filters.productionOrderId) query.productionOrder = filters.productionOrderId;

        const reports = await InventoryShrinkageReport.find(query)
            .populate('material', 'name code unit')
            .populate('batch', 'batchNumber quantityRemaining')
            .populate('productionOrder', 'orderCode status')
            .populate('createdBy', 'fullName')
            .populate('decisionBy', 'fullName')
            .populate('relatedReturnRequisition', 'requisitionCode status relatedSlip')
            .populate('relatedReturnSlip', 'slipNumber status type')
            .sort({ createdAt: -1 });
        
        return ServiceResponse(true, 'Shrinkage reports retrieved successfully.', reports);
    } catch (error) {
        console.error('[ShrinkageService] getShrinkageReports error:', error);
        return ServiceResponse(false, error.message);
    }
};

export const createReturnRequestFromShrinkage = async (reportId, payload, userId) => {
    try {
        const report = await InventoryShrinkageReport.findById(reportId)
            .populate('productionOrder', 'orderCode');

        if (!report) {
            return ServiceResponse(false, 'Shrinkage report not found.');
        }

        if (!report.productionOrder) {
            return ServiceResponse(false, 'Shrinkage report is missing production order linkage.');
        }

        if (report.relatedReturnRequisition) {
            const existing = await MaterialRequisition.findById(report.relatedReturnRequisition)
                .select('_id requisitionCode status relatedSlip')
                .lean();
            return ServiceResponse(true, 'Return requisition already exists.', {
                report,
                requisition: existing
            });
        }

        const requestedQuantityRaw = Number(payload?.requestedQuantity ?? report.returnableQuantity);
        const requestedQuantity = Number.isFinite(requestedQuantityRaw) ? requestedQuantityRaw : 0;
        if (requestedQuantity <= 0) {
            return ServiceResponse(false, 'Requested return quantity must be greater than zero.');
        }

        const requisitionResult = await requestReturnMaterials(
            report.productionOrder._id,
            userId,
            [{ materialId: report.material.toString(), quantity: requestedQuantity }]
        );

        if (!requisitionResult.success || !requisitionResult.data?.requisition) {
            return ServiceResponse(false, requisitionResult.message || 'Failed to create return requisition.');
        }

        report.relatedReturnRequisition = requisitionResult.data.requisition._id;
        await report.save();

        return ServiceResponse(true, 'Return requisition created from shrinkage report.', {
            report,
            requisition: requisitionResult.data.requisition
        });
    } catch (error) {
        console.error('[ShrinkageService] createReturnRequestFromShrinkage error:', error);
        return ServiceResponse(false, error.message);
    }
};

export const getShrinkageSummary = async (filters = {}) => {
    try {
        const match = {};
        if (filters.fromDate || filters.toDate) {
            match.createdAt = {};
            if (filters.fromDate) match.createdAt.$gte = new Date(filters.fromDate);
            if (filters.toDate) match.createdAt.$lte = new Date(filters.toDate);
        }

        const [totals, byMaterial] = await Promise.all([
            InventoryShrinkageReport.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        reportCount: { $sum: 1 },
                        totalReceivedQuantity: { $sum: '$totalReceivedQuantity' },
                        totalUsedQuantity: { $sum: '$totalUsedQuantity' },
                        totalShrinkageQuantity: { $sum: '$shrinkageAmount' },
                        totalRemainingQuantity: { $sum: '$remainingQuantity' }
                    }
                }
            ]),
            InventoryShrinkageReport.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: '$material',
                        reportCount: { $sum: 1 },
                        totalShrinkageQuantity: { $sum: '$shrinkageAmount' },
                        totalRemainingQuantity: { $sum: '$remainingQuantity' }
                    }
                },
                { $sort: { totalShrinkageQuantity: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'materials',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'material'
                    }
                },
                { $unwind: { path: '$material', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 0,
                        materialId: '$_id',
                        materialCode: '$material.code',
                        materialName: '$material.name',
                        reportCount: 1,
                        totalShrinkageQuantity: 1,
                        totalRemainingQuantity: 1
                    }
                }
            ])
        ]);

        return ServiceResponse(true, 'Shrinkage summary retrieved successfully.', {
            totals: totals[0] || {
                reportCount: 0,
                totalReceivedQuantity: 0,
                totalUsedQuantity: 0,
                totalShrinkageQuantity: 0,
                totalRemainingQuantity: 0
            },
            topShrinkageMaterials: byMaterial
        });
    } catch (error) {
        console.error('[ShrinkageService] getShrinkageSummary error:', error);
        return ServiceResponse(false, error.message);
    }
};
