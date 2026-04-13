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

    if (!result.success) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: result.message,
        data: null
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('[MaterialController] getAllMaterials error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to retrieve materials.',
      data: null
    });
  }
};

/**
 * Get a single material by ID.
 */
export const getMaterialById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await materialService.getMaterialByIdOrCode({ id });

    if (!result.success) {
      return res.status(StatusCodes.NOT_FOUND).json(result);
    }

    return res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.error('[MaterialController] getMaterialById error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to retrieve material.',
      data: null
    });
  }
};

/**
 * Get a single material by its unique code (for barcode/QR scanning).
 */
export const getMaterialByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const result = await materialService.getMaterialByIdOrCode({ code });

    if (!result.success) {
      return res.status(StatusCodes.NOT_FOUND).json(result);
    }

    return res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.error('[MaterialController] getMaterialByCode error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to retrieve material by code.',
      data: null
    });
  }
};

/**
 * Get materials with low stock (under their own threshold) with searching and pagination.
 */
export const getLowStockMaterials = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;

    const result = await materialService.getLowStockMaterialsService({
      search,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    if (!result.success) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: result.message,
        data: null
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('[MaterialController] getLowStockMaterials error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to retrieve low stock materials.',
      data: null
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
        success: false,
        message: error.details.map(d => d.message).join(', '),
        data: null
      });
    }

    const existingMaterial = await Material.findOne({ code: value.code.toUpperCase() });
    if (existingMaterial) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: 'Material code already exists.',
        data: null
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
      success: true,
      message: 'Material created successfully.',
      data: { material: newMaterial }
    });
  } catch (error) {
    console.error('[MaterialController] createMaterial error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to create material.',
      data: null
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
        success: false,
        message: error.details.map(d => d.message).join(', '),
        data: null
      });
    }

    const material = await Material.findByIdAndUpdate(id, value, { new: true });
    if (!material) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Material not found.',
        data: null
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
      success: true,
      message: 'Material updated successfully.',
      data: { material }
    });
  } catch (error) {
    console.error('[MaterialController] updateMaterial error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update material.',
      data: null
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
        success: false,
        message: error.details.map(d => d.message).join(', '),
        data: null
      });
    }

    const result = await materialService.adjustMaterialStock(id, {
      ...value,
      performedBy: req.userId
    });

    if (!result.success) {
      const statusCode = result.message === 'Material not found.' ? StatusCodes.NOT_FOUND : StatusCodes.BAD_REQUEST;
      return res.status(statusCode).json(result);
    }

    const { material } = result.data;
    await logActivity({
      author: req.userId,
      action: 'ADJUST_STOCK',
      module: 'MATERIAL',
      details: `Adjusted stock for ${material.name}: ${value.quantity > 0 ? '+' : ''}${value.quantity} ${material.unit}`,
      targetId: material._id,
      metadata: {
        beforeStock: result.data.transaction.beforeStock,
        afterStock: result.data.transaction.afterStock,
        type: value.type
      }
    }, req);

    return res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.error('[MaterialController] adjustStock error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to adjust stock.',
      data: null
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
        success: false,
        message: error.details.map(d => d.message).join(', '),
        data: null
      });
    }

    // 1. Get material by code
    const materialResult = await materialService.getMaterialByIdOrCode({ code: value.code });
    if (!materialResult.success) {
      return res.status(StatusCodes.NOT_FOUND).json(materialResult);
    }

    // 2. Adjust stock
    const result = await materialService.adjustMaterialStock(materialResult.data._id, {
      ...value,
      performedBy: req.userId
    });

    if (!result.success) {
      return res.status(StatusCodes.BAD_REQUEST).json(result);
    }

    const { material } = result.data;
    await logActivity({
      author: req.userId,
      action: 'ADJUST_STOCK_BARCODE',
      module: 'MATERIAL',
      details: `Barcode stock adjustment for ${material.name}: ${value.quantity > 0 ? '+' : ''}${value.quantity} ${material.unit}`,
      targetId: material._id,
      metadata: {
        code: value.code,
        beforeStock: result.data.transaction.beforeStock,
        afterStock: result.data.transaction.afterStock,
        type: value.type
      }
    }, req);

    return res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.error('[MaterialController] adjustStockByCode error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to adjust stock via barcode.',
      data: null
    });
  }
};

/**
 * Get inventory transaction history for a material.
 */
export const getMaterialHistory = async (req, res) => {
  try {
    const { id: idParam } = req.params;
    const { id: idQuery, code, page = 1, limit = 10 } = req.query;

    let materialId = (idParam && idParam !== 'all') ? idParam : idQuery;

    // 1. If we have a code but no materialId, resolve the materialId first
    if (!materialId && code) {
      const materialResult = await materialService.getMaterialByIdOrCode({ code });
      if (!materialResult.success) {
        return res.status(StatusCodes.NOT_FOUND).json(materialResult);
      }
      materialId = materialResult.data._id;
    }

    // 2. Fetch history
    const result = await materialService.getMaterialHistoryService({
      materialId,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    if (!result.success) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(result);
    }

    return res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.error('[MaterialController] getMaterialHistory error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to retrieve material history.',
      data: null
    });
  }
};
