import User from '../models/User.js';
import { handlerPasswordValidator } from '../validations/authValidation.js';
import { loginValidator } from '../validations/authValidation.js';
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

    const isPasswordValid = await User.comparePassword(password, user.password);

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

    const userPayload = {
      _id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role?.roleName ?? null,
      isActive: user.isActive,
    };

    await logActivity({
      author: user._id,
      action: 'LOGIN_SUCCESS',
      module: 'AUTH',
      details: `User logged in: ${user.username}`
    }, req);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: userPayload,
        accessToken,
      },
    });

  } catch (error) {
    console.log('[AuthController] login error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error in server. Please try again later.',
      data: null
    });
  }
};

export const refreshPassword = async (req, res) => {
  return res.status(StatusCodes.GONE).json({
    success: false,
    message: 'Password reset is not available from this endpoint. Please use the authenticated change-password flow.',
    data: null
  });
}

export const changePassword = async (req, res) => {
  try {
    const { error, value } = handlerPasswordValidator(req.body, 'change');

    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.details.map(detail => detail.message).join(', '),
        data: null
      });
    }
    const { currentPassword, newPassword } = value;
    const user = await User.findById(req.userId);
    if (!user || !user.isActive) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found.',
        data: null
      });
    }

    const isCurrentPasswordValid = await User.comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Current password is incorrect.',
        data: null
      });
    }

    user.password = newPassword;
    await user.save();
    await logActivity({
      author: user._id,
      action: 'PASSWORD_CHANGED',
      module: 'AUTH',
      details: `User changed their own password: ${user.username}`
    }, req, true);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Password changed successfully.',
      data: { user },
    });
  } catch (error) {
    console.log('[AuthController] changePassword error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error in server. Please try again later.',
      data: null
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
      success: false,
      message: 'Unauthorized',
      data: null
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
      details: `User logged out: ${req.userId} at ${new Date().toLocaleString()}`,
    }, req, true);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Logout successful.',
      data: null
    });
  } catch (error) {
    console.log('[AuthController] logout error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error in server. Please try again later.',
      data: null
    });
  }
};

/**
 * GET /api/auth/me
 * Lấy thông tin user đang đăng nhập
 */
export const getUserInfo = async (req, res) => {
  try {
    console.log("User Get Info:", req.userId);
    const user = await User.findById(req.userId).populate('role', 'roleName');

    if (!user || !user.isActive) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found.',
        data: null
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'User info retrieved successfully.',
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          address: user.address,
          birthDate: user.birthDate?.toLocaleString(),
          avatar: user.avatar,
          role: user.role?.roleName ?? null,
          maxDailyCapacity: user.maxDailyCapacity,
          currentAssignedQuantity: user.currentAssignedQuantity,
          hasWarningFlag: user.hasWarningFlag,
          isActive: user.isActive,
          createdAt: user.createdAt?.toLocaleString(),
          updatedAt: user.updatedAt?.toLocaleString(),
        },
      },
    });
  } catch (error) {
    console.log('[AuthController] getMe error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error in server. Please try again later.',
      data: null
    });
  }
};
