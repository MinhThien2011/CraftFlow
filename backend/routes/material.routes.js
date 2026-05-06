import { Router } from 'express';
import {
  getAllMaterials,
  getLowStockMaterials,
  getMaterialByCode,
  getMaterialById,
  createMaterial,
  updateMaterial,
  adjustStock,
  adjustStockByCode,
  getMaterialHistory
} from '../controllers/materialController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const materialRouter = Router();

// --- General Access (Authenticated) ---
materialRouter.use(jwtAuth);

materialRouter.get('/', getAllMaterials);
materialRouter.get('/low-stock', getLowStockMaterials);
materialRouter.get('/code/:code', getMaterialByCode);
materialRouter.get('/history', getMaterialHistory);
materialRouter.get('/:id', getMaterialById);
materialRouter.get('/:id/history', getMaterialHistory);

// --- Admin & Warehouse Manager: Management ---
materialRouter.post('/', rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER]), createMaterial);
materialRouter.patch('/:id', rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER]), updateMaterial);

// --- Admin: Inventory Adjustments ---
materialRouter.post('/adjust-by-code', rolePermission([ROLES.ADMIN]), adjustStockByCode);
materialRouter.post('/:id/adjust-stock', rolePermission([ROLES.ADMIN]), adjustStock);

export default materialRouter;
