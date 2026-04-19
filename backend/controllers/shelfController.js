import * as shelfService from '../services/shelfService.js';
import { handleServiceResponse } from '../utils/responseHelper.js';
import { createShelfValidator, updateShelfValidator } from '../validations/shelfValidation.js';
import { logActivity } from '../utils/logger.js';
import { StatusCodes } from 'http-status-codes';

/**
 * Controller to get all shelves.
 */
export const getAllShelves = async (req, res) => {
  try {
    const result = await shelfService.getAllShelves(req.query);
    return handleServiceResponse(res, result);
  } catch (error) {
    console.error('[ShelfController] getAllShelves error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error while retrieving shelves.',
      data: null
    });
  }
};

/**
 * Controller to get a single shelf by ID.
 */
export const getShelfById = async (req, res) => {
  try {
    const result = await shelfService.getShelfById(req.params.id);
    return handleServiceResponse(res, result);
  } catch (error) {
    console.error('[ShelfController] getShelfById error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error while retrieving shelf details.',
      data: null
    });
  }
};

/**
 * Controller to create a new shelf.
 */
export const createShelf = async (req, res) => {
  try {
    const { error, value } = createShelfValidator(req.body);
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: error.details.map(d => d.message).join(', '),
        data: null
      });
    }

    const result = await shelfService.createShelf(value);

    if (result.status === 'success') {
      await logActivity({
        author: req.userId,
        action: 'CREATE_SHELF',
        module: 'SHELF',
        details: `Created new shelf: ${result.data.shelfCode}`,
        targetId: result.data._id
      }, req);
    }

    return handleServiceResponse(res, result, StatusCodes.CREATED);
  } catch (error) {
    console.error('[ShelfController] createShelf error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error while creating shelf.',
      data: null
    });
  }
};

/**
 * Controller to update an existing shelf.
 */
export const updateShelf = async (req, res) => {
  try {
    const { error, value } = updateShelfValidator(req.body);
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: error.details.map(d => d.message).join(', '),
        data: null
      });
    }

    const result = await shelfService.updateShelf(req.params.id, value);

    if (result.status === 'success') {
      await logActivity({
        author: req.userId,
        action: 'UPDATE_SHELF',
        module: 'SHELF',
        details: `Updated shelf: ${result.data.shelfCode}`,
        targetId: req.params.id
      }, req);
    }

    return handleServiceResponse(res, result);
  } catch (error) {
    console.error('[ShelfController] updateShelf error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error while updating shelf.',
      data: null
    });
  }
};

/**
 * Controller to delete a shelf.
 */
export const deleteShelf = async (req, res) => {
  try {
    const result = await shelfService.deleteShelf(req.params.id);

    if (result.status === 'success') {
      await logActivity({
        author: req.userId,
        action: 'DELETE_SHELF',
        module: 'SHELF',
        details: `Deleted shelf with ID: ${req.params.id}`,
        targetId: req.params.id
      }, req);
    }

    return handleServiceResponse(res, result);
  } catch (error) {
    console.error('[ShelfController] deleteShelf error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Internal server error while deleting shelf.',
      data: null
    });
  }
};
