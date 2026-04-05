import { Router } from 'express';
import * as inventoryController from '../controllers/inventoryController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const inventoryRouter = Router();

// --- Private Routes (Admin & Kho Manager only) ---
inventoryRouter.use([jwtAuth, rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER])]);

// GET /api/inventory/overview - Summary stats
inventoryRouter.get('/overview', inventoryController.getOverview);

// GET /api/inventory/materials - Material stock list with search/pagination
inventoryRouter.get('/materials', inventoryController.getMaterialsStock);

// GET /api/inventory/products - Product stock list with search/pagination
inventoryRouter.get('/products', inventoryController.getProductsStock);

export default inventoryRouter;
