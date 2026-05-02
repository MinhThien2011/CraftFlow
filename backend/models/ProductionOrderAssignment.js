import mongoose from 'mongoose';
import { ORDER_STATUS } from '../utils/constants.js';

const assignmentSchema = new mongoose.Schema({
  productionOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductionOrder',
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignedQuantity: { type: Number, required: true, min: 1 },
  completedQuantity: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.ASSIGNED,
  },
  notes: String,
  previousStaff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reassignedAt: Date,
  startedAt: Date,
  finishedAt: Date,
  reportedMilestones: {
    type: [Number],
    default: []
  },
  lastReportedAt: Date,
}, {
  timestamps: true,
  toJSON: {
    // virtuals: true,
    versionKey: false,
  },
  toObject: {
    // virtuals: true,
    versionKey: false,
    // transform: function (doc, ret) {
    //   delete ret._id;
    //   return ret;
    // }
  }
});


assignmentSchema.index({ productionOrder: 1, staff: 1 }, { unique: true });
assignmentSchema.index({ productionOrder: 1, status: 1 });
assignmentSchema.index({ staff: 1, status: 1 });

export default mongoose.model('ProductionOrderAssignment', assignmentSchema);