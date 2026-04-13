import Material from '../models/Material.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
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
      .select('name code unit color price currentStock threshold location supplier isActive createdAt updatedAt')
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
    const material = await Material.findOne(query).lean();

    if (!material) {
      return { success: false, message: 'Material not found.', data: null };
    }

    return {
      success: true,
      message: 'Material retrieved successfully.',
      data: standardlizeResponseDataHelper(material)
    };
  } catch (error) {
    console.error('[materialService] getMaterialByIdOrCode error:', error);
    return { success: false, message: error.message, data: null };
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
    }], { session });

    await session.commitTransaction();

    return {
      success: true,
      message: 'Stock adjusted successfully.',
      data: { material, transaction: transaction[0] }
    };
  } catch (error) {
    await session.abortTransaction();
    console.error('[materialService] adjustMaterialStock error:', error);
    return { success: false, message: error.message, data: null };
  } finally {
    session.endSession();
  }
};

/**
 * Get material history with pagination and filtering.
 */
export const getMaterialHistoryService = async ({ materialId, page = 1, limit = 10 }) => {
  try {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter = materialId ? { material: materialId } : {};

    const [history, total] = await Promise.all([
      InventoryTransaction.find(filter)
        .populate('performedBy', 'fullName username')
        .populate('material', 'name code unit color')
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
    console.error('[materialService] getMaterialHistoryService error:', error);
    return { success: false, message: error.message, data: null };
  }
};

/**
 * Get materials with low stock.
 */
export const getLowStockMaterialsService = async ({ search = '', page = 1, limit = 10 }) => {
  try {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Filter for low stock: currentStock <= threshold
    const query = {
      isActive: true,
      $expr: { $lte: ["$currentStock", "$threshold"] }
    };

    // Add search if provided
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { name: searchRegex },
        { code: searchRegex }
      ];
    }

    const [materials, total] = await Promise.all([
      Material.find(query)
        .select('name code unit currentStock threshold price color location supplier isActive createdAt')
        .sort({ currentStock: 1 }) // Show most critical first
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Material.countDocuments(query)
    ]);

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
    console.error('[materialService] getLowStockMaterialsService error:', error);
    return { success: false, message: error.message, data: null };
  }
};
