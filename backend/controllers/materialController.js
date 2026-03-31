import Material from '../models/Material.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import { StatusCodes } from 'http-status-codes';
import * as materialService from '../services/materialService.js';
import { 
  createMaterialValidator, 
  updateMaterialValidator, 
  adjustStockValidator,
  adjustStockByCodeValidator
} from '../validations/materialValidation.js';
import { TRANSACTION_TYPE } from '../utils/constants.js';
import { logActivity } from '../utils/logger.js';

/**
 * Get all materials with filtering, search, and pagination.
 */
export const getAllMaterials = async (req, res) => {
  try {
    const { 
      search = '', 
      page = 1, 
      limit = 10,
      stockGt, stockLt,
      priceGt, priceLt,
      color, unit
    } = req.query;

    const pageNum = parseInt(page || 1);
    const limitNum = parseInt(limit || 10);

    const filters = {
      color,
      unit,
      stockGt: stockGt !== undefined ? parseFloat(stockGt) : undefined,
      stockLt: stockLt !== undefined ? parseFloat(stockLt) : undefined,
      priceGt: priceGt !== undefined ? parseFloat(priceGt) : undefined,
      priceLt: priceLt !== undefined ? parseFloat(priceLt) : undefined,
    };

    const result = await materialService.getMaterials({ 
      search, 
      page: pageNum, 
      limit: limitNum,
      filters
    });

    return res.status(StatusCodes.OK).json({ 
      data: result 
    });
  } catch (error) {
    console.error('[MaterialController] getAllMaterials error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: { message: 'Failed to retrieve materials.' }
    });
  }
};

/**
 * Get a single material by ID.
 */
export const getMaterialById = async (req, res) => {
  try {
    const { id } = req.params;
    const material = await materialService.getMaterialById(id);

    if (!material) {
      return res.status(StatusCodes.NOT_FOUND).json({
        data: { message: 'Material not found.' }
      });
    }

    return res.status(StatusCodes.OK).json({ data: material });
  } catch (error) {
    console.error('[MaterialController] getMaterialById error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: { message: 'Failed to retrieve material.' }
    });
  }
};

/**
 * Get a single material by its unique code (for barcode/QR scanning).
 */
export const getMaterialByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const material = await Material.findOne({ code: code.toUpperCase() });
    
    if (!material) {
      return res.status(StatusCodes.NOT_FOUND).json({
        data: { message: 'Material not found with this code.' }
      });
    }

    return res.status(StatusCodes.OK).json({ data: material });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: { message: 'Failed to retrieve material by code.' }
    });
  }
};

/**
 * Get materials with low stock (under threshold).
 */
export const getLowStockMaterials = async (req, res) => {
  try {
    const lowStockMaterials = await Material.find({
      $expr: { $lte: ["$currentStock", "$threshold"] },
      isActive: true
    });
    return res.status(StatusCodes.OK).json({ data: lowStockMaterials });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: { message: 'Failed to retrieve low stock materials.' }
    });
  }
};

/**
 * Create a new material.
 */
export const createMaterial = async (req, res) => {
  try {
    const { error, value } = createMaterialValidator(req.body);
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        data: { message: error.details.map(d => d.message).join(', ') }
      });
    }

    const existingMaterial = await Material.findOne({ code: value.code.toUpperCase() });
    if (existingMaterial) {
      return res.status(StatusCodes.CONFLICT).json({
        data: { message: 'Material code already exists.' }
      });
    }

    const newMaterial = await Material.create(value);

    await logActivity({
      author: req.userId,
      action: 'CREATE_MATERIAL',
      module: 'MATERIAL',
      details: `Created new material: ${newMaterial.name} (${newMaterial.code})`,
      targetId: newMaterial._id
    }, req);

    return res.status(StatusCodes.CREATED).json({
      data: { message: 'Material created successfully.', material: newMaterial }
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: { message: 'Failed to create material.' }
    });
  }
};

/**
 * Update an existing material.
 */
export const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateMaterialValidator(req.body);
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        data: { message: error.details.map(d => d.message).join(', ') }
      });
    }

    const material = await Material.findByIdAndUpdate(id, value, { new: true });
    if (!material) {
      return res.status(StatusCodes.NOT_FOUND).json({
        data: { message: 'Material not found.' }
      });
    }

    await logActivity({
      author: req.userId,
      action: 'UPDATE_MATERIAL',
      module: 'MATERIAL',
      details: `Updated material: ${material.name} (${material.code})`,
      targetId: material._id,
      metadata: value
    }, req);

    return res.status(StatusCodes.OK).json({
      data: { message: 'Material updated successfully.', material }
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: { message: 'Failed to update material.' }
    });
  }
};

