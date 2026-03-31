import Material from '../models/Material.js';

/**
 * Get all materials with filtering, searching and pagination.
 * @param {Object} options - Search and pagination options
 * @param {string} options.search - Search keyword for name or code
 * @param {number} options.page - Current page number
 * @param {number} options.limit - Number of items per page
 * @param {Object} options.filters - Additional filters (stock, price, color, unit)
 * @returns {Promise<Object>} List of materials and pagination metadata
 */
export const getMaterials = async ({ search = '', page = 1, limit = 10, filters = {} }) => {
  const skip = (page - 1) * limit;
  
  const query = {};
  
  // 1. Search by name or code
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } }
    ];
  }

  // 2. Filter by color, unit
  if (filters.color) query.color = { $regex: filters.color, $options: 'i' };
  if (filters.unit) query.unit = filters.unit;

  // 3. Filter by currentStock (gt, lt, range)
  if (filters.stockGt !== undefined || filters.stockLt !== undefined) {
    query.currentStock = {};
    if (filters.stockGt !== undefined) query.currentStock.$gt = filters.stockGt;
    if (filters.stockLt !== undefined) query.currentStock.$lt = filters.stockLt;
  }

  // 4. Filter by price (gt, lt, range)
  if (filters.priceGt !== undefined || filters.priceLt !== undefined) {
    query.price = {};
    if (filters.priceGt !== undefined) query.price.$gt = filters.priceGt;
    if (filters.priceLt !== undefined) query.price.$lt = filters.priceLt;
  }

  const [materials, total] = await Promise.all([
    Material.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Material.countDocuments(query)
  ]);

  return {
    materials,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get material by ID.
 */
export const getMaterialById = async (id) => {
  return await Material.findById(id).lean();
};
