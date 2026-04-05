import Material from '../models/Material.js';
import Product from '../models/Product.js';
import { standardlizeResponseDataHelper } from '../utils/standardlizeResponseData.js';

const MAX_LIMIT = 100;

/**
 * Get an overview of inventory stats.
 */
export const getInventoryOverview = async () => {
  try {
    const [materialStats, productStats] = await Promise.all([
      // Material Stats
      Material.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalValue: { $sum: { $multiply: ["$currentStock", "$price"] } },
            lowStockCount: {
              $sum: {
                $cond: [{ $lte: ["$currentStock", "$threshold"] }, 1, 0]
              }
            }
          }
        }
      ]),
      // Product Stats
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalValue: { $sum: { $multiply: ["$currentStock", "$baseCost"] } },
            lowStockCount: {
              $sum: {
                $cond: [{ $lte: ["$currentStock", "$threshold"] }, 1, 0]
              }
            }
          }
        }
      ])
    ]);

    return {
      success: true,
      message: 'Inventory overview retrieved successfully.',
      data: {
        materials: materialStats[0] || { totalItems: 0, totalValue: 0, lowStockCount: 0 },
        products: productStats[0] || { totalItems: 0, totalValue: 0, lowStockCount: 0 }
      }
    };
  } catch (error) {
    console.error('[InventoryService] getInventoryOverview error:', error);
    return { success: false, message: error.message, data: null };
  }
};

/**
 * Get detailed material inventory with search and pagination.
 */
export const getMaterialInventory = async ({ search = '', page = 1, limit = 10 }) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const query = { isActive: true };
  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    query.$or = [{ name: searchRegex }, { code: searchRegex }];
  }

  const [materials, total] = await Promise.all([
    Material.find(query)
      .select('name code unit currentStock threshold price color updatedAt')
      .sort({ currentStock: 1 }) // Most critical first
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Material.countDocuments(query)
  ]);

  // Enrich with low stock flag
  const enrichedMaterials = materials.map(m => ({
    ...m,
    isLowStock: m.currentStock <= m.threshold
  }));

  return {
    success: true,
    message: 'Material inventory retrieved.',
    data: {
      items: standardlizeResponseDataHelper(enrichedMaterials),
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
 * Get detailed product inventory with search and pagination.
 */
export const getProductInventory = async ({ search = '', page = 1, limit = 10 }) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const query = { isActive: true };
  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    query.$or = [{ name: searchRegex }, { code: searchRegex }];
  }

  const [products, total] = await Promise.all([
    Product.find(query)
      .select('name code unit currentStock threshold baseCost category updatedAt')
      .sort({ currentStock: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Product.countDocuments(query)
  ]);

  const enrichedProducts = products.map(p => ({
    ...p,
    isLowStock: p.currentStock <= p.threshold
  }));

  return {
    success: true,
    message: 'Product inventory retrieved.',
    data: {
      items: standardlizeResponseDataHelper(enrichedProducts),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    }
  };
};
