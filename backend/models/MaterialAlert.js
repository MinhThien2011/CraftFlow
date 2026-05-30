import mongoose from 'mongoose';

const materialAlertSchema = new mongoose.Schema({
  material: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true,
  },
  materialCode: String,
  materialName: String,
  neededQuantity: {
    type: Number,
    required: true,
  },
  availableQuantity: {
    type: Number,
    required: true,
  },
  shortageQuantity: {
    type: Number,
    required: true,
  },
  productionOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductionOrder',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'ordered', 'resolved', 'ignored'],
    default: 'pending',
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
  }
}, {
  timestamps: true,
  toJSON: { versionKey: false },
  toObject: { versionKey: false }
});

materialAlertSchema.index({ material: 1, status: 1 });
materialAlertSchema.index({ productionOrder: 1 });
materialAlertSchema.index({ status: 1, createdAt: -1, _id: -1 });
materialAlertSchema.index({ productionOrder: 1, status: 1 });
materialAlertSchema.index({ purchaseOrder: 1 });

export default mongoose.model('MaterialAlert', materialAlertSchema);
