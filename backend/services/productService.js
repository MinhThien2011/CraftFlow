import Product from '../models/Product.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import mongoose from 'mongoose';
import { transformProduct, transformProducts } from '../utils/productTransformer.js';
import { processMaterialCosts } from '../utils/productHelpers.js';
import { standardlizeResponseDataHelper } from '../utils/standardlizeResponseData.js';

const MAX_LIMIT = 100;

/**
 * Service to get all products with advanced filtering, sorting, and pagination.
 */
export const getProductsByQuery = async (query) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      category = '',
      isActive = true,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    // Normalize parameters to handle empty strings from query params
    const normalizedSortBy = (sortBy && typeof sortBy === 'string' && sortBy.trim() !== '') ? sortBy : 'createdAt';
    const normalizedSortOrder = (sortOrder && typeof sortOrder === 'string' && sortOrder.trim() !== '') ? sortOrder : 'desc';
    const normalizedSearch = (search && typeof search === 'string' && search.trim() !== '') ? search : '';
    const normalizedCategory = (category && typeof category === 'string' && category.trim() !== '') ? category : '';

    // For isActive, if it's an empty string or not provided, default to true
    let normalizedIsActive = isActive;
    if (isActive === '' || isActive === undefined || isActive === null) {
      normalizedIsActive = 'true';
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // --- Build Query Conditions ---
    const conditions = {
      isActive: normalizedIsActive === 'all'
        ? { $in: [true, false] }
        : (normalizedIsActive === 'true' || normalizedIsActive === true)
    };

    if (normalizedSearch) {
      const searchRegex = { $regex: normalizedSearch, $options: 'i' };
      conditions.$or = [
        { name: searchRegex },
        { code: searchRegex }
      ];
    }

    if (normalizedCategory) {
      conditions.category = normalizedCategory;
    }

    // --- Sorting --- 
    const sortOptions = { [normalizedSortBy]: normalizedSortOrder === 'asc' ? 1 : -1 };

    // --- Execute Query ---
    const [products, total] = await Promise.all([
      Product.find(conditions)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('estimateMaterialCost.material', 'name code unit currency')
        .lean(),
      Product.countDocuments(conditions)
    ]);

    return {
      status: 'success',
      message: 'Products retrieved successfully.',
      data: {
        products: transformProducts(products),
        pagination: {
          total,
          totalPages: Math.ceil(total / limitNum),
          currentPage: pageNum,
          limit: limitNum
        }
      }
    };
  } catch (error) {
    console.error('[ProductService] getProductsByQuery error:', error);
    return { status: 'error', message: 'An error occurred while fetching products.', data: null };
  }
};

/**
 * Service to get a single product by ID.
 */
export const getProductById = async (id) => {
  try {
    const product = await Product.findById(id).populate('estimateMaterialCost.material', 'name code unit currency').lean();
    if (!product) {
      return { status: 'error', message: 'Product not found.', data: null };
    }
    return { status: 'success', message: 'Product retrieved successfully.', data: { product: transformProduct(product) } };
  } catch (error) {
    console.error('[ProductService] getProductById error:', error);
    return { status: 'error', message: 'An error occurred while fetching the product.', data: null };
  }
};

/**
 * Service to record incoming products atomically.
 */
