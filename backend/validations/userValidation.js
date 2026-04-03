import Joi from 'joi';

export const passwordComplexity = Joi.string()
  .min(8)
  .pattern(new RegExp("^(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).{8,}$"))
  .messages({
    "string.min": "Password must be at least 8 characters long.",
    "string.pattern.base": "Password must contain uppercase, lowercase, and special characters.",
    'string.empty': 'Password is required.',
    'any.required': 'Password is required.'
  });

const userSchema = Joi.object({
  username: Joi.string().min(3).max(30).required().messages({
    'string.min': 'Username must be at least 3 characters long.',
    'string.max': 'Username cannot exceed 30 characters.',
    'any.required': 'Username is required.'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address.',
    'any.required': 'Email is required.'
  }),
  password: passwordComplexity.required(),
  fullName: Joi.string().min(3).required().messages({
    'string.min': 'Full name must be at least 3 characters long.',
    'any.required': 'Full name is required.'
  }),
  phone: Joi.string().pattern(/^[0-9]{10,11}$/).required().messages({
    'string.pattern.base': 'Phone number must be 10 or 11 digits long.',
    'any.required': 'Phone number is required.'
  }),
  address: Joi.string().required().messages({
    'any.required': 'Address is required.'
  }),
  birthDay: Joi.date().optional(),
  gender: Joi.string().valid('male', 'female').default('male'),
  role: Joi.string().optional(),
  isActive: Joi.boolean().default(true)
}).required();

const updateUserSchema = Joi.object({
  fullName: Joi.string().min(3),
  phone: Joi.string().pattern(/^[0-9]{10,11}$/),
  address: Joi.string(),
  birthDay: Joi.date().optional(),
  gender: Joi.string().valid('male', 'female'),
  avatar: Joi.string().uri().optional(),
  isActive: Joi.boolean()
}).min(1).required();

export const createUserValidator = (body) => userSchema.validate(body, { abortEarly: false });
export const updateUserValidator = (body) => updateUserSchema.validate(body, { abortEarly: false });
