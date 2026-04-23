import User from '../models/User.js';
import Role from '../models/Roles.js';
import { StatusCodes } from 'http-status-codes';
import { createUserValidator, updateUserValidator } from '../validations/userValidation.js';
import { logActivity } from '../utils/logger.js';
import * as userService from '../services/userService.js';
import { standardlizeResponseDataHelper } from '../utils/standardlizeResponseData.js';
import { ROLES } from '../utils/constants.js';
import { clearCacheByPattern, delUserAccessInfo, getCachedData, setCachedData } from '../utils/redisFetching.js';

/**
 * Get all users with filtering, searching, and pagination.
 */
export const getAllUsers = async (req, res) => {
  try {
    const { role: roleName, isActive, limit = 10, page = 1, search = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Create a unique cache key based on query parameters
    const cacheKey = `user:list:${JSON.stringify({ roleName, isActive, limitNum, pageNum, search })}`;

    // Try to get data from Redis
    const cachedResult = await getCachedData(cacheKey);
    if (cachedResult) {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Users retrieved successfully (from cache).',
        data: cachedResult
      });
    }

    let filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    if (roleName) {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(roleName);
      if (isObjectId) {
        filter.role = roleName;
      } else {
        const role = await Role.findOne({ roleName: roleName.toLowerCase() });
        if (role) {
          filter.role = role._id;
        } else {
          return res.status(StatusCodes.OK).json({
            data: {
              users: [],
              pagination: { total: 0, page: pageNum, limit: limitNum, pages: 0 }
            }
          });
        }
      }
    }

    const result = await userService.getUserByQuery(filter, pageNum, limitNum, search);

    if (!result.success) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: result.message,
        data: null
      });
    }

    // Cache the successful result in Redis (short TTL: 5 minutes)
    await setCachedData(cacheKey, result.data);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.log('[UserController] getAllUsers Error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to retrieve users.',
      data: null
    });
  }
};

/**
 * Get a single user by ID.
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const   result = await userService.getUserById(id);

    if (!result.success) {
      const statusCode = result.message === 'User not found.' ? StatusCodes.NOT_FOUND : StatusCodes.INTERNAL_SERVER_ERROR;
      return res.status(statusCode).json({
        success: false,
        message: result.message,
        data: null
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: result.message,
      data: { user: result.data }
    });
  } catch (error) {
    console.log('[UserController] getUserById Error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to retrieve user.',
      data: null
    });
  }
};

/**
 * Admin creates a new user account.
 */
export const createUser = async (req, res) => {
  try {
    const { error, value } = createUserValidator(req.body);
    if (error) {
      console.log('error', error)
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Validation Error: ' + error.details.map(d => d.message).join(', '),
        data: null
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: value.email }, { username: value.username }]
    });

    if (existingUser) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: 'Username or Email already exists.',
        data: null
      });
    }

    if (!value.role) {
      const staffRole = await Role.findOne({ roleName: ROLES.STAFF });
      value.role = staffRole?._id;
    } else {
      const role = await Role.findOne({ roleName: value.role });
      value.role = role?._id;
    }
    if (req.imageUrl) {
      value.avatar = req.imageUrl;
    }
    const newUser = await User.create(value)

    // Invalidate list cache
    await clearCacheByPattern('user:list:*');

    await logActivity({
      author: req.userId,
      action: 'CREATE_USER',
      module: 'USER',
      details: `Admin created user: ${newUser.username}`,
      targetId: newUser._id,
      metadata: { role: newUser.role?.roleName }
    }, req);

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'User created successfully.',
      data: { user: newUser }
    });

  } catch (error) {
    console.log('[UserController] createUser Error:', error);
    if (error.code === 11000) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: 'Duplicate key error: ' + Object.keys(error.keyValue).join(', ') + ' with value ' + JSON.stringify(error.keyValue),
        data: null
      });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to create user.',
      data: null
    });
  }
};

/**
 * Update user information (Self or Admin).
 */
export const updateUser = async (req, res) => {
  try {
    const id = req.userId;
    const { error, value } = updateUserValidator(req.body);

    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.details.map(d => d.message).join(', '),
        data: null
      });
    }

    const result = await userService.updateUser(id, value);
    if (!result.success) {
      const statusCode = result.message === 'User not found.' ? StatusCodes.NOT_FOUND : result.message === 'No fields to update.' ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR;
      return res.status(statusCode).json({
        success: false,
        message: result.message,
        data: null
      });
    }
    if (result.data) {
      await logActivity({
        author: req.userId,
        action: 'UPDATE_USER',
        module: 'USER',
        details: `Updated user info for: ${result.data.username}`,
        targetId: result.data._id,
        metadata: value
      }, req);
    }
    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'User updated successfully.',
      data: { user: result.data }
    });

  } catch (error) {
    console.log('[UserController] updateUser Error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update user.',
      data: null
    });
  }
};

/**
 * Delete a user account (Admin only).
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await userService.deleteUser(id);

    if (!result.success) {
      const statusCode = result.message === 'User not found.' ? StatusCodes.NOT_FOUND : StatusCodes.INTERNAL_SERVER_ERROR;
      return res.status(statusCode).json({
        success: false,
        message: result.message,
        data: null
      });
    }

    await logActivity({
      author: req.userId,
      action: 'DELETE_USER',
      module: 'USER',
      details: `Admin deleted user ID: ${id}`,
      targetId: id
    }, req);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'User deleted successfully.',
      data: null
    });

  } catch (error) {
    console.log('[UserController] deleteUser Error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to delete user.',
      data: null
    });
  }
};

/**
 * Toggle user active status (Admin only).
 */
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body
    if (!isActive || isActive === undefined) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'No active status provided.',
        data: null
      });
    }
    const user = await User.findById(id).populate('role', 'roleName');

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found.',
        data: null
      });
    }
    if (isActive) {
      user.isActive = isActive;
    } else {
      user.isActive = !user.isActive;
    }
    await user.save();

    // Invalidate Redis cache
    await Promise.all([
        delUserAccessInfo(id),
        clearCacheByPattern('user:list:*')
    ]);

    await logActivity({
      author: req.userId,
      action: 'TOGGLE_USER_STATUS',
      module: 'USER',
      details: `Admin ${user.isActive ? 'enabled' : 'disabled'} user: ${user.username}`,
      targetId: user._id,
      metadata: { isActive: user.isActive, role: user.role?.roleName }
    }, req);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `User ${user.isActive ? 'enabled' : 'disabled'} successfully.`,
      data: { user }
    });

  } catch (error) {
    console.log('[UserController] updateUserStatus Error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update user status.',
      data: null
    });
  }
};
