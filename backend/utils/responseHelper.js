import { StatusCodes } from 'http-status-codes';

/**
 * @param {Object} res - Express response object.
 * @param {Object} result - Result object from a service.
 * @param {number} successCode - HTTP Status Code to return on success (default: 200).
 * @returns {Object} Express response JSON.
 */
export const handleServiceResponse = (res, result, successCode = StatusCodes.OK) => {
  if (result.success) {
    return res.status(successCode).json({
      success: true,
      message: result.message || 'Operation successful.',
      data: result.data || null
    });
  }
  let errorCode = StatusCodes.BAD_REQUEST;

  const message = result.message?.toLowerCase() || '';

  if (message.includes('not found')) {
    errorCode = StatusCodes.NOT_FOUND;
  } else if (message.includes('already exists') || message.includes('duplicate')) {
    errorCode = StatusCodes.CONFLICT;
  } else if (message.includes('unauthorized') || message.includes('denied')) {
    errorCode = StatusCodes.UNAUTHORIZED;
  } else if (message.includes('internal') || message.includes('server error')) {
    errorCode = StatusCodes.INTERNAL_SERVER_ERROR;
  }

  return res.status(errorCode).json({
    success: false,
    message: result.message || 'An unexpected error occurred.',
    data: result.data || null
  });
};
