import mongoose from 'mongoose';
import { REQUISITION_STATUS } from '../utils/constants.js';

const requisitionSchema = new mongoose.Schema({
  productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionOrder', required: true },
  requestedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  status: {
    type: String,
    enum: Object.values(REQUISITION_STATUS),
    default: REQUISITION_STATUS.PENDING,
  },

  approvedAt: Date,
  timeoutAt:  Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

requisitionSchema.index({ productionOrder: 1, status: 1 });
requisitionSchema.index({ timeoutAt: 1 });

export default mongoose.model('MaterialRequisition', requisitionSchema);