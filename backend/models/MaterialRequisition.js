import mongoose from 'mongoose';
import { REQUISITION_STATUS } from '../utils/constants.js';

const materialItemSchema = new mongoose.Schema({
  material: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true
  },
  requestedQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  actualQuantity: {
    type: Number,
    default: 0
  }
});

const requisitionSchema = new mongoose.Schema({
  requisitionCode: {
    type: String,
    unique: true
  },
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductionOrderAssignment',
    required: true
  },
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [materialItemSchema],
  status: {
    type: String,
    enum: Object.values(REQUISITION_STATUS),
    default: REQUISITION_STATUS.PENDING,
    index: true
  },
  khoManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  preparedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  timeoutAt: Date,
  notes: String,
  alertSent: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

requisitionSchema.index({ staff: 1, status: 1 });
requisitionSchema.index({ status: 1, timeoutAt: 1 });

export default mongoose.model('MaterialRequisition', requisitionSchema);
