import * as productService from '../services/productService.js';
import { StatusCodes } from 'http-status-codes';
import {
  createProductValidator,
  updateProductValidator,
  outgoingProductValidator
} from '../validations/productValidation.js';
import { logActivity } from '../utils/logger.js';
import { handleServiceResponse } from '../utils/responseHelper.js';

/**
 * Controller to get all products with advanced query features.
 */
export const getAllProducts = async (req, res) => {
  try {
    const result = await productService.getProductsByQuery(req.query);
    return handleServiceResponse(res, result);
  } catch (error) {
    console.error('[ProductController] getAllProducts error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error while fetching products.',
      data: null
    });
  }
};

/**
 * Controller to get a single product by ID.
 */
export const getProductById = async (req, res) => {
  try {
    const result = await productService.getProductById(req.params.id);
    return handleServiceResponse(res, result);
  } catch (error) {
    console.error('[ProductController] getProductById error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error while fetching product.',
      data: null
    });
  }
};

/**
 * Controller to create a new product.
 */
export const createProduct = async (req, res) => {
  try {
    const { error, value } = createProductValidator(req.body);
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: error.details.map(d => d.message).join(', '),
        data: null
      });
    }

    const result = await productService.createProduct(value);

    if (result.status === 'success') {
      await logActivity({
        author: req.userId,
        action: 'CREATE_PRODUCT',
        module: 'PRODUCT',
        details: `Created product: ${result.data.product.name} (${result.data.product.code})`,
        targetId: result.data.product._id,
        metadata: value
      }, req);
    }

    return handleServiceResponse(res, result, StatusCodes.CREATED);
  } catch (error) {
    console.error('[ProductController] createProduct error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error while creating product.',
      data: null
    });
  }
};

/**
 * Controller to update an existing product.
 */
export const updateProduct = async (req, res) => {
  try {
    const { error, value } = updateProductValidator(req.body);
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: error.details.map(d => d.message).join(', '),
        data: null
      });
    }

    const result = await productService.updateProduct(req.params.id, value);

    if (result.status === 'success') {
      await logActivity({
        author: req.userId,
        action: 'UPDATE_PRODUCT',
        module: 'PRODUCT',
        details: `Updated product: ${result.data.product.name} (${result.data.product.code})`,
        targetId: result.data.product._id,
        metadata: value
      }, req);
    }

    return handleServiceResponse(res, result);
  } catch (error) {
    console.error('[ProductController] updateProduct error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error while updating product.',
      data: null
    });
  }
};

/**
 * Controller to delete (deactivate) a product.
 */
export const deleteProduct = async (req, res) => {
  try {
    const result = await productService.deleteProduct(req.params.id);

    if (result.status === 'success') {
      await logActivity({
        author: req.userId,
        action: 'DELETE_PRODUCT',
        module: 'PRODUCT',
        details: `Deactivated product with ID: ${req.params.id}`,
        targetId: req.params.id
      }, req);
    }

    return handleServiceResponse(res, result);
  } catch (error) {
    console.error('[ProductController] deleteProduct error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error while deleting product.',
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
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: `Validation failed: ${error.details.map(d => d.message).join(', ')}`,
        data: null
      });
    }

    const { productId, quantity, transactionType, notes } = value;
    const result = await productService.recordOutgoingProduct(productId, quantity, transactionType, notes, req.userId);

    if (result.status === 'success') {
      await logActivity({
        author: req.userId,
        action: transactionType.toUpperCase(),
        module: 'PRODUCT_INVENTORY',
        details: `Recorded outgoing ${quantity} items for product ${productId}. Reason: ${transactionType}`,
        targetId: productId,
        metadata: { quantity, transactionType, notes }
      }, req);
    }

    return handleServiceResponse(res, result);
  } catch (error) {
    console.error('[ProductController] outgoingProduct error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error while recording outgoing product.',
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

    return handleServiceResponse(res, result);
  } catch (error) {
    console.error('[ProductController] getLowStockProducts error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error while fetching low stock products.',
      data: null
    });
  }
};
