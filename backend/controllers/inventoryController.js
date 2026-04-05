import * as inventoryService from '../services/inventoryService.js';
import { StatusCodes } from 'http-status-codes';

/**
 * Controller to get a quick summary of current inventory stats.
 */
export const getOverview = async (req, res) => {
  const result = await inventoryService.getInventoryOverview();
  
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
};

/**
 * Controller to get material inventory list with search and pagination.
 */
export const getMaterialsStock = async (req, res) => {
  const { search = '', page = 1, limit = 10 } = req.query;
  const result = await inventoryService.getMaterialInventory({ search, page, limit });

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
};

/**
 * Controller to get product inventory list with search and pagination.
 */
export const getProductsStock = async (req, res) => {
  const { search = '', page = 1, limit = 10 } = req.query;
  const result = await inventoryService.getProductInventory({ search, page, limit });

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
};
