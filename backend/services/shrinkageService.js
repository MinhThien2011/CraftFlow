import mongoose from 'mongoose';
import InventoryShrinkageReport from '../models/InventoryShrinkageReport.js';
import InventoryBatch from '../models/InventoryBatch.js';
import Material from '../models/Material.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import { SHRINKAGE_STATUS, TRANSACTION_TYPE } from '../utils/constants.js';
import { generateAtomicCode } from '../utils/codeGenerator.js';
import { ServiceResponse } from '../utils/serviceHelper.js';

/**
 * Create a new shrinkage report (Kho Manager)
 */
export const createShrinkageReport = async (reportData, userId) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { batchId, materialId, shrinkageAmount, shrinkageReason, shrinkageImage } = reportData;

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
        const report = new InventoryShrinkageReport({
            reportCode,
            batch: batchId,
            material: materialId,
            shrinkageAmount,
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
        const reports = await InventoryShrinkageReport.find(filters)
            .populate('material', 'name code unit')
            .populate('batch', 'batchNumber quantityRemaining')
            .populate('createdBy', 'fullName')
            .populate('decisionBy', 'fullName')
            .sort({ createdAt: -1 });
        
        return ServiceResponse(true, 'Shrinkage reports retrieved successfully.', reports);
    } catch (error) {
        console.error('[ShrinkageService] getShrinkageReports error:', error);
        return ServiceResponse(false, error.message);
    }
};
