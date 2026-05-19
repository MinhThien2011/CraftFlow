import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const dashboardRouter = Router();

// --- General Access (Authenticated) ---
dashboardRouter.use(jwtAuth);

// Dashboard Statistics (Managers Only)
dashboardRouter.get('/', 
    rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER]), 
    dashboardController.getDashboardStats
);
// Dashboard Statistics (Warehouse Manager)
dashboardRouter.get('/warehouse', 
    rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER]), 
    dashboardController.getWarehouseDashboardStats
);
// Dashboard Statistics (Production Manager)
dashboardRouter.get('/production-manager',
    rolePermission([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER]),
    dashboardController.getProductionManagerDashboardStats
);

export default dashboardRouter;
