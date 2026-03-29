import mongoose from 'mongoose';
import { TRANSACTION_TYPE } from '../utils/constants.js';

const transactionSchema = new mongoose.Schema({
  material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true },
  type:     { type: String, enum: Object.values(TRANSACTION_TYPE), required: true },

  quantity:    { type: Number, required: true },
  beforeStock: Number,
  afterStock:  Number,

  productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionOrder' },
  requisition:     { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialRequisition' },

  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  khoManager:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  note: String,
}, { timestamps: true });

transactionSchema.index({ material: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model('InventoryTransaction', transactionSchema);