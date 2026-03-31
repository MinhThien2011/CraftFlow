import { StatusCodes } from 'http-status-codes';
import User from '../models/User.js';

/**
 * Middleware to authorize based on user roles.
 * @param {Array} allowedRoles - Roles allowed to access the route.
 */
export function rolePermission(allowedRoles) {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.userId).populate('role', 'roleName');

      if (!user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          data: { message: 'Access denied Unauthorized.' }
        });
      }

      const userRole = user.role?.roleName;

      if (!allowedRoles.includes(userRole)) {
        return res.status(StatusCodes.FORBIDDEN).json({
          data: { message: 'Access denied. Insufficient permissions.' }
        });
      }

      next();
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        data: { message: 'Error in authorization' }
      });
    }
  };
}
