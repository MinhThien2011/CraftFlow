import mongoose from "mongoose";
import { PURCHASE_ORDER_STATUS } from "../utils/constants";

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
                materialId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Material',
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 0,
                    default: 0,
                },
                unitPrice: {
                    type: Number,
                    required: true,
                    min: 0,
                    default: 0,
                },
                totalPrice: {
                    type: Number,
                    required: true,
                    min: 0,
                    default: 0,
                }
            }
        ]
    }
    ,
}, { timestamps: true })

export default mongoose.model('PurchaseOrder', PurchaseOrderSchema);