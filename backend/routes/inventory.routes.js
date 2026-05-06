import { Router } from 'express';
import * as inventoryController from '../controllers/inventoryController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const inventoryRouter = Router();

inventoryRouter.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the Inventory API of Crafb Flow",
  })
})

// --- Private Routes (Admin & Kho Manager only) ---
inventoryRouter.use([jwtAuth, rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER])]);

// GET /api/inventory/overview - Summary stats
inventoryRouter.get('/overview', inventoryController.getOverview);

// GET /api/inventory/alerts - Unified low stock alerts
inventoryRouter.get('/alerts', inventoryController.getLowStockAlerts);

// GET /api/inventory/materials - Material stock list with search/pagination
inventoryRouter.get('/materials', inventoryController.getMaterialsStock);

// GET /api/inventory/products - Product stock list with search/pagination
inventoryRouter.get('/products', inventoryController.getProductsStock);

export default inventoryRouter;
