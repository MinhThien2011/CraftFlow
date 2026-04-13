import mongoose from 'mongoose';
import { TRANSACTION_TYPE } from '../utils/constants.js';

const transactionSchema = new mongoose.Schema({
  // Item information - can be either a material or a product
  material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },

  type: { type: String, enum: Object.values(TRANSACTION_TYPE), required: true },
  quantity: { type: Number, required: true },
  beforeStock: Number,
  afterStock: Number,

  // Logistics and Participants
  sender: { type: String, trim: true }, // Person who delivered/imported the goods
  receiver: { type: String, trim: true }, // Person who received/exported the goods
  customer: { type: String, trim: true }, // Customer information (if applicable)
  orderRef: { type: String, trim: true }, // Reference to Order ID, Production Order code, etc.

  // References to internal system documents
  productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionOrder' },
  requisition: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialRequisition' },

  // Internal system tracking
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  khoManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  location: String, // Temporary or specific location for this transaction
  note: String,
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

transactionSchema.index({ material: 1, createdAt: -1 });
transactionSchema.index({ product: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model('InventoryTransaction', transactionSchema);