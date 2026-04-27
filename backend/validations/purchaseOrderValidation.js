import joi from 'joi';
import { PURCHASE_ORDER_STATUS } from '../utils/constants.js';

const purchaseOrderSchema = joi.object({
    orderReason: joi.string().optional(),
    priority: joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
    productionOrder: joi.string().allow('', null),
    materialAlert: joi.string().allow('', null),
    purchaseOrderItems: joi.array().items(joi.object({
        material: joi.string().required(),
        quantity: joi.number().min(0.001).required(),
    })).optional().default([]),
});

const updateStatusPurchaseOrderSchema = joi.object({
    status: joi.string().valid(PURCHASE_ORDER_STATUS.ACCEPTED, PURCHASE_ORDER_STATUS.REJECTED).required(),
    adminNotes: joi.string().required(),

});

export const updateStatusPurchaseOrderValidator = (data) => updateStatusPurchaseOrderSchema.validate(data, { abortEarly: false, stripUnknown: true });
export const purchaseOrderValidator = (data) => purchaseOrderSchema.validate(data, { abortEarly: false, stripUnknown: true });
