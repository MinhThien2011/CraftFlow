import Material from '../models/Material.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';
import { standardlizeResponseDataHelper } from '../utils/standardlizeResponseData.js';
import { determineStockLevel } from '../utils/inventoryHelpers.js';
import { STOCK_LEVEL_METADATA } from '../utils/constants.js';
import { buildListPagination, normalizePagination } from '../utils/pagination.js';
import { applyAggregateGuards } from '../utils/queryPerformance.js';
import Notification from '../models/Notification.js';
import { ROLES } from '../utils/constants.js';
import { notifyUsersByRole } from './realtimeService.js';

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
    console.log('[InventoryService] getInventoryOverview error:', error);
    return { success: false, message: error.message, data: null };
  }
};

/**
 * Get detailed material inventory with search and pagination.
 */
export const getMaterialInventory = async ({ search = '', page = 1, limit = 10, cursorStock, cursorId, withTotal = true }) => {
  const { pageNum, limitNum, skip, withTotal: shouldCount } = normalizePagination({ page, limit, withTotal });

  const query = { isActive: true };
  if (search) {
    query.$text = { $search: String(search).trim() };
  }
  if (cursorStock !== undefined && cursorId && mongoose.Types.ObjectId.isValid(cursorId)) {
    const cursorObjectId = new mongoose.Types.ObjectId(cursorId);
    query.$or = [
      { currentStock: { $gt: Number(cursorStock) } },
      { currentStock: Number(cursorStock), _id: { $gt: cursorObjectId } }
    ];
  }

  const dataPipeline = [
    { $sort: { currentStock: 1, _id: 1 } },
    { $skip: skip },
    { $limit: limitNum },
    {
      $lookup: {
        from: 'shelves',
        localField: 'shelf',
        foreignField: '_id',
        pipeline: [{ $project: { shelfCode: 1, warehouseSection: 1 } }],
        as: 'shelf'
      }
    },
    { $unwind: { path: '$shelf', preserveNullAndEmptyArrays: true } },
    { $project: { name: 1, code: 1, unit: 1, currentStock: 1, threshold: 1, price: 1, color: 1, shelf: 1, locationDetails: 1, supplier: 1, updatedAt: 1 } }
  ];

  const pipeline = shouldCount
    ? [{ $match: query }, { $facet: { data: dataPipeline, metadata: [{ $count: 'total' }] } }]
    : [{ $match: query }, ...dataPipeline];

  const aggregateResult = await applyAggregateGuards(Material.aggregate(pipeline));
  const materials = shouldCount ? (aggregateResult[0]?.data || []) : aggregateResult;
  const total = shouldCount ? (aggregateResult[0]?.metadata?.[0]?.total || 0) : undefined;

  // Enrich with detailed stock level information
  const enrichedMaterials = materials.map(m => {
    const stockLevel = determineStockLevel(m.currentStock, m.threshold);
    return {
      ...m,
      isLowStock: m.currentStock <= m.threshold, // Keep for backward compatibility
      stockLevel,
      stockLevelInfo: STOCK_LEVEL_METADATA[stockLevel]
    };
  });

  return {
    success: true,
    message: 'Material inventory retrieved.',
    data: {
      items: standardlizeResponseDataHelper(enrichedMaterials),
      pagination: {
        ...buildListPagination({ items: materials, total, pageNum, limitNum, cursor: null, withTotal: shouldCount }),
        nextStockCursor: materials.length === limitNum ? materials[materials.length - 1]?.currentStock : null,
        nextIdCursor: materials.length === limitNum ? materials[materials.length - 1]?._id?.toString() : null,
      }
    }
  };
};

/**
 * Get detailed product inventory with search and pagination.
 */
export const getProductInventory = async ({ search = '', page = 1, limit = 10, cursorStock, cursorId, withTotal = true }) => {
  const { pageNum, limitNum, skip, withTotal: shouldCount } = normalizePagination({ page, limit, withTotal });

  const query = { isActive: true };
  if (search) {
    query.$text = { $search: String(search).trim() };
  }
  if (cursorStock !== undefined && cursorId && mongoose.Types.ObjectId.isValid(cursorId)) {
    const cursorObjectId = new mongoose.Types.ObjectId(cursorId);
    query.$or = [
      { currentStock: { $gt: Number(cursorStock) } },
      { currentStock: Number(cursorStock), _id: { $gt: cursorObjectId } }
    ];
  }

  const dataPipeline = [
    { $sort: { currentStock: 1, _id: 1 } },
    { $skip: skip },
    { $limit: limitNum },
    {
      $lookup: {
        from: 'shelves',
        localField: 'shelf',
        foreignField: '_id',
        pipeline: [{ $project: { shelfCode: 1, warehouseSection: 1 } }],
        as: 'shelf'
      }
    },
    { $unwind: { path: '$shelf', preserveNullAndEmptyArrays: true } },
    { $project: { name: 1, code: 1, unit: 1, category: 1, currentStock: 1, threshold: 1, shelf: 1, locationDetails: 1, updatedAt: 1 } }
  ];

  const pipeline = shouldCount
    ? [{ $match: query }, { $facet: { data: dataPipeline, metadata: [{ $count: 'total' }] } }]
    : [{ $match: query }, ...dataPipeline];

  const aggregateResult = await applyAggregateGuards(Product.aggregate(pipeline));
  const products = shouldCount ? (aggregateResult[0]?.data || []) : aggregateResult;
  const total = shouldCount ? (aggregateResult[0]?.metadata?.[0]?.total || 0) : undefined;

  // Enrich with detailed stock level information
  const enrichedProducts = products.map(p => {
    const stockLevel = determineStockLevel(p.currentStock, p.threshold);
    return {
      ...p,
      isLowStock: p.currentStock <= p.threshold, // Keep for backward compatibility
      stockLevel,
      stockLevelInfo: STOCK_LEVEL_METADATA[stockLevel]
    };
  });

  return {
      success: true,
      message: 'Product inventory retrieved.',
      data: {
        items: standardlizeResponseDataHelper(enrichedProducts),
        pagination: {
          ...buildListPagination({ items: products, total, pageNum, limitNum, cursor: null, withTotal: shouldCount }),
          nextStockCursor: products.length === limitNum ? products[products.length - 1]?.currentStock : null,
          nextIdCursor: products.length === limitNum ? products[products.length - 1]?._id?.toString() : null,
        }
      }
    };
};

