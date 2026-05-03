import Material from '../models/Material.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import MaterialRequisition from '../models/MaterialRequisition.js';
import { REQUISITION_STATUS } from '../utils/constants.js';
import mongoose from 'mongoose';
import { standardlizeResponseDataHelper } from '../utils/standardlizeResponseData.js';

const MAX_LIMIT = 100;

/**
 * Get all materials with filtering, searching and pagination.
 */
export const getMaterials = async ({ search = '', page = 1, limit = 10, filters = {} }) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const query = {};

  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    query.$or = [{ name: searchRegex }, { code: searchRegex }];
  }

  if (filters.color) query.color = { $regex: filters.color, $options: 'i' };
  if (filters.unit) query.unit = filters.unit;

  if (filters.stockGt !== undefined || filters.stockLt !== undefined) {
    query.currentStock = {};
    if (filters.stockGt !== undefined) query.currentStock.$gt = parseFloat(filters.stockGt);
    if (filters.stockLt !== undefined) query.currentStock.$lt = parseFloat(filters.stockLt);
  }

  if (filters.priceGt !== undefined || filters.priceLt !== undefined) {
    query.price = {};
    if (filters.priceGt !== undefined) query.price.$gt = parseFloat(filters.priceGt);
    if (filters.priceLt !== undefined) query.price.$lt = parseFloat(filters.priceLt);
  }

  const [materials, total] = await Promise.all([
    Material.find(query)
      .select('name code unit color price currentStock threshold shelf locationDetails supplier isActive createdAt updatedAt')
      .populate('shelf', 'shelfCode warehouseSection')
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
 * Get material by ID or code.
 */
export const getMaterialByIdOrCode = async ({ id, code }) => {
  try {
    const query = id ? { _id: id } : { code: code.toUpperCase() };
    const material = await Material.findOne(query)
      .populate('shelf', 'shelfCode warehouseSection')
      .lean();

    if (!material) {
      return { success: false, message: 'Material not found.', data: null };
    }

    return {
      success: true,
      message: 'Material retrieved successfully.',
      data: standardlizeResponseDataHelper([material])[0]
    };
  } catch (error) {
    console.log('[materialService] getMaterialByIdOrCode error:', error);
    return { success: false, message: 'Failed to retrieve material: ' + error.message, data: null };
  }
};

/**
 * Adjust stock for a material atomically using Mongoose sessions.
 */
export const adjustMaterialStock = async (materialId, { type, quantity, note, sender, receiver, orderRef, performedBy }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const material = await Material.findById(materialId).session(session);
    if (!material) {
      throw new Error('Material not found.');
    }

    const beforeStock = material.currentStock;
    const afterStock = beforeStock + quantity;

    if (afterStock < 0) {
      throw new Error('Stock cannot be less than 0.');
    }

    // 1. Update stock
    material.currentStock = afterStock;
    await material.save({ session });

    // 2. Record transaction
    const transaction = await InventoryTransaction.create([{
      material: material._id,
      type,
      quantity,
      beforeStock,
      afterStock,
      performedBy,
      sender,
      receiver,
      orderRef,
      location: material.location,
      note: note || `Manual adjustment: ${type}`
    }], { session, ordered: true });

    await session.commitTransaction();

    return {
      success: true,
      message: 'Stock adjusted successfully.',
      data: { material, transaction: transaction[0] }
    };
  } catch (error) {
    await session.abortTransaction();
    console.log('[materialService] adjustMaterialStock error:', error);
    return { success: false, message: 'Failed to adjust stock: ' + error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Get material history with pagination and filtering.
 */
export const getMaterialHistoryService = async ({ materialId, type, direction, page = 1, limit = 10 }) => {
  try {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter = materialId ? { material: materialId } : {};

    if (type) filter.type = type;
    if (direction === 'in') filter.quantity = { $gt: 0 };
    if (direction === 'out') filter.quantity = { $lt: 0 };

    const [history, total] = await Promise.all([
      InventoryTransaction.find(filter)
        .populate('performedBy', 'fullName username')
        .populate('material', 'name code unit color supplier price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      InventoryTransaction.countDocuments(filter)
    ]);

    return {
      success: true,
      message: 'Material history retrieved successfully.',
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
    console.log('[materialService] getMaterialHistoryService error:', error);
    return { success: false, message: 'Failed to retrieve material history: ' + error.message, data: null };
  }
};

/**
 * Get materials with low stock.
 * Includes materials below threshold AND materials with pending demand exceeding current stock.
 */
export const getLowStockMaterialsService = async ({ search = '', page = 1, limit = 10 }) => {
  try {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build the aggregation pipeline
    const pipeline = [
      { $match: { isActive: true } },
      // Optional: search by name/code early in the pipeline
      ...(search ? [{
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } }
          ]
        }
      }] : []),
      // Lookup pending requisitions demand for each material
      {
        $lookup: {
          from: 'materialrequisitions',
          let: { materialId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$status', [REQUISITION_STATUS.PENDING, REQUISITION_STATUS.ACCEPTED, REQUISITION_STATUS.PREPARING]] }
                  ]
                }
              }
            },
            { $unwind: '$items' },
            { $match: { $expr: { $eq: ['$items.material', '$$materialId'] } } },
            { $group: { _id: null, totalDemand: { $sum: '$items.requestedQuantity' } } }
          ],
          as: 'demandInfo'
        }
      },
      {
        $addFields: {
          totalDemand: { $ifNull: [{ $arrayElemAt: ['$demandInfo.totalDemand', 0] }, 0] }
        }
      },
      // Filter for low stock: currentStock <= threshold OR currentStock < totalDemand
      {
        $match: {
          $or: [
            { $expr: { $lte: ["$currentStock", "$threshold"] } },
            { $expr: { $lt: ["$currentStock", "$totalDemand"] } }
          ]
        }
      },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: { currentStock: 1 } },
            { $skip: skip },
            { $limit: limitNum },
            {
              $project: {
                name: 1, code: 1, unit: 1, currentStock: 1, threshold: 1,
                price: 1, color: 1, location: 1, supplier: 1, isActive: 1,
                createdAt: 1, totalDemand: 1
              }
            }
          ]
        }
      }
    ];

    const result = await Material.aggregate(pipeline);
    const materials = result[0].data;
    const total = result[0].metadata[0]?.total || 0;

    return {
      success: true,
      message: materials.length > 0 ? 'Low stock materials found.' : 'No low stock materials found.',
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
  } catch (error) {
    console.log('[materialService] getLowStockMaterialsService error:', error);
    return { success: false, message: error.message, data: null };
  }
};
