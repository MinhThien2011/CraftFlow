import mongoose from 'mongoose';

const InventoryShrinkageReportSchema = new mongoose.Schema({
    reportDate: {
        type: Date,
        required: true,
    },
    report: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inventory',
        required: true,
    },
    shrinkageAmount: {
        type: Number,
        required: true,
    },
    shrinkageReason: {
        type: String,
        required: true,
    },
    shrinkageImage: {
        type: String,
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
});

export default mongoose.model('InventoryShrinkageReport', InventoryShrinkageReportSchema);