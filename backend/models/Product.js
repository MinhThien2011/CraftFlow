import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  description: String,
  category: String,
  unit: { type: String, default: 'unit' },
  estimatedProductionTime: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
  baseCost: { type: Number, default: 0 }
}, { timestamps: true });

productSchema.index({ isActive: 1 });

export default mongoose.model('Product', productSchema);