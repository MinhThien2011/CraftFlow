import mongoose from 'mongoose';
import { determineStockLevel } from '../utils/inventoryHelpers.js';

const materialSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  barcode: { type: String, unique: true, sparse: true, trim: true }, // For QR/Barcode scanning
  unit: { type: String, required: true },
  color: { type: String, required: true },
  price: { type: Number, required: true, min: 0, default: 0.0 },
  currency: { type: String, default: 'VND' },
  currentStock: { type: Number, default: 0, min: 0 },
  threshold: { type: Number, default: 10, min: 0 },
  shelf: { type: mongoose.Schema.Types.ObjectId, ref: 'Shelf', required: true }, // Link to Shelf model
  locationDetails: { type: String, trim: true }, // Extra details like row/box number
  supplier: {
    name: { type: String, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  description: String,
  isActive: { type: Boolean, default: true }
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

/**
 * Virtual property to get current stock level status.
 */
materialSchema.virtual('stockLevel').get(function () {
  return determineStockLevel(this.currentStock, this.threshold);
});

materialSchema.index({ name: 1 });
materialSchema.index({ currentStock: 1 });
materialSchema.index({ price: 1 });
materialSchema.index({ isActive: 1 });
materialSchema.index({ shelf: 1 });
materialSchema.index({ locationDetails: 1 });
materialSchema.index({ supplier: 1 });

/**
 * Middleware to trigger synchronization with Products when a Material is updated.
 */
materialSchema.post('save', async function (doc) {
  if (doc) {
    await mongoose.model('Product').syncMaterialChanges(doc._id, {
      name: doc.name,
      code: doc.code,
      price: doc.price,
      unit: doc.unit,
      currency: doc.currency
    });
  }
});

/**
 * Middleware for findOneAndUpdate.
 * NOTE: This hook will only receive the updated document if { new: true } is used in the query.
 * If { new: false } (default), it receives the document BEFORE the update.
 * To be safe, we fetch the latest document if needed.
 */
materialSchema.post('findOneAndUpdate', async function (doc) {
  if (doc) {
    const updatedDoc = await this.model.findById(doc._id);
    if (updatedDoc) {
      await mongoose.model('Product').syncMaterialChanges(updatedDoc._id, {
        barcode: updatedDoc.barcode,
        name: updatedDoc.name,
        code: updatedDoc.code,
        price: updatedDoc.price,
        unit: updatedDoc.unit,
        currency: updatedDoc.currency
      });
    }
  }
});

export default mongoose.model('Material', materialSchema);