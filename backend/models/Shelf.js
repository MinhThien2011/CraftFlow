import mongoose from 'mongoose';

const shelfSchema = new mongoose.Schema({
    shelfCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    warehouseSection: {
        type: String,
        required: true,
        trim: true,
        default: 'General'
    },
    category: {
        type: String,
        enum: ['Material', 'Product', 'General'],
        default: 'General'
    },
    maxCapacity: {
        type: Number,
        default: 1000, // Default units or weight
        min: 0
    },
    currentLoad: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ['Available', 'Full', 'Maintenance'],
        default: 'Available'
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual to check if shelf is empty
shelfSchema.virtual('isEmpty').get(function () {
    return this.currentLoad === 0;
});

// Indexing for faster searches
shelfSchema.index({ shelfCode: 1 });
shelfSchema.index({ warehouseSection: 1 });
shelfSchema.index({ category: 1 });
shelfSchema.index({ status: 1 });

export default mongoose.model('Shelf', shelfSchema);
