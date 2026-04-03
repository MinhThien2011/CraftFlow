import Material from '../models/Material.js';
import { standardlizeResponseDataHelper } from '../utils/standardlizeResponseData.js';

const MAX_LIMIT = 100;

/**
 * Get all materials with filtering, searching and pagination.
 * Optimized with lean(), Promise.all and projection.
 */
export const getMaterials = async ({ search = '', page = 1, limit = 10, filters = {} }) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const query = {};

  // 1. Optimized search by name or code
  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    query.$or = [
      { name: searchRegex },
      { code: searchRegex }
    ];
  }

  // 2. Filter by color, unit
  if (filters.color) query.color = { $regex: filters.color, $options: 'i' };
  if (filters.unit) query.unit = filters.unit;

  // 3. Filter by currentStock (range optimization)
  if (filters.stockGt !== undefined || filters.stockLt !== undefined) {
    query.currentStock = {};
    if (filters.stockGt !== undefined) query.currentStock.$gt = parseFloat(filters.stockGt);
    if (filters.stockLt !== undefined) query.currentStock.$lt = parseFloat(filters.stockLt);
  }

  // 4. Filter by price (range optimization)
  if (filters.priceGt !== undefined || filters.priceLt !== undefined) {
    query.price = {};
    if (filters.priceGt !== undefined) query.price.$gt = parseFloat(filters.priceGt);
    if (filters.priceLt !== undefined) query.price.$lt = parseFloat(filters.priceLt);
  }

  const [materials, total] = await Promise.all([
    Material.find(query)
      .select('name code unit color price currentStock threshold isActive createdAt updatedAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Material.countDocuments(query)
  ]);

  return {
    success: true,
    message: 'Materials retrieved successfully.',
    data: {
      materials: standardlizeResponseDataHelper(materials),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    }
  };
};

/**
 * Get material by ID with lean().
 */
export const getMaterialById = async (id) => {
  try {
    const material = await Material.findById(id).lean();
    if (!material) {
      return { success: false, message: 'Material not found.', data: null };
    }
    return {
      success: true,
      message: 'Material retrieved successfully.',
      data: standardlizeResponseDataHelper(material)
    };
  } catch (error) {
    console.error('[materialService] getMaterialById error:', error);
    return { success: false, message: error.message, data: null };
  }
};

/**
 * Get low stock materials optimized with lean() and projection.
 */
export const getLowStockMaterialsService = async (threshold = 10) => {
  try {
    const materials = await Material.find({ 
      currentStock: { $lt: threshold },
      isActive: true 
    })
    .select('name code unit currentStock threshold')
    .lean();

    return {
      success: true,
      message: materials.length > 0 ? 'Low stock materials found' : 'No low stock materials found',
      data: standardlizeResponseDataHelper(materials),
    };
  } catch (error) {
    console.error('[materialService] getLowStockMaterialsService error:', error);
    return { success: false, message: error.message, data: null };
  }
};
