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
    productionOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductionOrder',
        required: true,
    },
    items: [bomItemSchema],
    version: { type: String, default: 'v1.0' },
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true,
    toJSON: {
        versionKey: false,
    },
    toObject: {
        versionKey: false,
    }
});

bomSchema.index({ productionOrder: 1, isActive: 1 });
bomSchema.index({ 'items.material': 1 });

export default mongoose.model('Bom', bomSchema);