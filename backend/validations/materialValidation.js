import Joi from 'joi';
import { TRANSACTION_TYPE } from '../utils/constants.js';

/**
 * Validation schema for creating a new material.
 */
const materialSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Material name is required.',
    'string.min': 'Material name must be at least 2 characters long.'
  }),
  code: Joi.string().trim().uppercase().min(2).max(20).required().messages({
    'string.empty': 'Material code is required.',
    'string.min': 'Material code must be at least 2 characters long.'
  }),
  unit: Joi.string().trim().required().messages({
    'string.empty': 'Unit of measure is required.'
  }),
  color: Joi.string().trim().required(),
  price: Joi.number().min(0).required().messages({
    'number.base': 'Price must be a number.',
    'number.min': 'Price cannot be negative.'
  }),
  currentStock: Joi.number().min(0).default(0),
  threshold: Joi.number().min(0).default(10),
  description: Joi.string().trim().allow('', null).max(500),
  isActive: Joi.boolean().default(true)
}).required();

/**
 * Validation schema for updating an existing material.
 */
const updateMaterialSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  unit: Joi.string().trim(),
  color: Joi.string().trim(),
  price: Joi.number().min(0),
  threshold: Joi.number().min(0),
  description: Joi.string().trim().allow('', null).max(500),
  isActive: Joi.boolean()
}).min(1).required().messages({
  'object.min': 'At least one field must be provided for update.'
});

/**
 * Validation schema for stock adjustment (Stock In/Out).
 */
const adjustStockSchema = Joi.object({
  type: Joi.string().valid(TRANSACTION_TYPE.RECEIVE, TRANSACTION_TYPE.ADJUST).required().messages({
    'any.only': 'Invalid transaction type for manual adjustment.'
  }),
  quantity: Joi.number().not(0).required().messages({
    'number.base': 'Quantity must be a number.',
    'any.required': 'Quantity is required.'
  }),
  note: Joi.string().trim().max(200).optional()
}).required();

/**
 * Validation schema for stock adjustment via barcode (using code instead of ID).
 */
const adjustStockByCodeSchema = adjustStockSchema.keys({
  code: Joi.string().trim().uppercase().required().messages({
    'any.required': 'Material code is required for barcode adjustment.'
  })
});

export const createMaterialValidator = (body) => materialSchema.validate(body, { abortEarly: false });
export const updateMaterialValidator = (body) => updateMaterialSchema.validate(body, { abortEarly: false });
export const adjustStockValidator = (body) => adjustStockSchema.validate(body, { abortEarly: false });
export const adjustStockByCodeValidator = (body) => adjustStockByCodeSchema.validate(body, { abortEarly: false });
