import mongoose from "mongoose";
import { PURCHASE_ORDER_STATUS, PRIORITY } from "../utils/constants.js";

const PurchaseOrderSchema = new mongoose.Schema({
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(PURCHASE_ORDER_STATUS),
        default: PURCHASE_ORDER_STATUS.PENDING,
    },
    priority: {
        type: String,
        enum: Object.values(PRIORITY),
        default: PRIORITY.MEDIUM,
    },
    productionOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductionOrder',
    },
    sourceProductionOrders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductionOrder',
    }],
    materialAlert: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MaterialAlert',
    },
    orderReason: {
        type: String,
        default: '',
    },
    adminNotes: {
        type: String,
        default: '',
    },
    purchaseOrderItems: {
        type: [
            {
                material: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Material',
                    required: true,
                },
                materialCode: {
                    type: String,
                    required: true,
                },
                unit: {
                    type: String,
                    default: 'unit',
                },
                currency: {
                    type: String,
                    default: 'VND',
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 0,
                    default: 0,
                },
                priceAtTimePurchase: {
                    type: Number,
                    required: true,
                    min: 0,
                    default: 0,
                },
                totalPriceAtTimePurchase: {
                    type: Number,
                    required: true,
                    min: 0,
                    default: 0,
                }
            }
        ]
    },
    totalBaseCost: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
}, { timestamps: true })

PurchaseOrderSchema.index({ status: 1, createdAt: -1, _id: -1 });
PurchaseOrderSchema.index({ creator: 1, createdAt: -1, _id: -1 });
PurchaseOrderSchema.index({ productionOrder: 1, createdAt: -1 });
PurchaseOrderSchema.index({ sourceProductionOrders: 1, createdAt: -1 });
PurchaseOrderSchema.index({ materialAlert: 1 });
PurchaseOrderSchema.index({ 'purchaseOrderItems.material': 1 });

export default mongoose.model('PurchaseOrder', PurchaseOrderSchema);
