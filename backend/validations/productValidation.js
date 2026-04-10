import Joi from 'joi';
import { TRANSACTION_TYPE } from '../utils/constants.js';

/**
 * Schema for estimate material cost items
 */
const estimateMaterialCostSchema = Joi.object({
  material: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Material ID must be a valid hex string',
    'string.length': 'Material ID must be 24 characters long',
    'any.required': 'Material ID is required'
  }),
  quantity: Joi.number().min(0).required().messages({
    'number.min': 'Quantity cannot be negative',
    'any.required': 'Quantity is required'
  }),
  materialCode: Joi.string().required(),
  materialName: Joi.string().required(),
  unit: Joi.string().default('unit'),
  priceAtTime: Joi.number().min(0).required()
});

/**
 * Validator for creating a new product
 */
export const createProductValidator = (data) => {
  const schema = Joi.object({
    name: Joi.string().trim().required().messages({
      'any.required': 'Product name is required',
      'string.empty': 'Product name cannot be empty'
    }),
    code: Joi.string().trim().uppercase().required().messages({
      'any.required': 'Product code is required',
      'string.empty': 'Product code cannot be empty'
    }),
    description: Joi.string().allow('', null),
    category: Joi.string().trim().allow('', null),
    unit: Joi.string().trim().default('unit'),
    estimatedProductionTime: Joi.number().min(0).default(0),
    estimateMaterialCost: Joi.array().items(estimateMaterialCostSchema).default([]),
    isActive: Joi.boolean().default(true),
    baseCost: Joi.number().min(0).default(0),
    currentStock: Joi.number().min(0).default(0),
    threshold: Joi.number().min(0).default(5)
  });

  return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

/**
 * Validator for updating an existing product
 */
export const updateProductValidator = (data) => {
  const schema = Joi.object({
    name: Joi.string().trim(),
    code: Joi.string().trim().uppercase(),
    description: Joi.string().allow('', null),
    category: Joi.string().trim().allow('', null),
    unit: Joi.string().trim(),
    estimatedProductionTime: Joi.number().min(0),
    estimateMaterialCost: Joi.array().items(estimateMaterialCostSchema),
    isActive: Joi.boolean(),
    baseCost: Joi.number().min(0),
    currentStock: Joi.number().min(0),
    threshold: Joi.number().min(0)
  }).min(1); // At least one field must be provided for update

  return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

/**
 * Validator for recording outgoing products
 */
export const outgoingProductValidator = (data) => {
  const schema = Joi.object({
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
    notes: Joi.string().allow('', null)
  });

  return schema.validate(data, { abortEarly: false, stripUnknown: true });
};
