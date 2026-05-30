import { StatusCodes } from 'http-status-codes';
import User from '../models/User.js';
import { getUserAccessInfo, setUserAccessInfo } from '../utils/redisFetching.js';

/**
 * Middleware to authorize based on user roles and status with Redis caching.
 * @param {Array} allowedRoles - Roles allowed to access the route.
 */
export function rolePermission(allowedRoles) {
  return async (req, res, next) => {
    try {
      const userId = req.userId;

      // 1. Check Redis cache first
      let accessInfo = await getUserAccessInfo(userId);

      if (!accessInfo) {
        // 2. If not in cache, query MongoDB
        const user = await User.findById(userId)
          .select('isActive')
          .populate('role', 'roleName')
          .lean();

        if (!user) {
          return res.status(StatusCodes.UNAUTHORIZED).json({
            success: false,
            message: 'Access denied. User not found.'
          });
        }

        accessInfo = {
          roleName: user.role?.roleName,
          isActive: user.isActive
        };

        // 3. Cache the result in Redis
        if (accessInfo.roleName) {
          await setUserAccessInfo(userId, accessInfo);
        }
      }

      // 4. Check if user is active
      if (accessInfo.isActive === false) {
        return res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: 'Access denied. Account is inactive.'
        });
      }

      // 5. Check permissions
      if (!allowedRoles.includes(accessInfo.roleName)) {
        return res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

      req.userRole = accessInfo.roleName;
      next();
    } catch (error) {
      console.error('[rolePermission] Error:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error in authorization.'
      });
    }
  };
}
