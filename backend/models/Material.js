import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  unit: { type: String, required: true },
  currentStock: { type: Number, default: 0, min: 0 },
  threshold: { type: Number, default: 10, min: 0 },
  description: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

materialSchema.index({ currentStock: 1 });

export default mongoose.model('Material', materialSchema);