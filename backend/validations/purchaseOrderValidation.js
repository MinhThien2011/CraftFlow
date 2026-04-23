import joi from 'joi';
import { PURCHASE_ORDER_STATUS } from '../utils/constants.js';

const purchaseOrderSchema = joi.object({
    orderReason: joi.string().required(),
    purchaseOrderItems: joi.array().items(joi.object({
        material: joi.string().required(),
        quantity: joi.number().min(0).required(),
    })).required(),
});

const updateStatusPurchaseOrderSchema = joi.object({
    status: joi.string().valid(PURCHASE_ORDER_STATUS.ACCEPTED, PURCHASE_ORDER_STATUS.REJECTED).required(),
    adminNotes: joi.string().required(),

});

export const updateStatusPurchaseOrderValidator = (data) => updateStatusPurchaseOrderSchema.validate(data, { abortEarly: false, stripUnknown: true });
export const purchaseOrderValidator = (data) => purchaseOrderSchema.validate(data, { abortEarly: false, stripUnknown: true });
