import mongoose from 'mongoose';
import { INVENTORY_IMPORT_EXPORT_SLIP_STATUS, INVENTORY_IMPORT_EXPORT_SLIP_TYPE } from '../utils/constants.js';

/**
 * Model representing Goods Received Note (Phiếu Nhập Kho - Form 01-VT)
 * and Goods Delivery Note (Phiếu Xuất Kho - Form 02-VT)
 * according to Circular 133/2016/TT-BTC.
 */
const InventoryImportExportSlipSchema = new mongoose.Schema({
    // --- Slip Identity ---
    type: {
        type: String,
        enum: Object.values(INVENTORY_IMPORT_EXPORT_SLIP_TYPE),
        required: true,
    },
    slipNumber: { // "Số"
        type: String,
        required: true,
        unique: true,
    },
    date: { // "Ngày... tháng... năm..."
        type: Date,
        required: true,
        default: Date.now,
    },
    status: {
        type: String,
        enum: Object.values(INVENTORY_IMPORT_EXPORT_SLIP_STATUS),
        default: INVENTORY_IMPORT_EXPORT_SLIP_STATUS.PENDING,
        trim: true,
    },

    // --- Header Information ---
    unit: { type: String, trim: true }, // "Đơn vị"
    department: { type: String, trim: true }, // "Bộ phận"
    accounting: {
        debit: { type: String, trim: true }, // "Nợ"
        credit: { type: String, trim: true }, // "Có"
    },

    // --- Transaction Details ---
    personName: { // "Họ và tên người giao" (IMPORT) or "Họ và tên người nhận hàng" (EXPORT)
        type: String,
        trim: true,
    },
    addressOrDepartment: { // "Địa chỉ (bộ phận)" - specific to Export form
        type: String,
        trim: true,
    },
    reason: { // "Lý do nhập/xuất kho"
        type: String,
        required: true,
        trim: true,
    },
    relatedProductionOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductionOrder',
    },
    relatedPurchaseOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder',
    },
    relatedRequisition: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MaterialRequisition',
    },
    warehouse: {
        name: { type: String, trim: true }, // "Nhập/Xuất tại kho (ngăn lô)"
        location: { type: String, trim: true }, // "Địa điểm"
    },

    // --- Reference Documents (Mainly for Import) ---
    referenceDoc: { // "Theo... số... ngày... tháng... năm... của..."
        description: { type: String, trim: true }, // e.g., "Hóa đơn", "Lệnh điều động"
        number: { type: String, trim: true },
        date: { type: Date },
        issuer: { type: String, trim: true }, // "của..." (Entity that issued the document)
    },

    // --- Items Table ---
    items: [{
        material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },

        // Snapshots to preserve historical data if Material/Product is updated or deleted
        itemName: { type: String, required: true }, // "Tên, nhãn hiệu, quy cách..."
        itemCode: { type: String, required: true }, // "Mã số"
        unit: { type: String, required: true },     // "Đơn vị tính"

        quantity: {
            requested: { type: Number, required: true, default: 0 }, // "Theo chứng từ" / "Yêu cầu"
            provisional: { type: Number, default: 0 },              // "Số lượng tạm tính" (at RECEIVED)
            actual: { type: Number, required: true, default: 0 },    // "Thực nhập" / "Thực xuất" (at INSPECTED)
        },
        unitPrice: { type: Number, required: true, default: 0 },    // "Đơn giá"
        amount: { type: Number, required: true, default: 0 },       // "Thành tiền"

        // Batch tracking for FIFO
        batchNumber: { type: String }, // Batch number for this specific item
        expirationDate: { type: Date }, // Expiration date for this batch

        // Storage details
        shelf: { type: mongoose.Schema.Types.ObjectId, ref: 'Shelf' }, // Vị trí kho (Shelf/Bin)
        itemNote: { type: String, trim: true }, // Ghi chú riêng cho từng mặt hàng (e.g., "bị móp méo")
    }],

    // --- Totals ---
    totalAmount: { // "Cộng"
        type: Number,
        default: 0,
    },
    totalAmountInWords: { // "Tổng số tiền (viết bằng chữ)"
        type: String,
        trim: true,
    },
    originalDocsCount: { // "Số chứng từ gốc kèm theo"
        type: String,
        trim: true,
    },

    // --- Signatures & Audit ---
    signatures: {
        creator: { // "Người lập phiếu"
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        personInOut: { // Name of Deliverer/Receiver for manual record
            type: String,
            trim: true,
        },
        storekeeper: { // "Thủ kho"
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        chiefAccountant: { // "Kế toán trưởng"
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        manager: { // "Giám đốc"
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },

    // --- Attachments & System ---
    images: [{ // Physical scans of the signed paper slips
        type: String,
    }],
    inStockAt: { // Timestamp when status became IN_STOCK
        type: Date,
    },
    finalizedAt: { // Timestamp when status became IN_STOCK or COMPLETED
        type: Date,
    },
    isImageUploadLate: { // Flag if image uploaded after 3 days
        type: Boolean,
        default: false,
    },
    imageUploadedAt: {
        type: Date,
    },
    notes: { type: String, trim: true },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Middleware to calculate amount and totalAmount before saving
InventoryImportExportSlipSchema.pre('save', function () {
    this.items.forEach(item => {
        item.amount = item.quantity.actual * item.unitPrice;
    });
    this.totalAmount = this.items.reduce((sum, item) => sum + item.amount, 0);
    return this;
});

InventoryImportExportSlipSchema.index({ type: 1, status: 1 });
InventoryImportExportSlipSchema.index({ relatedProductionOrder: 1 });
InventoryImportExportSlipSchema.index({ relatedPurchaseOrder: 1 });
InventoryImportExportSlipSchema.index({ relatedRequisition: 1 });
InventoryImportExportSlipSchema.index({ 'signatures.creator': 1 });
InventoryImportExportSlipSchema.index({ 'signatures.storekeeper': 1 });

export default mongoose.model('InventoryImportExportSlip', InventoryImportExportSlipSchema);
