import Joi from 'joi';
import { ORDER_STATUS, TRANSACTION_TYPE } from '../utils/constants.js';

const objectId = Joi.string().hex().length(24).messages({
  'string.pattern.base': `"{{#label}}" must be a valid MongoDB ObjectId`,
});

const createOrderSchema = Joi.object({
  productId: objectId.required(),
  quantity: Joi.number().integer().min(1).required(),
  notes: Joi.string().trim().allow(''),
  deadline: Joi.date().iso().greater('now').required(),
});

const assignOrderSchema = Joi.object({
  orderId: objectId.required(),
  assignments: Joi.array().items(
    Joi.object({
      staffId: objectId.required(),
      assignedQuantity: Joi.number().integer().min(1).required(),
    })
  ).min(1).required(),
});

const reassignTaskSchema = Joi.object({
  assignmentId: objectId.required(),
  newStaffId: objectId.required(),
  reason: Joi.string().trim().min(5).required(),
});

 const updateAssignmentStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(ORDER_STATUS)).required(),
  completedQuantity: Joi.number().integer().min(0).optional(),
});

const outgoingProductSchema = Joi.object({
  productId: objectId.required(),
  quantity: Joi.number().integer().min(1).required(),
  transactionType: Joi.string().valid(TRANSACTION_TYPE.SALES_OUT, TRANSACTION_TYPE.DAMAGE_OUT).required(),
  notes: Joi.string().trim().allow(''),
});

export const createOrderValidator =(body)=> createOrderSchema.validate(body, { abortEarly: false, stripUnknown: true });
export const assignOrderValidator =(body)=> assignOrderSchema.validate(body, { abortEarly: false, stripUnknown: true });
export const reassignTaskValidator =(body)=> reassignTaskSchema.validate(body, { abortEarly: false, stripUnknown: true });
export const updateAssignmentStatusValidator =(body)=> updateAssignmentStatusSchema.validate(body, { abortEarly: false, stripUnknown: true });
export const outgoingProductValidator =(body)=> outgoingProductSchema.validate(body, { abortEarly: false, stripUnknown: true });
