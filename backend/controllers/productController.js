import * as productService from '../services/productService.js';
import { StatusCodes } from 'http-status-codes';
import { outgoingProductValidator } from '../validations/productionValidation.js';

/**
 * Controller to get all products with advanced query features.
 */
export const getAllProducts = async (req, res) => {
  const result = await productService.getProductsByQuery(req.query);

  if (result.status === 'success') {
    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result.data
    });
  } else {
    res.status(500).json({
      status: 'error',
      message: result.message,
      data: null
    });
  }
};

/**
 * Controller to record outgoing products (e.g., sales, damage).
 */
export const outgoingProduct = async (req, res) => {
  try {
    const { error, value } = outgoingProductValidator(req.body);
    if (error) {
      const errorMessages = error.details.map(detail => detail.message).join(', ');
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: `Validation failed: ${errorMessages}`,
        data: null
      });
    }

    const { productId, quantity, transactionType, notes } = value;
    const result = await productService.recordOutgoingProduct(productId, quantity, transactionType, notes, req.userId);

    if (result.status === 'success') {
      res.status(StatusCodes.OK).json({
        status: 'success',
        message: result.message,
        data: result.data
      });
    } else {
      res.status(StatusCodes.BAD_REQUEST).json({ // Use BAD_REQUEST for business logic errors
        status: 'error',
        message: result.message,
        data: null
      });
    }
  } catch (error) {
    console.error('[ProductController] outgoingProduct error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'An error occurred while recording outgoing product.',
      data: null
    });
  }
};

/**
 * Controller to get products with low stock.
 */
export const getLowStockProducts = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const result = await productService.getLowStockProductsService({
      search,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    if (result.status === 'success') {
      res.status(StatusCodes.OK).json({
        status: 'success',
        message: result.message,
        data: result.data
      });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: result.message,
        data: null
      });
    }
  } catch (error) {
    console.error('[ProductController] getLowStockProducts error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'An error occurred while fetching low stock products.',
      data: null
    });
  }
};
