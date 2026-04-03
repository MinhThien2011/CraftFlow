import MaterialRequisition from '../models/MaterialRequisition.js';
import Material from '../models/Material.js';
import ProductionOrderAssignment from '../models/ProductionOrderAssignment.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import { REQUISITION_STATUS, TRANSACTION_TYPE, REQUISITION_TIMEOUT_MINUTES } from '../utils/constants.js';
import mongoose from 'mongoose';

/**
 * Staff requests materials for an assignment.
 */
export const requestMaterials = async (assignmentId, staffId, items) => {
  try {
    const assignment = await ProductionOrderAssignment.findById(assignmentId);
    if (!assignment) throw new Error('Assignment not found.');
    if (assignment.staff.toString() !== staffId.toString()) {
      throw new Error('You are not authorized to request materials for this assignment.');
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await MaterialRequisition.countDocuments({
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    });
    const requisitionCode = `REQ-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

    const newRequisition = new MaterialRequisition({
      requisitionCode,
      assignment: assignmentId,
      staff: staffId,
      items: items.map(item => ({
        material: item.materialId,
        requestedQuantity: item.quantity
      })),
      status: REQUISITION_STATUS.PENDING
    });

    await newRequisition.save();
    return {
      status: 'success',
      message: 'Material requisition submitted.',
      data: { requisition: newRequisition }
    };
  } catch (error) {
    console.error('[MaterialRequisitionService] requestMaterials error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};

/**
 * Warehouse Manager updates requisition status.
 */
export const updateRequisitionStatus = async (requisitionId, managerId, status, notes = '') => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const requisition = await MaterialRequisition.findById(requisitionId).populate('items.material');
    if (!requisition) throw new Error('Requisition not found.');

    requisition.status = status;
    requisition.khoManager = managerId;
    if (notes) requisition.notes = notes;

    if (status === REQUISITION_STATUS.PREPARED) {
      requisition.preparedAt = new Date();
      // Set timeout
      const timeoutDate = new Date();
      timeoutDate.setMinutes(timeoutDate.getMinutes() + REQUISITION_TIMEOUT_MINUTES);
      requisition.timeoutAt = timeoutDate;
    }

    if (status === REQUISITION_STATUS.COMPLETED) {
      requisition.completedAt = new Date();
      
      // Deduct stock and record transactions
      for (const item of requisition.items) {
        const material = await Material.findById(item.material._id);
        const beforeStock = material.currentStock;
        const afterStock = beforeStock - item.requestedQuantity;

        if (afterStock < 0) {
          throw new Error(`Insufficient stock for ${material.name} during issuance.`);
        }

        material.currentStock = afterStock;
        await material.save({ session });

        // Record transaction
        await InventoryTransaction.create([{
          material: material._id,
          type: TRANSACTION_TYPE.ISSUE,
          quantity: -item.requestedQuantity,
          beforeStock,
          afterStock,
          requisition: requisition._id,
          performedBy: requisition.staff, // Staff who received
          khoManager: managerId,
          note: `Issued for requisition ${requisition.requisitionCode}`
        }], { session });
      }
    }

    await requisition.save({ session });
    await session.commitTransaction();

    return {
      status: 'success',
      message: `Requisition status updated to ${status}.`,
      data: { requisition }
    };
  } catch (error) {
    await session.abortTransaction();
    console.error('[MaterialRequisitionService] updateRequisitionStatus error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Handle timeout for prepared requisitions.
 */
export const handleRequisitionTimeouts = async () => {
  try {
    const now = new Date();
    const overdueRequisitions = await MaterialRequisition.find({
      status: REQUISITION_STATUS.PREPARED,
      timeoutAt: { $lte: now },
      alertSent: false
    });

    for (const req of overdueRequisitions) {
      req.status = REQUISITION_STATUS.CANCELLED;
      req.cancelledAt = now;
      req.alertSent = true;
      req.notes = (req.notes || '') + ' [AUTO-CANCELLED] Pickup timeout exceeded.';
      await req.save();
      
      // Here you could trigger a notification/alert system
      console.log(`Alert: Requisition ${req.requisitionCode} cancelled due to timeout.`);
    }

    return {
      status: 'success',
      message: `Processed ${overdueRequisitions.length} timeout requisitions.`
    };
  } catch (error) {
    console.error('[MaterialRequisitionService] handleRequisitionTimeouts error:', error);
    return { status: 'error', message: error.message };
  }
};
