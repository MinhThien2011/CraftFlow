import mongoose from 'mongoose';

const inventoryBatchSchema = new mongoose.Schema({
    batchNumber: {
        type: String,
        required: true,
        unique: true,
    },
    material: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Material',
        required: true,
    },
    quantityReceived: {
        type: Number,
        required: true,
        min: 0,
    },
    quantityRemaining: {
        type: Number,
        required: true,
        min: 0,
    },
    unit: {
        type: String,
        required: true,
    },
    unitCost: {
        type: Number,
        default: 0,
    },
    receivedDate: {
        type: Date,
        default: Date.now,
    },
    expirationDate: {
        type: Date,
    },
    relatedPurchaseOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder',
    },
    relatedImportSlip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryImportExportSlip',
    },
    relatedProductionOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductionOrder',
    },
    relatedRequisition: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MaterialRequisition',
    },
    supplier: {
        name: String,
        address: String,
        phone: String,
    },
    isExhausted: {
        type: Boolean,
        default: false,
    },
    notes: String,
}, {
    timestamps: true,
    toJSON: { versionKey: false },
    toObject: { versionKey: false }
});

inventoryBatchSchema.index({ material: 1, receivedDate: 1 });
inventoryBatchSchema.index({ material: 1, expirationDate: 1 });
inventoryBatchSchema.index({ isExhausted: 1 });

inventoryBatchSchema.pre('save', function(next) {
    if (this.quantityRemaining <= 0) {
        this.isExhausted = true;
    } else {
        this.isExhausted = false;
    }
    next();
});

export default mongoose.model('InventoryBatch', inventoryBatchSchema);
