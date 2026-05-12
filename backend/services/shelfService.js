import Shelf from '../models/Shelf.js';
import Material from '../models/Material.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

/**
 * Get all shelves with their current items (Materials and Products)
 * Optimization: Uses Aggregation Pipeline to avoid N+1 queries.
 */
export const getAllShelves = async (query = {}) => {
  try {
    const { search, warehouseSection, category, status } = query;
    const match = { isActive: true };

    // --- Search & Filters ---
    if (search) {
      match.shelfCode = { $regex: search.trim(), $options: 'i' };
    }
    if (warehouseSection) {
      match.warehouseSection = warehouseSection;
    }
    if (category) {
      match.category = category;
    }
    if (status) {
      match.status = status;
    }

    // --- Aggregation Pipeline ---
    const detailedShelves = await Shelf.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'materials',
          localField: '_id',
          foreignField: 'shelf',
          pipeline: [
            { $match: { isActive: true } },
            { $project: { name: 1, code: 1, currentStock: 1, unit: 1, type: { $literal: 'Material' } } }
          ],
          as: 'materialItems'
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'shelf',
          pipeline: [
            { $match: { isActive: true } },
            { $project: { name: 1, code: 1, currentStock: 1, unit: 1, type: { $literal: 'Product' } } }
          ],
          as: 'productItems'
        }
      },
      {
        $addFields: {
          items: { $concatArrays: ['$materialItems', '$productItems'] }
        }
      },
      {
        $addFields: {
          currentLoad: { $sum: '$items.currentStock' },
          itemCount: { $size: '$items' }
        }
      },
      {
        $project: { materialItems: 0, productItems: 0 }
      },
      { $sort: { shelfCode: 1 } }
    ]);

    return {
      success: true,
      message: detailedShelves.length > 0 ? 'Shelves retrieved successfully.' : 'No shelves found.',
      data: detailedShelves
    };
  } catch (error) {
    console.log('[ShelfService] getAllShelves error:', error);
    return { status: 'error', message: 'Internal server error while retrieving shelves.', data: null };
  }
};

/**
 * Get a single shelf by ID with detailed item list.
 */
export const getShelfById = async (id) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { status: 'error', message: 'Invalid shelf ID.', data: null };
    }

    const shelf = await Shelf.findById(id).lean();
    if (!shelf) return { status: 'error', message: 'Shelf not found.', data: null };

    // Fetch items linked to this shelf
    const [materials, products] = await Promise.all([
      Material.find({ shelf: id, isActive: true }).select('name code currentStock unit description locationDetails').lean(),
      Product.find({ shelf: id, isActive: true }).select('name code currentStock unit description locationDetails').lean()
    ]);

    const items = [
      ...materials.map(m => ({ ...m, type: 'Material' })),
      ...products.map(p => ({ ...p, type: 'Product' }))
    ];

    const currentLoad = items.reduce((sum, item) => sum + (item.currentStock || 0), 0);

    return {
      success: true,
      message: 'Shelf details retrieved successfully.',
      data: {
        ...shelf,
        items,
        currentLoad,
        isEmpty: currentLoad === 0
      }
    };
  } catch (error) {
    console.log('[ShelfService] getShelfById error:', error);
    return { status: 'error', message: error.message, data: null };
  }
};

/**
 * Create a new shelf.
 */
export const createShelf = async (shelfData) => {
  try {
    const existingShelf = await Shelf.findOne({ shelfCode: shelfData.shelfCode.toUpperCase() });
    if (existingShelf) {
      return { status: 'error', message: `Shelf code "${shelfData.shelfCode}" already exists.`, data: null };
    }

    const newShelf = new Shelf(shelfData);
    await newShelf.save();
    return {
      success: true,
      message: 'Shelf created successfully.',
      data: newShelf
    };
  } catch (error) {
    console.log('[ShelfService] createShelf error:', error);
    return { status: 'error', message: 'Failed to create shelf.', data: null };
  }
};

/**
 * Update an existing shelf.
 */
export const updateShelf = async (id, updateData) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { status: 'error', message: 'Invalid shelf ID.', data: null };
    }

    const shelf = await Shelf.findByIdAndUpdate(id, updateData, { returnDocument: 'after' }).lean();
    if (!shelf) return { status: 'error', message: 'Shelf not found.', data: null };

    return {
      success: true,
      message: 'Shelf updated successfully.',
      data: shelf
    };
  } catch (error) {
    console.log('[ShelfService] updateShelf error:', error);
    return { status: 'error', message: 'Failed to update shelf.', data: null };
  }
};

/**
 * Delete a shelf (soft delete).
 */
export const deleteShelf = async (id) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { status: 'error', message: 'Invalid shelf ID.', data: null };
    }

    // Check if shelf has items before deleting
    const [materialCount, productCount] = await Promise.all([
      Material.countDocuments({ shelf: id, isActive: true }),
      Product.countDocuments({ shelf: id, isActive: true })
    ]);

    if (materialCount > 0 || productCount > 0) {
      return {
        status: 'error',
        message: 'Cannot delete shelf that contains active items. Please move items first.',
        data: { materialCount, productCount }
      };
    }

    const shelf = await Shelf.findByIdAndUpdate(id, { isActive: false }, { returnDocument: 'after' }).lean();
    if (!shelf) return { status: 'error', message: 'Shelf not found.', data: null };

    return {
      success: true,
      message: 'Shelf deleted successfully.',
      data: null
    };
  } catch (error) {
    console.log('[ShelfService] deleteShelf error:', error);
    return { status: 'error', message: 'Failed to delete shelf.', data: null };
  }
};

/**
 * Recalculate and update the current load of a shelf.
 */
export const updateShelfLoad = async (shelfId) => {
  try {
    const [materials, products] = await Promise.all([
      Material.find({ shelf: shelfId, isActive: true }).select('currentStock').lean(),
      Product.find({ shelf: shelfId, isActive: true }).select('currentStock').lean()
    ]);

    const totalLoad = [...materials, ...products].reduce((sum, item) => sum + (item.currentStock || 0), 0);

    const shelf = await Shelf.findById(shelfId);
    if (shelf) {
      shelf.currentLoad = totalLoad;
      shelf.status = totalLoad >= shelf.maxCapacity ? 'Full' : 'Available';
      await shelf.save();
    }
  } catch (error) {
    console.error(`[ShelfService] updateShelfLoad error for shelf ${shelfId}:`, error);
  }
};
