import mongoose from 'mongoose';

const bomItemSchema = new mongoose.Schema({
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
}, {
    toJSON: {
        versionKey: false,
    },
    toObject: {
        // virtuals: true,
        versionKey: false,
    }
});

const bomSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    items: [bomItemSchema],
    version: { type: String, default: 'v1.0' },
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true,
    toJSON: {
        // virtuals: true,
        versionKey: false,
    },
    toObject: {
        // virtuals: true,
        versionKey: false,
    }
});

bomSchema.index({ product: 1, isActive: 1 });
bomSchema.index({ 'items.material': 1 });

export default mongoose.model('Bom', bomSchema);