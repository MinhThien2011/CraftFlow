import Product from '../models/Product.js';

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
