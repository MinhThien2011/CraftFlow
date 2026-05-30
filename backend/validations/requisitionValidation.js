import joi from 'joi';
import { REQUISITION_STATUS } from '../utils/constants.js';

const updateRequisitionStatusSchema = joi.object({
    status: joi.string().required().valid(...Object.values(REQUISITION_STATUS)).messages({
        'any.only': `Invalid status. Valid values are: ${Object.values(REQUISITION_STATUS).join(', ')}`
    }),
    notes: joi.string().optional().allow('').trim().max(500),
    evidenceImage: joi.string().optional().allow('').trim(),
});

export const updateRequisitionStatusValidator = (data) => updateRequisitionStatusSchema.validate(data, { abortEarly: false, stripUnknown: true });
