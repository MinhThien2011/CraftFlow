import { StatusCodes } from 'http-status-codes';

export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { 
    abortEarly: false, // Return all errors
    stripUnknown: true // Remove unknown fields
  });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message).join(', ');
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: 'error',
      message: `Validation failed: ${errorMessages}`,
      data: null
    });
  }

  next();
};
