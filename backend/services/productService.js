import Product from '../models/Product.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import { TRANSACTION_TYPE } from '../utils/constants.js';

/**
 * Get products with advanced filtering, sorting, and pagination.
 * @param {object} query - The query object from the request.
 */
export const getProductsByQuery = async (query) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      category = '', 
      sortBy = 'createdAt', // e.g., name, baseCost, createdAt
      sortOrder = 'desc' // asc or desc
    } = query;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    // --- Build Query Conditions ---
    const conditions = { isActive: true };

    // Search condition (name or code)
    if (search) {
      conditions.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      conditions.category = category;
    }

    // --- Sorting --- 
    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    // --- Execute Query ---
    const [products, total] = await Promise.all([
      Product.find(conditions)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Product.countDocuments(conditions)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit, 10));

    return {
      status: 'success',
      message: 'Products retrieved successfully.',
      data: {
        products,
        pagination: {
          total,
          totalPages,
          currentPage: parseInt(page, 10),
          limit: parseInt(limit, 10)
        }
      }
    };
  } catch (error) {
    console.error('[ProductService] getProductsByQuery error:', error);
    return { status: 'error', message: 'An error occurred while fetching products.', data: null };
  }
};

/**
 * Record outgoing products (e.g., sales, damage).
 * @param {string} productId - The ID of the product.
 * @param {number} quantity - The quantity to deduct.
 * @param {string} transactionType - Type of transaction (SALES_OUT, DAMAGE_OUT).
 * @param {string} notes - Additional notes for the transaction.
 */
export const recordOutgoingProduct = async (productId, quantity, transactionType, notes, userId) => {
  try {
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found.');
    }

    if (product.currentStock < quantity) {
      throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.currentStock}, Requested: ${quantity}`);
    }

    product.currentStock -= quantity;
    await product.save();

    await InventoryTransaction.create({
      product: productId,
      quantity: quantity,
      type: transactionType,
      notes: notes || `Product ${product.name} ${transactionType.replace('_', ' ')}.`,
      createdBy: userId,
    });

    return {
      status: 'success',
      message: `Successfully recorded ${quantity} units of ${product.name} as ${transactionType.replace('_', ' ')}.`,
      data: { product }
    };
  } catch (error) {
    console.error('[ProductService] recordOutgoingProduct error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};

/**
 * Get products with low stock (currentStock <= threshold).
 */
export const getLowStockProductsService = async ({ search = '', page = 1, limit = 10 }) => {
  try {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Filter for low stock
    const query = {
      isActive: true,
      $expr: { $lte: ["$currentStock", "$threshold"] }
    };

    // Add search
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { name: searchRegex },
        { code: searchRegex }
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ currentStock: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query)
    ]);

    return {
      status: 'success',
      message: products.length > 0 ? 'Low stock products found.' : 'No low stock products found.',
      data: {
        products,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      }
    };
  } catch (error) {
    console.error('[ProductService] getLowStockProductsService error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};
