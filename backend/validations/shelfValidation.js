import Joi from 'joi';

/**
 * Validation schema for creating a new shelf.
 */
export const createShelfSchema = Joi.object({
  shelfCode: Joi.string().trim().uppercase().required().messages({
    'string.empty': 'Shelf code is required.',
    'any.required': 'Shelf code is required.'
  }),
  warehouseSection: Joi.string().trim().required().messages({
    'string.empty': 'Warehouse section is required.'
  }),
  zone: Joi.string().trim().allow('', null),
  aisle: Joi.string().trim().allow('', null),
  level: Joi.string().trim().allow('', null),
  bin: Joi.string().trim().allow('', null),
  category: Joi.string().valid('Material', 'Product', 'General').default('General'),
  maxCapacity: Joi.number().min(0).default(1000),
  status: Joi.string().valid('Available', 'Full', 'Maintenance').default('Available'),
  description: Joi.string().trim().allow('', null).max(500),
  isActive: Joi.boolean().default(true)
}).required();

/**
 * Validation schema for updating an existing shelf.
 */
export const updateShelfSchema = Joi.object({
  shelfCode: Joi.string().trim().uppercase(),
  warehouseSection: Joi.string().trim(),
  zone: Joi.string().trim().allow('', null),
  aisle: Joi.string().trim().allow('', null),
  level: Joi.string().trim().allow('', null),
  bin: Joi.string().trim().allow('', null),
  category: Joi.string().valid('Material', 'Product', 'General'),
  maxCapacity: Joi.number().min(0),
  status: Joi.string().valid('Available', 'Full', 'Maintenance'),
  description: Joi.string().trim().allow('', null).max(500),
  isActive: Joi.boolean()
}).min(1).required().messages({
  'object.min': 'At least one field must be provided for update.'
});

export const createShelfValidator = (body) => createShelfSchema.validate(body, { abortEarly: false, stripUnknown: true });
export const updateShelfValidator = (body) => updateShelfSchema.validate(body, { abortEarly: false, stripUnknown: true });
