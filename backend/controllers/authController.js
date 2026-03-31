import User from '../models/User.js';
import { handlerPasswordValidator } from '../validations/authValidation.js';
import { loginValidator } from '../validations/authValidation.js';
import * as userService from '../services/userService.js';
import { StatusCodes } from 'http-status-codes';
import { generateAccessToken } from '../middleware/cookies.js';
import { logActivity } from '../utils/logger.js';



export const login = async (req, res) => {
  try {
    const { error, value } = loginValidator(req.body);

    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        data: {
          message: error.details.map(detail => detail.message).join(', '),
        },
      });
    }

    const { identifier, password } = value;

    const user = await User.findOne({
      $or: [
        { username: identifier.trim() },
        { email: identifier.trim() },
      ],
    }).populate('role', 'roleName');

    if (!user) {
      // await logActivity({
      //   action: 'LOGIN_FAILED',
      //   module: 'AUTH',
      //   details: `Failed login attempt for identifier: ${identifier}`,
      //   metadata: { identifier }
      // }, req);

      return res.status(StatusCodes.UNAUTHORIZED).json({
        data: {
          message: 'Username or password is incorrect.',
        },
      });
    }

    if (!user.isActive) {
      await logActivity({
        author: user._id,
        action: 'LOGIN_BANNED',
        module: 'AUTH',
        details: `Banned user attempted to login: ${user.username}`
      }, req);

      return res.status(StatusCodes.FORBIDDEN).json({
        data: {
          message: 'User account has been banned. Please contact admin to activate it.',
        },
      });
    }

    const isPasswordValid = User.comparePassword(password, user.password);

    if (!isPasswordValid) {
      await logActivity({
        author: user._id,
        action: 'LOGIN_FAILED',
        module: 'AUTH',
        details: `Incorrect password for user: ${user.username}`
      }, req);

      return res.status(StatusCodes.UNAUTHORIZED).json({
        data: {
          message: 'Incorrect username or password.',
        },
      });
    }

    const accessToken = generateAccessToken(user._id, res);
    
    await logActivity({
      author: user._id,
      action: 'LOGIN_SUCCESS',
      module: 'AUTH',
      details: `User logged in: ${user.username}`
    }, req);

    const userPayload = {
      _id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role?.roleName ?? null,
      isActive: user.isActive,
    };

    return res.status(StatusCodes.OK).json({
      data: {
        message: 'Login successful.',
        userPayload,
        accessToken,
      },
    });
  } catch (error) {
    console.error('[AuthController] login error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: {
        message: 'Error in server. Please try again later.',
      },
    });
  }
};

export const refreshPassword = async (req, res) => {
  try {
    const { error, value } = handlerPasswordValidator(req.body, 'refresh');

    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        data: {
        message: error.details.map(detail => detail.message).join(', '),
       },
      });
    }
    const newPassword = value.newPassword;
    const user = await User.findOne({ $or: [{ username: value.identifier.trim() }, { email: value.identifier.trim() }] }).select('-password');
    if (!user || !user.isActive) {
      return res.status(StatusCodes.NOT_FOUND).json({
       data: {
        message: 'User not found.',
       },
      });
    }
    user.password = newPassword;
    await user.save();

    await logActivity({
      author: user._id,
      action: 'PASSWORD_REFRESHED',
      module: 'AUTH',
      details: `Password refreshed for user: ${user.username}`
    }, req);

    return res.status(StatusCodes.OK).json({
      data: {
        message: 'Password refreshed successfully.',
        user : user,
      },
    });
  } catch (error) {
    console.error('[AuthController] refreshPassword error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: {
        message: 'Error in server. Please try again later.',
      },
    });
  }
}

export const changePassword = async (req, res) =>{
try {
    const { error, value } = handlerPasswordValidator(req.body, 'change');

    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        data: {
        message: error.details.map(detail => detail.message).join(', '),
       },
      });
    }
    const newPassword = value.newPassword;
    const user = await User.findOne({ _id: req.userId }).select('-password');
    if (!user || !user.isActive) {
      return res.status(StatusCodes.NOT_FOUND).json({
       data: {
        message: 'User not found.',
       },
      });
    }
    user.password = newPassword;
    await user.save();

    await logActivity({
      author: user._id,
      action: 'PASSWORD_CHANGED',
      module: 'AUTH',
      details: `User changed their own password: ${user.username}`
    }, req);

    return res.status(StatusCodes.OK).json({
      data: {
        message: 'Password changed successfully.',
        user : user,
      },
    });
  } catch (error) {
    console.error('[AuthController] changePassword error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: {
        message: 'Error in server. Please try again later.',
      },
    });
  }
}
/**
 * POST /api/auth/logout
 * Xoá refresh token cookie.
 */
export const logout = async (req, res) => {
  const accessToken = req.cookies?.accessToken;
  if (!accessToken) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      data: {
        message: 'Unauthorized',
      },
    });
  }
  try {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    await logActivity({
      author: req.userId,
      action: 'LOGOUT',
      module: 'AUTH',
      details: 'User logged out'
    }, req);

    return res.status(StatusCodes.OK).json({
      data: {
        message: 'Logout successful.',
      },
    });
  } catch (error) {
    console.error('[AuthController] logout error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: {
        message: 'Error in server. Please try again later.',
      },
    });
  }
};

/**
 * GET /api/auth/me
 * Lấy thông tin user đang đăng nhập
 */
export const getUserInfo = async (req, res) => {
  try {
    console.log(req.userId);
    const user = await User.findById(req.userId).populate('role', 'roleName');

    if (!user || !user.isActive) {
      return res.status(StatusCodes.NOT_FOUND).json({
       data: {
        message: 'User not found.',
       },
      });
    }

    return res.status(StatusCodes.OK).json({
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        address: user.address,
        role: user.role?.roleName ?? null,
        maxDailyCapacity: user.maxDailyCapacity,
        currentAssignedQuantity: user.currentAssignedQuantity,
        hasWarningFlag: user.hasWarningFlag,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('[AuthController] getMe error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      data: {
        message: 'Error in server. Please try again later.',
      },
    });
  }
};