import mongoose from 'mongoose';
import { SHRINKAGE_STATUS } from '../utils/constants.js';

const InventoryShrinkageReportSchema = new mongoose.Schema({
    reportCode: {
        type: String,
        required: true,
        unique: true,
    },
    reportDate: {
        type: Date,
        default: Date.now,
    },
    // Linking to the specific batch where shrinkage occurred
    batch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryBatch',
        required: true,
    },
    material: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Material',
        required: true,
    },
    shrinkageAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    shrinkageReason: {
        type: String,
        required: true,
    },
    shrinkageImage: [{
        type: String, // URL to image in Cloudinary
    }],
    status: {
        type: String,
        enum: Object.values(SHRINKAGE_STATUS),
        default: SHRINKAGE_STATUS.PENDING,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    checkedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    decisionBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    adminNotes: {
        type: String,
    },
    resolvedAt: {
        type: Date,
    },
    decisionAt: {
        type: Date,
    }
}, {
    timestamps: true,
    toJSON: { versionKey: false },
    toObject: { versionKey: false }
});

InventoryShrinkageReportSchema.index({ status: 1 });
InventoryShrinkageReportSchema.index({ material: 1 });

export default mongoose.model('InventoryShrinkageReport', InventoryShrinkageReportSchema);