/**};

/**
 * Get unified low stock alerts for both materials and products.
 */
export const getUnifiedLowStockAlerts = async () => {
  try {
    const [materials, products] = await Promise.all([
      Material.find({
        isActive: true,
        $expr: { $lte: ['$currentStock', '$threshold'] }
      })
      .select('name code unit currentStock threshold shelf')
      .populate('shelf', 'shelfCode')
      .lean(),
      Product.find({
        isActive: true,
        $expr: { $lte: ['$currentStock', '$threshold'] }
      })
      .select('name code unit currentStock threshold shelf category')
      .populate('shelf', 'shelfCode')
      .lean()
    ]);

    const materialAlerts = materials.map(m => ({
      ...m,
      itemType: 'material',
      stockLevel: determineStockLevel(m.currentStock, m.threshold)
    }));

    const productAlerts = products.map(p => ({
      ...p,
      itemType: 'product',
      stockLevel: determineStockLevel(p.currentStock, p.threshold)
    }));

    const allAlerts = [...materialAlerts, ...productAlerts].sort((a, b) => {
      // Sort by stock percentage of threshold (lowest first)
      const aPct = a.threshold > 0 ? a.currentStock / a.threshold : 0;
      const bPct = b.threshold > 0 ? b.currentStock / b.threshold : 0;
      return aPct - bPct;
    });

    return {
      success: true,
      message: 'Unified low stock alerts retrieved successfully.',
      data: standardlizeResponseDataHelper(allAlerts)
    };
  } catch (error) {
    console.log('[InventoryService] getUnifiedLowStockAlerts error:', error);
    return { success: false, message: error.message, data: [] };
  }
};

/**
 * Background job to check for low stock materials/products and create system notifications.
 */
export const checkAndCreateLowStockNotifications = async () => {
  try {
    console.log('[BackgroundJob] Running unified low stock alerts check...');
    const result = await getUnifiedLowStockAlerts();
    if (!result.success || !result.data || result.data.length === 0) {
      console.log('[BackgroundJob] No low stock items found.');
      return { success: true, count: 0 };
    }

    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    let notifiedCount = 0;

    for (const item of result.data) {
      // Check if we already alerted about this item in the last 12 hours
      const alreadyNotified = await Notification.exists({
        type: 'ALERT',
        'metaData.itemId': item._id,
        createdAt: { $gte: twelveHoursAgo }
      });

      if (!alreadyNotified) {
        const itemTypeName = item.itemType === 'material' ? 'Vật tư' : 'Sản phẩm';
        const isOutOfStock = item.currentStock === 0;
        const priority = isOutOfStock ? 'URGENT' : 'HIGH';
        const title = `[Cảnh báo] ${itemTypeName} ${item.name} ${isOutOfStock ? 'đã hết hàng' : 'sắp hết hàng'}`;
        const message = `${itemTypeName} ${item.name} (${item.code}) hiện chỉ còn ${item.currentStock} ${item.unit || ''} trong kho, dưới mức định mức tối thiểu (${item.threshold} ${item.unit || ''}). Vui lòng kiểm tra và lên kế hoạch nhập hàng/sản xuất.`;

        await notifyUsersByRole({
          roles: [ROLES.ADMIN, ROLES.KHO_MANAGER],
          title,
          message,
          type: 'ALERT',
          priority,
          metaData: {
            itemId: item._id,
            itemType: item.itemType,
            code: item.code,
            currentStock: item.currentStock,
            threshold: item.threshold
          }
        });

        console.log(`[BackgroundJob] Created low stock alert for ${item.code} (${item.name}).`);
        notifiedCount++;
      }
    }

    return { success: true, count: notifiedCount };
  } catch (error) {
    console.error('[BackgroundJob] Error in checkAndCreateLowStockNotifications:', error);
    throw error;
  }
};
