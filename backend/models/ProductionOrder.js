import mongoose from 'mongoose';
import { ORDER_STATUS, PRIORITY } from '../utils/constants.js';

const productionOrderSchema = new mongoose.Schema({
  orderCode: { type: String, unique: true },   // Auto generate: CF-20260325-001
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.PENDING,
    index: true,
  },

  // Deadline & Planning
  deadline: { type: Date },
  autoDeadline: { type: Boolean, default: true },
  estimatedCompletionTime: { type: Number, default: 0 },

  priority: { type: String, enum: Object.values(PRIORITY), default: PRIORITY.MEDIUM },
  // Cost
  totalPlannedCost: Number,
  actualCost: Number,
  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  completedAt: Date,
  holdReason: String,

  overdueAlertSent: { type: Boolean, default: false },
  overdueAt: { type: Date },

}, { timestamps: true });

// Compound indexes
productionOrderSchema.index({ status: 1, priority: 1, deadline: 1 });
productionOrderSchema.index({ productId: 1, status: 1 });

export default mongoose.model('ProductionOrder', productionOrderSchema);