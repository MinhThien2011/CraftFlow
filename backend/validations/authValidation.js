import Joi from 'joi';
import { passwordComplexity } from './userValidation.js';


const loginSchema = Joi.object({
    identifier: Joi.string()
        .min(3)
        .max(50)
        .required()
        .messages({
            'string.empty': 'username or email is required.',
            'string.min': 'username or email must be at least 3 characters long.',
            'any.required': 'username or email is required.'
        }),
    password: passwordComplexity
        .required()
        .messages({
            'string.empty': 'password is required.',
            'any.required': 'password is required.'
        })
}).required().messages({
    'object.base': 'Invalid login data.',
    'any.required': 'Please provide both username or email and password.'
});


export const handlerPasswordSchema = Joi.object({
    identifier: Joi.string().when('$type', {
        is: 'refresh',
        then: Joi.required(),
        otherwise: Joi.optional()
    }).messages({
        'string.empty': 'username or email is required.',
        'any.required': 'username or email is required.'
    }),
    newPassword: passwordComplexity.required().messages({
        'string.empty': 'new password is required.',
        'any.required': 'new password is required.'
    }),
    confirmPassword: passwordComplexity.required().messages({
        'string.empty': 'confirm password is required.',
        'any.required': 'confirm password is required.'
    }).valid(Joi.ref('newPassword')).messages({
        'any.only': 'confirm password must match new password.'
    })
}).required();

// --- Exports ---

export const handlerPasswordValidator = (body , type = 'change') => handlerPasswordSchema.validate(body, { abortEarly: false, context: { type } });
export const loginValidator = (body) => loginSchema.validate(body, { abortEarly: false });

