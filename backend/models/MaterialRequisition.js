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
}, {
  _id: true,
  toJSON: {
    // virtuals: true,
    versionKey: false,
    // transform: function (doc, ret) {
    //   delete ret._id;
    //   return ret;
    // }
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

const requisitionSchema = new mongoose.Schema({
  requisitionCode: {
    type: String,
    unique: true
  },
  productionOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductionOrder',
    required: true
  },
  createdBy: {
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
  evidenceImage: String,
  preparedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  notes: String,
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
  },
  toObject: {
    virtuals: true,
    versionKey: false,
  }
});

requisitionSchema.index({ staff: 1, status: 1 });
requisitionSchema.index({ status: 1, timeoutAt: 1 });

export default mongoose.model('MaterialRequisition', requisitionSchema);
