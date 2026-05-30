import Joi from 'joi';
import { ORDER_STATUS, PRIORITY } from '../utils/constants.js';

const objectId = Joi.string().hex().length(24).messages({
    'string.hex': 'ID must be a valid hex string.',
    'string.length': 'ID must be 24 characters long.',
    'any.required': 'ID is required.'
});

const orderItemSchema = Joi.object({
    materialId: objectId.required().messages({
        'any.required': 'Material ID is required.'
    }),
    quantityUsed: Joi.number().min(0.01).required().messages({
        'number.base': 'Quantity used must be a number.',
        'number.min': 'Quantity used must be at least 0.01 unit.',
        'any.required': 'Quantity used is required.'
    })
});


const createOrderSchema = Joi.object({
    productId: objectId.required().messages({
        'any.required': 'Product ID is required.'
    }),
    quantity: Joi.number().integer().min(1).required().messages({
        'number.base': 'Quantity must be a number.',
        'number.integer': 'Quantity must be an integer.',
        'number.min': 'Quantity must be at least 1.',
        'any.required': 'Quantity is required.'
    }),
    items: Joi.array().items(orderItemSchema).min(1).required().messages({
        'array.base': 'Items must be an array.',
        'array.min': 'Order must have at least one item.',
        'any.required': 'Items are required.'
    }),
    status: Joi.string().valid(...ORDER_STATUS).default('Pending').messages({
        'string.base': 'Status must be a string.',
        'any.only': `Status is invalid. Accepted values: ${ORDER_STATUS.join(', ')}`
    }),
    priority: Joi.string().valid(...PRIORITY).default('Medium').messages({
        'string.base': 'Priority must be a string.',
        'any.only': `Priority is invalid. Acceptable values: ${PRIORITY.join(', ')}`
    }),
    deadline: Joi.date().iso().min('now').required().messages({
        'date.base': 'Deadline must be a valid date.',
        'date.format': 'Deadline must follow ISO 8601 format.',
        'date.min': 'Deadline cannot be in the past.',
        'any.required': 'Deadline is required.'
    }),
    assignedTo: objectId.optional(),
    notes: Joi.string().trim().max(500).optional().messages({
        'string.max': 'Notes cannot exceed 500 characters.'
    }),
    createdBy: objectId.required().messages({
        'any.required': 'Created by ID is required.'
    })
}).required();


const updateOrderSchema = Joi.object({
    quantity: Joi.number().integer().min(1),
    items: Joi.array().items(orderItemSchema).min(1),
    status: Joi.string().valid(...ORDER_STATUS),
    priority: Joi.string().valid(...PRIORITY),
    deadline: Joi.date().iso().min('now'),
    assignedTo: objectId.allow(null),
    notes: Joi.string().trim().max(500).allow(''),
    completedAt: Joi.date().iso().optional().allow(null)
}).min(1).messages({
    'object.min': 'At least one field must be updated.'
});


// --- Exports ---

export const createOrderValidator = (body) => createOrderSchema.validate(body, { abortEarly: false });
export const updateOrderValidator = (body) => updateOrderSchema.validate(body, { abortEarly: false });
