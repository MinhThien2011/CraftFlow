import Joi from 'joi';
import { REQUISITION_STATUS } from '../utils/constants.js';

const objectId = Joi.string().hex().length(24);

/**
 * Validation for creating a product export request
 */
export const createExportRequestValidator = (data) => {
    const schema = Joi.object({
        items: Joi.array().items(
            Joi.object({
                product: objectId.required().messages({
                    'any.required': 'Sản phẩm là bắt buộc.',
                    'string.length': 'ID sản phẩm không hợp lệ.'
                }),
                requestedQuantity: Joi.number().integer().min(1).required().messages({
                    'number.min': 'Số lượng yêu cầu phải ít nhất là 1.',
                    'any.required': 'Số lượng yêu cầu là bắt buộc.'
                })
            })
        ).min(1).required().messages({
            'array.min': 'Yêu cầu phải có ít nhất một sản phẩm.'
        }),
        reason: Joi.string().trim().min(5).required().messages({
            'string.min': 'Lý do xuất hàng phải có ít nhất 5 ký tự.',
            'any.required': 'Lý do xuất hàng là bắt buộc.'
        }),
        notes: Joi.string().trim().allow('', null)
    });
    return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

/**
 * Validation for updating request status (Admin)
 */
export const updateExportRequestStatusValidator = (data) => {
    const schema = Joi.object({
        status: Joi.string().valid(REQUISITION_STATUS.APPROVED, REQUISITION_STATUS.REJECTED).required().messages({
            'any.only': 'Trạng thái chỉ có thể là approved hoặc rejected.',
            'any.required': 'Trạng thái là bắt buộc.'
        })
    });
    return schema.validate(data, { abortEarly: false, stripUnknown: true });
};
