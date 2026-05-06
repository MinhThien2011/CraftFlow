import { Router } from 'express';
import * as inventoryController from '../controllers/inventoryController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const inventoryRouter = Router();

// --- Restricted Access (Admin, Warehouse & Production Managers) ---
inventoryRouter.use([
    jwtAuth, 
    rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER])
]);

// Summary & Alerts
inventoryRouter.get('/overview', inventoryController.getOverview);
inventoryRouter.get('/alerts', inventoryController.getLowStockAlerts);

// Detailed Stock Lists
inventoryRouter.get('/materials', inventoryController.getMaterialsStock);
inventoryRouter.get('/products', inventoryController.getProductsStock);

export default inventoryRouter;
