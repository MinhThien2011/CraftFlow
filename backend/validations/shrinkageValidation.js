import Joi from 'joi';
import { SHRINKAGE_STATUS } from '../utils/constants.js';

const objectId = Joi.string().hex().length(24);

/**
 * Validation for creating a shrinkage report
 */
export const createShrinkageReportValidator = (data) => {
    const schema = Joi.object({
        batchId: objectId.required().messages({
            'any.required': 'Batch ID is required.',
            'string.length': 'Invalid Batch ID format.'
        }),
        materialId: objectId.required().messages({
            'any.required': 'Material ID is required.',
            'string.length': 'Invalid Material ID format.'
        }),
        productionOrderId: objectId.optional().allow(null),
        shrinkageAmount: Joi.number().positive().required().messages({
            'number.base': 'Shrinkage amount must be a number.',
            'number.positive': 'Shrinkage amount must be greater than zero.',
            'any.required': 'Shrinkage amount is required.'
        }),
        shrinkageReason: Joi.string().trim().min(5).max(500).required().messages({
            'string.empty': 'Shrinkage reason is required.',
            'string.min': 'Reason must be at least 5 characters long.'
        }),
        shrinkageImage: Joi.string().uri().optional().allow('', null),
        notableMetrics: Joi.string().trim().max(1000).optional().allow('', null)
    });
    return schema.validate(data, { abortEarly: false });
};

/**
 * Validation for updating shrinkage report status
 */
export const updateShrinkageStatusValidator = (data) => {
    const schema = Joi.object({
        status: Joi.string().valid(...Object.values(SHRINKAGE_STATUS)).required().messages({
            'any.only': 'Invalid shrinkage status.',
            'any.required': 'Status is required.'
        }),
        adminNotes: Joi.string().trim().max(500).optional().allow('', null)
    });
    return schema.validate(data, { abortEarly: false });
};

export const createShrinkageReturnRequestValidator = (data) => {
    const schema = Joi.object({
        requestedQuantity: Joi.number().positive().optional()
    });
    return schema.validate(data, { abortEarly: false });
};
