import * as productService from '../services/productService.js';
import { StatusCodes } from 'http-status-codes';
import { clearCacheByPattern, getCachedData, setCachedData } from '../utils/redisFetching.js';
import {
  createProductValidator,
  updateProductValidator,
  incomingProductValidator,
  outgoingProductValidator
} from '../validations/productValidation.js';
import { logActivity } from '../utils/logger.js';
import { handleServiceResponse } from '../utils/responseHelper.js';

import { generateNormalizedCacheKey } from '../utils/serviceHelper.js';

/**
 * Controller to get all products with advanced query features.
 */
export const getAllProducts = async (req, res) => {
  try {
    const allowedParams = ['page', 'limit', 'search', 'category', 'isActive', 'sortBy', 'sortOrder'];
    const cacheKey = generateNormalizedCacheKey('product:list', req.query, allowedParams);

    // 1. Try Redis cache
    const cachedResult = await getCachedData(cacheKey);
    if (cachedResult) {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Products retrieved successfully (from cache).',
        data: cachedResult
      });
    }

    // 2. If not in cache, get from service
    const result = await productService.getProductsByQuery(req.query);

    // 3. Cache successful result
    if (result.status === 'success') {
      await setCachedData(cacheKey, result.data);
    }

    return handleServiceResponse(res, result);
  } catch (error) {
    console.log('[ProductController] getAllProducts error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error while fetching products: ' + error.message,
      data: null
    });
  }
};

/**
 * Controller to get a single product by ID.
 */
export const getProductById = async (req, res) => {
  try {
    const cacheKey = `product:detail:${req.params.id}`;
    // 1. Try Redis cache
    const cachedResult = await getCachedData(cacheKey);
    if (cachedResult) {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Product retrieved successfully (from cache).',
        data: cachedResult
      });
    }
    // 2. If not in cache, get from service
    const result = await productService.getProductById(req.params.id);
    // 3. Cache successful result
    if (result.status === 'success') {
      await setCachedData(cacheKey, result.data);
    }
    return handleServiceResponse(res, result);
  } catch (error) {
    console.log('[ProductController] getProductById error:', error);
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
    console.log('[ProductController] createProduct request body:', req.body);
    if (req.body.estimateMaterialCost && typeof req.body.estimateMaterialCost === 'string') {
      try {
        req.body.estimateMaterialCost = JSON.parse(req.body.estimateMaterialCost);
      } catch (parseError) {
        console.log('[ProductController] createProduct JSON parse error:', parseError);
      }
    }
    const { error, value } = createProductValidator(req.body);
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: `Validation failed: ${error.details.map(d => d.message).join(', ')}`,
        data: null
      });
    }

    if (req.imageUrl) {
      value.productImage = req.imageUrl;
    }

    const result = await productService.createProduct(value);

    if (result.status === 'success') {
      // Invalidate list cache
      await clearCacheByPattern('product:list:*');

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
    console.log('[ProductController] createProduct error:', error);
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
    if (req.body.estimateMaterialCost && typeof req.body.estimateMaterialCost === 'string') {
      try {
        req.body.estimateMaterialCost = JSON.parse(req.body.estimateMaterialCost);
      } catch (parseError) {
        console.log('[ProductController] updateProduct JSON parse error:', parseError);
      }
    }
    const { error, value } = updateProductValidator(req.body);
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: `Validation failed: ${error.details.map(d => d.message).join(', ')}`,
        data: null
      });
    }

    if (req.imageUrl) {
      value.productImage = req.imageUrl;
    }

    const result = await productService.updateProduct(req.params.id, value);

    if (result.status === 'success') {
      // Invalidate list cache
      await clearCacheByPattern('product:list:*');

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
    console.log('[ProductController] updateProduct error:', error);
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
      // Invalidate list cache
      await clearCacheByPattern('product:list:*');

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
    console.log('[ProductController] deleteProduct error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error while deleting product.',
      data: null
    });
  }
};

/**
 * Controller to record incoming products (e.g., from production, returns).
 */
export const incomingProduct = async (req, res) => {
  try {
    const { error, value } = incomingProductValidator(req.body);
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: `Validation failed: ${error.details.map(d => d.message).join(', ')}`,
        data: null
      });
    }

    const { productId, quantity, transactionType, sender, orderRef, notes } = value;
    const result = await productService.recordIncomingProduct(
      productId,
      quantity,
      transactionType,
      notes,
      req.userId,
      { sender, orderRef }
    );

    if (result.status === 'success') {
      // Invalidate list cache
      await clearCacheByPattern('product:list:*');

      await logActivity({
        author: req.userId,
        action: transactionType.toUpperCase(),
        module: 'PRODUCT_INVENTORY',
        details: `Recorded incoming ${quantity} items for product ${productId}. Reason: ${transactionType}`,
        targetId: productId,
        metadata: { quantity, transactionType, notes, sender, orderRef }
      }, req);
    }

    return handleServiceResponse(res, result);
  } catch (error) {
    console.log('[ProductController] incomingProduct error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error while recording incoming product.',
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

    const { productId, quantity, transactionType, receiver, customer, orderRef, notes } = value;
    const result = await productService.recordOutgoingProduct(
      productId,
      quantity,
      transactionType,
      notes,
      req.userId,
      { receiver, customer, orderRef }
    );

    if (result.status === 'success') {
      // Invalidate list cache
      await clearCacheByPattern('product:list:*');

      await logActivity({
        author: req.userId,
        action: transactionType.toUpperCase(),
        module: 'PRODUCT_INVENTORY',
        details: `Recorded outgoing ${quantity} items for product ${productId}. Reason: ${transactionType}`,
        targetId: productId,
        metadata: { quantity, transactionType, notes, receiver, customer, orderRef }
      }, req);
    }

    return handleServiceResponse(res, result);
  } catch (error) {
    console.log('[ProductController] outgoingProduct error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error while recording outgoing product.',
      data: null
    });
  }
};

/**
 * Controller to get product transaction history.
 */
export const getProductHistory = async (req, res) => {
  try {
    const { id: idParam } = req.params;
    const { id: idQuery, type, direction, page = 1, limit = 10 } = req.query;

    const productId = idParam || idQuery;

    const result = await productService.getProductHistoryService({
      productId,
      type,
      direction,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    return handleServiceResponse(res, result);
  } catch (error) {
    console.log('[ProductController] getProductHistory error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error while fetching product history.',
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
    console.log('[ProductController] getLowStockProducts error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error while fetching low stock products.',
      data: null
    });
  }
};
