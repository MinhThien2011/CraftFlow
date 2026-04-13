import Joi from 'joi';
import { TRANSACTION_TYPE } from '../utils/constants.js';

/**
 * Schema for estimate material cost items
 */
const estimateMaterialCostSchema = Joi.object({
  material: Joi.string().hex().length(24).optional().messages({
    'string.hex': 'Material ID must be a valid hex string',
    'string.length': 'Material ID must be 24 characters long',
  }),
  quantity: Joi.number().min(0).required().messages({
    'number.min': 'Quantity cannot be negative',
    'any.required': 'Quantity is required'
  }),
  materialCode: Joi.string().optional().messages({
    'string.empty': 'Material code cannot be empty'
  })
}).or('material', 'materialCode');

/**
 * Schema for creating a new product
 */
export const createProductSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'any.required': 'Product name is required',
    'string.empty': 'Product name cannot be empty'
  }),
  code: Joi.string().trim().uppercase().required().messages({
    'any.required': 'Product code is required',
    'string.empty': 'Product code cannot be empty'
  }),
  description: Joi.string().allow('', null),
  category: Joi.string().trim().required().messages({
    'any.required': 'Category is required',
    'string.empty': 'Category cannot be empty'
  }),
  unit: Joi.string().trim().default('unit'),
  estimatedProductionTime: Joi.number().min(0).default(0),
  estimateMaterialCost: Joi.array().items(estimateMaterialCostSchema).default([]),
  isActive: Joi.boolean().default(true),
  baseCost: Joi.number().min(0).default(0),
  currentStock: Joi.number().min(0).default(0),
  threshold: Joi.number().min(0).default(5),
  location: Joi.string().trim().allow('', null).max(100),
  productImage: Joi.string().optional().allow('', null)
});

/**
 * Schema for updating an existing product
 */
export const updateProductSchema = Joi.object({
  name: Joi.string().trim(),
  code: Joi.string().trim().uppercase(),
  description: Joi.string().allow('', null),
  category: Joi.string().trim(),
  unit: Joi.string().trim(),
  estimatedProductionTime: Joi.number().min(0),
  estimateMaterialCost: Joi.array().items(estimateMaterialCostSchema),
  isActive: Joi.boolean(),
  baseCost: Joi.number().min(0),
  currentStock: Joi.number().min(0),
  threshold: Joi.number().min(0),
  location: Joi.string().trim().allow('', null).max(100),
  productImage: Joi.string().optional().allow('', null)
}).min(1);

/**
 * Schema for recording incoming products (Production In / Adjust)
 */
export const incomingProductSchema = Joi.object({
  productId: Joi.string().hex().length(24).required().messages({
    'any.required': 'Product ID is required'
  }),
  quantity: Joi.number().positive().required().messages({
    'number.positive': 'Quantity must be greater than zero',
    'any.required': 'Quantity is required'
  }),
  transactionType: Joi.string().valid(
    TRANSACTION_TYPE.PRODUCTION_IN,
    TRANSACTION_TYPE.RECEIVE,
    TRANSACTION_TYPE.ADJUST
  ).required().messages({
    'any.only': 'Invalid transaction type for incoming product',
    'any.required': 'Transaction type is required'
  }),
  sender: Joi.string().trim().allow('', null).max(100),
  orderRef: Joi.string().trim().allow('', null).max(100),
  notes: Joi.string().allow('', null)
});

/**
 * Schema for recording outgoing products
 */
export const outgoingProductSchema = Joi.object({
  productId: Joi.string().hex().length(24).required().messages({
    'any.required': 'Product ID is required'
  }),
  quantity: Joi.number().positive().required().messages({
    'number.positive': 'Quantity must be greater than zero',
    'any.required': 'Quantity is required'
  }),
  transactionType: Joi.string().valid(
    TRANSACTION_TYPE.SALES_OUT,
    TRANSACTION_TYPE.DAMAGE_OUT,
    TRANSACTION_TYPE.ADJUST
  ).required().messages({
    'any.only': 'Invalid transaction type for outgoing product',
    'any.required': 'Transaction type is required'
  }),
  receiver: Joi.string().trim().allow('', null).max(100),
  customer: Joi.string().trim().allow('', null).max(100),
  orderRef: Joi.string().trim().allow('', null).max(100),
  notes: Joi.string().allow('', null)
});

export const createProductValidator = (data) => createProductSchema.validate(data, { abortEarly: false, stripUnknown: true });
export const updateProductValidator = (data) => updateProductSchema.validate(data, { abortEarly: false, stripUnknown: true });
export const incomingProductValidator = (data) => incomingProductSchema.validate(data, { abortEarly: false, stripUnknown: true });
export const outgoingProductValidator = (data) => outgoingProductSchema.validate(data, { abortEarly: false, stripUnknown: true });
