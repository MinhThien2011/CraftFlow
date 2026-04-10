import Product from '../models/Product.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import { TRANSACTION_TYPE } from '../utils/constants.js';
import { transformProduct, transformProducts } from '../utils/productTransformer.js';

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

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitInt = parseInt(limit, 10);

    // --- Build Query Conditions ---
    const conditions = { isActive: isActive === 'all' ? { $in: [true, false] } : (isActive === 'true' || isActive === true) };

    if (search) {
      conditions.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      conditions.category = category;
    }

    // --- Sorting --- 
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // --- Execute Query ---
    const [products, total] = await Promise.all([
      Product.find(conditions)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitInt)
        .populate('estimateMaterialCost.material', 'name code unit')
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
          totalPages: Math.ceil(total / limitInt),
          currentPage: parseInt(page, 10),
          limit: limitInt
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
 * @param {string} id - Product ID.
 */
export const getProductById = async (id) => {
  try {
    const product = await Product.findById(id).populate('estimateMaterialCost.material', 'name code unit').lean();
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
 * Service to create a new product.
 * @param {object} productData - Data for the new product.
 */
export const createProduct = async (productData) => {
  try {
    // Check if code or name already exists
    const existingProduct = await Product.findOne({
      $or: [{ name: productData.name }, { code: productData.code }]
    });

    if (existingProduct) {
      return { status: 'error', message: 'Product name or code already exists.', data: null };
    }

    const product = await Product.create(productData);
    return {
      status: 'success',
      message: 'Product created successfully.',
      data: { product }
    };
  } catch (error) {
    console.error('[ProductService] createProduct error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};

/**
 * Service to update an existing product.
 * @param {string} id - Product ID.
 * @param {object} updateData - Data to update.
 */
export const updateProduct = async (id, updateData) => {
  try {
    const product = await Product.findById(id);
    if (!product) {
      return { status: 'error', message: 'Product not found.', data: null };
    }

    // If name or code is being updated, check for uniqueness
    if (updateData.name || updateData.code) {
      const existingProduct = await Product.findOne({
        _id: { $ne: id },
        $or: [
          ...(updateData.name ? [{ name: updateData.name }] : []),
          ...(updateData.code ? [{ code: updateData.code }] : [])
        ]
      });

      if (existingProduct) {
        return { status: 'error', message: 'Product name or code already exists.', data: null };
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    return {
      status: 'success',
      message: 'Product updated successfully.',
      data: { product: updatedProduct }
    };
  } catch (error) {
    console.error('[ProductService] updateProduct error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};

/**
 * Service to delete (deactivate) a product.
 * @param {string} id - Product ID.
 */
export const deleteProduct = async (id) => {
  try {
    const product = await Product.findById(id);
    if (!product) {
      return { status: 'error', message: 'Product not found.', data: null };
    }

    // Soft delete: just set isActive to false
    product.isActive = false;
    await product.save();

    return { status: 'success', message: 'Product deactivated successfully.', data: null };
  } catch (error) {
    console.error('[ProductService] deleteProduct error:', error);
    return { status: 'error', message: 'An error occurred while deleting the product.', data: null };
  }
};

/**
 * Service to record outgoing products (e.g., sales, damage).
 */
export const recordOutgoingProduct = async (productId, quantity, transactionType, notes, userId) => {
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return { status: 'error', message: 'Product not found.', data: null };
    }

    if (product.currentStock < quantity) {
      return { status: 'error', message: 'Insufficient stock for this transaction.', data: null };
    }

    // Update product stock
    product.currentStock -= quantity;
    await product.save();

    // Record transaction
    const transaction = await InventoryTransaction.create({
      product: productId,
      quantity: -quantity,
      transactionType,
      performedBy: userId,
      notes,
      referenceModel: 'Product'
    });

    return {
      status: 'success',
      message: 'Outgoing product recorded successfully.',
      data: { product, transaction }
    };
  } catch (error) {
    console.error('[ProductService] recordOutgoingProduct error:', error);
    return { status: 'error', message: 'An error occurred while recording outgoing product.', data: null };
  }
};

/**
 * Service to get products with low stock.
 */
export const getLowStockProductsService = async ({ search = '', page = 1, limit = 10 }) => {
  try {
    const skip = (page - 1) * limit;

    // Low stock: currentStock <= threshold
    const conditions = {
      isActive: true,
      $expr: { $lte: ['$currentStock', '$threshold'] }
    };

    if (search) {
      conditions.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(conditions).skip(skip).limit(limit).lean(),
      Product.countDocuments(conditions)
    ]);

    return {
      status: 'success',
      message: 'Low stock products retrieved successfully.',
      data: {
        products: transformProducts(products),
        pagination: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          limit
        }
      }
    };
  } catch (error) {
    console.error('[ProductService] getLowStockProductsService error:', error);
    return { status: 'error', message: 'An error occurred while fetching low stock products.', data: null };
  }
};
