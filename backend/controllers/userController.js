import User from '../models/User.js';
import Role from '../models/Roles.js';
import { StatusCodes } from 'http-status-codes';
import { createUserValidator, updateUserValidator } from '../validations/userValidation.js';
import { logActivity } from '../utils/logger.js';
import * as userService from '../services/userService.js';

/**
 * Get all users with filtering, searching, and pagination.
 */
export const getAllUsers = async (req, res) => {
  try {
    const { role: roleName, isActive, limit = 10, page = 1, search = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

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
    return res.status(StatusCodes.OK).json({ data: result });
  } catch (error) {
    console.error('getAllUsers Error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: { message: 'Failed to retrieve users.' }
    });
  }
};

/**
 * Get a single user by ID.
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    
    if (user.status === 404) {
      return res.status(StatusCodes.NOT_FOUND).json({
        data: { message: user.error }
      });
    }

    return res.status(StatusCodes.OK).json({ data: user });
  } catch (error) {
    console.error('getUserById Error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: { message: 'Failed to retrieve user.' }
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
      return res.status(StatusCodes.BAD_REQUEST).json({
        data: { message: error.details.map(d => d.message).join(', ') }
      });
    }

    const existingUser = await User.findOne({ 
      $or: [{ email: value.email }, { username: value.username }] 
    });
    
    if (existingUser) {
      return res.status(StatusCodes.CONFLICT).json({
        data: { message: 'Username or Email already exists.' }
      });
    }
    
    if (!value.role) {
      const staffRole = await Role.findOne({ roleName: 'staff' });
      value.role = staffRole?._id;
    }else{  
      const role = await Role.findOne({ roleName: value.role });
      value.role = role?._id;
    }
    
    const newUser = await User.create(value);

    await logActivity({
      userId: req.userId,
      action: 'CREATE_USER',
      module: 'USER',
      details: `Admin created user: ${newUser.username}`,
      targetId: newUser._id,
      metadata: { role: newUser.role?.roleName }
    }, req);

    return res.status(StatusCodes.CREATED).json({
      data: { message: 'User created successfully.', user: newUser }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(StatusCodes.CONFLICT).json({
        data: { message: error.message }
      });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: { message: 'Failed to create user.' , error: error.message }
    });
  }
};

/**
 * Update user information (Self or Admin).
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateUserValidator(req.body);
    
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        data: { message: error.details.map(d => d.message).join(', ') }
      });
    }

    const user = await User.findByIdAndUpdate(id, value, { new: true }).populate('role', 'roleName');
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        data: { message: 'User not found.' }
      });
    }

    await logActivity({
      userId: req.userId,
      action: 'UPDATE_USER',
      module: 'USER',
      details: `Updated user info for: ${user.username}`,
      targetId: user._id,
      metadata: value
    }, req);

    return res.status(StatusCodes.OK).json({
      data: { message: 'User updated successfully.', user }
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: { message: 'Failed to update user.' }
    });
  }
};

/**
 * Delete a user account (Admin only).
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id).populate('role', 'roleName');
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        data: { message: 'User not found.' }
      });
    }

    await logActivity({
      userId: req.userId,
      action: 'DELETE_USER',
      module: 'USER',
      details: `Admin deleted user account: ${user.username}`,
      targetId: user._id,
      metadata: { role: user.role?.roleName }
    }, req);

    return res.status(StatusCodes.OK).json({
      data: { message: 'User deleted successfully.', user: user }
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: { message: 'Failed to delete user.' }
    });
  }
};

/**
 * Toggle user active status (Admin only).
 */
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate('role', 'roleName');
    
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        data: { message: 'User not found.' }
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    await logActivity({
      userId: req.userId,
      action: 'TOGGLE_USER_STATUS',
      module: 'USER',
      details: `Admin ${user.isActive ? 'enabled' : 'disabled'} user: ${user.username}`,
      targetId: user._id,
      metadata: { isActive: user.isActive, role: user.role?.roleName }
    }, req);

    return res.status(StatusCodes.OK).json({
      data: { 
        message: `User ${user.isActive ? 'enabled' : 'disabled'} successfully.`, 
        user 
      }
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: { message: 'Failed to toggle user status.' }
    });
  }
};
