import Material from '../models/Material.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import MaterialRequisition from '../models/MaterialRequisition.js';
import Product from '../models/Product.js';
import { REQUISITION_STATUS } from '../utils/constants.js';
import mongoose from 'mongoose';
import { standardlizeResponseDataHelper } from '../utils/standardlizeResponseData.js';
import { ServiceResponse } from '../utils/serviceHelper.js';

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

  return ServiceResponse(true, 'Materials retrieved successfully.', {
    materials: standardlizeResponseDataHelper(materials),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    }
  });
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
      return ServiceResponse(false, 'Material not found.', null, 404);
    }

    return ServiceResponse(true, 'Material retrieved successfully.', standardlizeResponseDataHelper([material])[0]);
  } catch (error) {
    console.log('[materialService] getMaterialByIdOrCode error:', error);
    return ServiceResponse(false, 'Failed to retrieve material: ' + error.message);
  }
};

/**
 * Create a new material.
 */
export const createMaterialService = async (materialData) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const existingMaterial = await Material.findOne({ code: materialData.code.toUpperCase() }).session(session);
    if (existingMaterial) {
      throw new Error('Material code already exists.');
    }

    const [newMaterial] = await Material.create([materialData], { session });

    // Sync with Product (Optional: only if you want initial sync)
    await Product.syncMaterialChanges(newMaterial._id, {
      name: newMaterial.name,
      code: newMaterial.code,
      price: newMaterial.price,
      unit: newMaterial.unit,
      currency: newMaterial.currency
    });

    await session.commitTransaction();
    return ServiceResponse(true, 'Material created successfully.', newMaterial, 201);
  } catch (error) {
    await session.abortTransaction();
    console.log('[materialService] createMaterialService error:', error);
    return ServiceResponse(false, error.message);
  } finally {
    session.endSession();
  }
};

/**
 * Update an existing material and sync with Products.
 */
export const updateMaterialService = async (id, updateData) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const material = await Material.findByIdAndUpdate(id, updateData, { 
      session, 
      new: true, 
      runValidators: true 
    });

    if (!material) {
      throw new Error('Material not found.');
    }

    // FIX ISSUE 4: Sync material changes to Products in the same transaction
    await Product.syncMaterialChanges(material._id, {
      name: material.name,
      code: material.code,
      price: material.price,
      unit: material.unit,
      currency: material.currency
    });

    await session.commitTransaction();
    return ServiceResponse(true, 'Material updated successfully.', material);
  } catch (error) {
    await session.abortTransaction();
    console.log('[materialService] updateMaterialService error:', error);
    return ServiceResponse(false, error.message);
  } finally {
    session.endSession();
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
    material.currentStock += quantity;

    if (material.currentStock < 0) {
      throw new Error(`Insufficient stock for material ${material.code}. Available: ${beforeStock}, Adjustment: ${quantity}`);
    }

    await material.save({ session });

    const transaction = new InventoryTransaction({
      material: materialId,
      type,
      quantity,
      beforeStock,
      afterStock: material.currentStock,
      sender,
      receiver,
      orderRef,
      note,
      performedBy
    });

    await transaction.save({ session });
    await session.commitTransaction();

    return ServiceResponse(true, 'Stock adjusted successfully.', material);
  } catch (error) {
    await session.abortTransaction();
    console.log('[materialService] adjustMaterialStock error:', error);
    return ServiceResponse(false, error.message);
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
export const getLowStockMaterialsService = async ({ page = 1, limit = 10 }) => {
  try {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const pipeline = [
      { $match: { isActive: true, $expr: { $lte: ["$currentStock", "$threshold"] } } },
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

    return ServiceResponse(true, materials.length > 0 ? 'Low stock materials found.' : 'No low stock materials found.', {
      materials: standardlizeResponseDataHelper(materials),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.log('[materialService] getLowStockMaterialsService error:', error);
    return ServiceResponse(false, error.message);
  }
};