/**
 * Manually adjust stock (Stock In/Out).
 */
export const adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = adjustStockValidator(req.body);
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        data: { message: error.details.map(d => d.message).join(', ') }
      });
    }

    const material = await Material.findById(id);
    if (!material) {
      return res.status(StatusCodes.NOT_FOUND).json({
        data: { message: 'Material not found.' }
      });
    }

    const beforeStock = material.currentStock;
    const afterStock = beforeStock + value.quantity;

    if (afterStock < 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        data: { message: 'Stock cannot be less than 0.' }
      });
    }

    // Update stock level
    material.currentStock = afterStock;
    await material.save();

    // Record inventory transaction
    await InventoryTransaction.create({
      material: material._id,
      type: value.type,
      quantity: value.quantity,
      beforeStock,
      afterStock,
      performedBy: req.userId,
      note: value.note || `Manual adjustment by ${value.type}`
    });

    await logActivity({
      author: req.userId,
      action: 'ADJUST_STOCK',
      module: 'MATERIAL',
      details: `Adjusted stock for ${material.name}: ${value.quantity > 0 ? '+' : ''}${value.quantity} ${material.unit}`,
      targetId: material._id,
      metadata: { beforeStock, afterStock, type: value.type }
    }, req);

    return res.status(StatusCodes.OK).json({
      data: { 
        message: 'Stock adjusted successfully.', 
        material 
      }
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: { message: 'Failed to adjust stock.' }
    });
  }
};

/**
 * Adjust stock using material code (for QR/Barcode scanners).
 */
export const adjustStockByCode = async (req, res) => {
  try {
    const { error, value } = adjustStockByCodeValidator(req.body);
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        data: { message: error.details.map(d => d.message).join(', ') }
      });
    }

    const material = await Material.findOne({ code: value.code.toUpperCase() });
    if (!material) {
      return res.status(StatusCodes.NOT_FOUND).json({
        data: { message: 'Material not found with this code.' }
      });
    }

    const beforeStock = material.currentStock;
    const afterStock = beforeStock + value.quantity;

    if (afterStock < 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        data: { message: 'Stock cannot be less than 0.' }
      });
    }

    material.currentStock = afterStock;
    await material.save();

    await InventoryTransaction.create({
      material: material._id,
      type: value.type,
      quantity: value.quantity,
      beforeStock,
      afterStock,
      performedBy: req.userId,
      note: value.note || `Barcode adjustment by ${value.type}`
    });

    await logActivity({
      author: req.userId,
      action: 'ADJUST_STOCK_BARCODE',
      module: 'MATERIAL',
      details: `Barcode stock adjustment for ${material.name}: ${value.quantity > 0 ? '+' : ''}${value.quantity} ${material.unit}`,
      targetId: material._id,
      metadata: { code: value.code, beforeStock, afterStock, type: value.type }
    }, req);

    return res.status(StatusCodes.OK).json({
      data: { 
        message: 'Stock adjusted via barcode successfully.', 
        material 
      }
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: { message: 'Failed to adjust stock via barcode.' }
    });
  }
};

/**
 * Get inventory transaction history for a material.
 * Supports filtering by material ID (params), code (query), or all history.
 * Supports pagination.
 */
export const getMaterialHistory = async (req, res) => {
  try {
    const { id: idParam } = req.params;
    const { id: idQuery, code, page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page || 1);
    const limitNum = parseInt(limit || 10);
    const skip = (pageNum - 1) * limitNum;
    
    let filter = {};

    // 1. Determine material ID from params or query
    const materialId = (idParam && idParam !== 'all') ? idParam : idQuery;

    if (materialId) {
      filter.material = materialId;
    } 
    // 2. If no materialId, check for material code
    else if (code) {
      const material = await Material.findOne({ code: code.toUpperCase() });
      if (!material) {
        return res.status(StatusCodes.NOT_FOUND).json({
          data: { message: 'Material not found with this code.' }
        });
      }
      filter.material = material._id;
    }

    const total = await InventoryTransaction.countDocuments(filter);
    const history = await InventoryTransaction.find(filter)
      .populate('performedBy', 'fullName username')
      .populate('material', 'name code unit color')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
      
    return res.status(StatusCodes.OK).json({ 
      data: {
        history,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      } 
    });
  } catch (error) {
    console.error('getMaterialHistory Error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: { message: 'Failed to retrieve material history.' }
    });
  }
};