export const recordIncomingProduct = async (productId, quantity, type, note, userId, logistics = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await Product.findById(productId).session(session);
    if (!product) {
      throw new Error('Product not found.');
    }

    const beforeStock = product.currentStock;
    product.currentStock += quantity;
    const afterStock = product.currentStock;
    await product.save({ session });

    // Record transaction
    const transaction = await InventoryTransaction.create([{
      product: productId,
      type,
      quantity,
      beforeStock,
      afterStock,
      performedBy: userId,
      note,
      sender: logistics.sender,
      orderRef: logistics.orderRef,
      location: logistics.location || product.location
    }], { session });

    await session.commitTransaction();

    return {
      status: 'success',
      message: 'Incoming product recorded successfully.',
      data: { product: transformProduct(product), transaction: transaction[0] }
    };
  } catch (error) {
    await session.abortTransaction();
    console.error('[ProductService] recordIncomingProduct error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Service to record outgoing products atomically.
 */
export const recordOutgoingProduct = async (productId, quantity, type, note, userId, logistics = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await Product.findById(productId).session(session);
    if (!product) {
      throw new Error('Product not found.');
    }

    if (product.currentStock < quantity) {
      throw new Error('Insufficient stock for this transaction.');
    }

    const beforeStock = product.currentStock;
    product.currentStock -= quantity;
    const afterStock = product.currentStock;
    await product.save({ session });

    // Record transaction
    const transaction = await InventoryTransaction.create([{
      product: productId,
      type,
      quantity: -quantity,
      beforeStock,
      afterStock,
      performedBy: userId,
      note,
      receiver: logistics.receiver,
      customer: logistics.customer,
      orderRef: logistics.orderRef,
      location: logistics.location || product.location
    }], { session });

    await session.commitTransaction();

    return {
      status: 'success',
      message: 'Outgoing product recorded successfully.',
      data: { product: transformProduct(product), transaction: transaction[0] }
    };
  } catch (error) {
    await session.abortTransaction();
    console.error('[ProductService] recordOutgoingProduct error:', error);
    return { status: 'error', message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Get product history with pagination and filtering.
 */
export const getProductHistoryService = async ({ productId, page = 1, limit = 10 }) => {
  try {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = productId ? { product: productId } : {};

    const [history, total] = await Promise.all([
      InventoryTransaction.find(filter)
        .populate('performedBy', 'fullName username')
        .populate('product', 'name code unit category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      InventoryTransaction.countDocuments(filter)
    ]);

    return {
      status: 'success',
      message: 'Product history retrieved successfully.',
      data: {
        history: standardlizeResponseDataHelper(history),
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      }
    };
  } catch (error) {
    console.error('[ProductService] getProductHistoryService error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};

/**
 * Service to get products with low stock.
 */
export const getLowStockProductsService = async ({ search = '', page = 1, limit = 10 }) => {
  try {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Low stock: currentStock <= threshold
    const conditions = {
      isActive: true,
      $expr: { $lte: ['$currentStock', '$threshold'] }
    };

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      conditions.$or = [
        { name: searchRegex },
        { code: searchRegex }
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(conditions)
        .skip(skip)
        .limit(limitNum)
        .populate('estimateMaterialCost.material', 'name code unit currency')
        .lean(),
      Product.countDocuments(conditions)
    ]);

    return {
      status: 'success',
      message: 'Low stock products retrieved successfully.',
      data: {
        products: transformProducts(products),
        pagination: {
          total,
          totalPages: Math.ceil(total / limitNum),
          currentPage: pageNum,
          limit: limitNum
        }
      }
    };
  } catch (error) {
    console.error('[ProductService] getLowStockProductsService error:', error);
    return { status: 'error', message: 'An error occurred while fetching low stock products.', data: null };
  }
};

/**
 * Service to create a new product.
 */
export const createProduct = async (productData) => {
  try {
    const existingProduct = await Product.findOne({ code: productData.code }).lean();
    if (existingProduct) {
      return { status: 'error', message: 'Product code already exists.', data: null };
    }

    if (productData.estimateMaterialCost && productData.estimateMaterialCost.length > 0) {
      const { processedMaterials, totalBaseCost } = await processMaterialCosts(productData.estimateMaterialCost);
      productData.estimateMaterialCost = processedMaterials;
      productData.baseCost = totalBaseCost;
    }

    const product = await Product.create(productData);
    return {
      status: 'success',
      message: 'Product created successfully.',
      data: { product: transformProduct(product) }
    };
  } catch (error) {
    console.error('[ProductService] createProduct error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};

/**
 * Service to update an existing product.
 */
export const updateProduct = async (id, updateData) => {
  try {
    const product = await Product.findById(id);
    if (!product) {
      return { status: 'error', message: 'Product not found.', data: null };
    }

    if (updateData.code) {
      const existingProduct = await Product.findOne({ _id: { $ne: id }, code: updateData.code }).lean();
      if (existingProduct) {
        return { status: 'error', message: 'Product code already exists.', data: null };
      }
    }

    if (updateData.estimateMaterialCost && updateData.estimateMaterialCost.length > 0) {
      const { processedMaterials, totalBaseCost } = await processMaterialCosts(updateData.estimateMaterialCost);
      updateData.estimateMaterialCost = processedMaterials;
      updateData.baseCost = totalBaseCost;
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { returnDocument: 'after' }).lean();
    return {
      status: 'success',
      message: 'Product updated successfully.',
      data: { product: transformProduct(updatedProduct) }
    };
  } catch (error) {
    console.error('[ProductService] updateProduct error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};

/**
 * Service to delete (deactivate) a product.
 */
export const deleteProduct = async (id) => {
  try {
    const product = await Product.findByIdAndUpdate(id, { isActive: false }, { returnDocument: 'after' }).lean();
    if (!product) {
      return { status: 'error', message: 'Product not found.', data: null };
    }
    return { status: 'success', message: 'Product deactivated successfully.', data: product };
  } catch (error) {
    console.error('[ProductService] deleteProduct error:', error);
    return { status: 'error', message: 'An error occurred while deleting the product.', data: null };
  }
};
