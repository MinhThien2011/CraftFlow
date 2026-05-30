import mongoose from 'mongoose';
import { REQUISITION_STATUS } from '../utils/constants.js';

const productExportItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  requestedQuantity: {
    type: Number,
    required: true,
    min: 1
  },
  actualQuantity: {
    type: Number,
    default: 0
  }
}, { _id: false });

const productExportRequestSchema = new mongoose.Schema({
  requestCode: {
    type: String,
    unique: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [productExportItemSchema],
  status: {
    type: String,
    enum: Object.values(REQUISITION_STATUS),
    default: REQUISITION_STATUS.PENDING,
    index: true
  },
  adminApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  khoManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  relatedSlip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryImportExportSlip'
  },
  notes: String,
  reason: String,
  approvedAt: Date,
  completedAt: Date
}, {
  timestamps: true,
  toJSON: { versionKey: false },
  toObject: { versionKey: false }
});

productExportRequestSchema.index({ createdBy: 1 });
productExportRequestSchema.index({ relatedSlip: 1 });
productExportRequestSchema.index({ adminApprovedBy: 1 });

export default mongoose.model('ProductExportRequest', productExportRequestSchema);
