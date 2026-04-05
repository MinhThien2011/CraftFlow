import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  unit: { type: String, required: true },
  color: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  currentStock: { type: Number, default: 0, min: 0 },
  threshold: { type: Number, default: 10, min: 0 },
  description: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

materialSchema.index({ name: 1 });
materialSchema.index({ currentStock: 1 });
materialSchema.index({ price: 1 });
materialSchema.index({ isActive: 1 });

export default mongoose.model('Material', materialSchema);