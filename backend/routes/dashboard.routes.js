import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const dashboardRouter = Router();

// Only Admin, Kho Manager and Production Manager can access the dashboard statistics
dashboardRouter.get(
  '/stats',
  jwtAuth,
  rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER]),
  dashboardController.getDashboardStats
);

export default dashboardRouter;
