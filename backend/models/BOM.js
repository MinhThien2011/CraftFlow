import mongoose from 'mongoose';

const bomSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    items: [{
        material: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Material',
            required: true,
        },
        qtyPerUnit: {
            type: Number,
            required: true,
            min: 0.001,
        },
        unit: { type: String, required: true },
        note: String,
    }],
    version: { type: String, default: 'v1.0' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

bomSchema.index({ product: 1, isActive: 1 });
bomSchema.index({ 'items.material': 1 });

export default mongoose.model('Bom', bomSchema);