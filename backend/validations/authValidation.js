import Joi from 'joi';


const passwordComplexity = Joi.string()
  .min(8)
  .pattern(new RegExp("^(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).{8,}$"))
  .messages({
    "string.min": "Password must be at least 8 characters long.",
    "string.pattern.base": "Password must contain uppercase, lowercase, and special characters.",
  });

const loginSchema = Joi.object({
    identifier: Joi.string()
        .min(3)
        .max(50)
        .required()
        .messages({
            'string.empty': 'Username or Email is required.',
            'string.min': 'Identifier must be at least 3 characters long.',
            'any.required': 'Username or Email is a required field.'
        }),
    password: passwordComplexity
        .required()
        .messages({
            'string.empty': 'Password is required.',
            'any.required': 'Password is a required field.'
        })
}).required();

export const loginValidator = (body) => loginSchema.validate(body, { abortEarly: false });
