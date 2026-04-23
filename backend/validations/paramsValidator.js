import Joi from 'joi';

const requestValidateSchema = Joi.object({
    id: Joi.string().hex().length(24).required().messages({
        'string.hex': 'ID must be a valid MongoDB object ID.',
        'string.length': 'ID must be exactly 24 characters long.',
        'any.required': 'ID is required.'
    })
});

export const paramsValidator = (data) => requestValidateSchema.validate(data);
