import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateAccessToken = (userId , res) =>{
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000  
  });
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { identifier: string (username or email), password: string }
 *
 * Account được tạo bởi admin, không có self-register.
 */
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // 1. Validate input
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username/email and password.',
      });
    }

    // 2. Tìm user theo username hoặc email
    const user = await User.findOne({
      $or: [
        { username: identifier.trim() },
        { email: identifier.trim() },
      ],
    })
      .populate('role', 'roleName');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Username or password is incorrect.',
      });
    }

    // 3. Check account status before login
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account has been deactivated. Please contact admin.',
      });
    }

    // 4. Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect username or password.',
      });
    }

    // 5. Generate tokens
    const accessToken  = generateAccessToken(user._id, res);

    // 6. Send refresh token via HttpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    // 7. Return user info (excluding password)
    const userPayload = {
      _id:      user._id,
      username: user.username,
      email:    user.email,
      fullName: user.fullName,
      phone:    user.phone,
      role:     user.role?.roleName ?? null,
      isActive: user.isActive,
    };

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: userPayload,
        accessToken,
      },
    });
  } catch (error) {
    console.error('[AuthController] login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error in server. Please try again later.',
    });
  }
};


/**
 * POST /api/auth/logout
 * Xoá refresh token cookie.
 */
export const logout = async (req, res) => {
  try {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({
      success: true,
      message: 'Logout successful.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error in server. Please try again later.',
      error: error.message,
    });
  }
};

/**
 * GET /api/auth/me
 * Lấy thông tin user đang đăng nhập (yêu cầu middleware xác thực trước).
 */
export const getUserInfo = async (req, res) => {
  try {
    // req.user được gán bởi auth middleware
    const user = await User.findById(req.userId).populate('role', 'roleName');

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id:                    user._id,
        username:               user.username,
        email:                  user.email,
        fullName:               user.fullName,
        phone:                  user.phone,
        address:                user.address,
        role:                   user.role?.roleName ?? null,
        maxDailyCapacity:       user.maxDailyCapacity,
        currentAssignedQuantity:user.currentAssignedQuantity,
        hasWarningFlag:         user.hasWarningFlag,
        isActive:               user.isActive,
      },
    });
  } catch (error) {
    console.error('[AuthController] getMe error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error in server. Please try again later.',
    });
  }
};