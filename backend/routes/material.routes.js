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

materialRouter.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the Material API of Crafb Flow",
  })
})

// --- Private Routes (Logged in users) ---
materialRouter.use(jwtAuth);

// All roles can view materials and low stock alerts
materialRouter.get('/', getAllMaterials);
materialRouter.get('/low-stock', getLowStockMaterials);
materialRouter.get('/code/:code', getMaterialByCode);
materialRouter.get('/history', getMaterialHistory);
materialRouter.get('/:id/history', getMaterialHistory);
materialRouter.get('/:id', getMaterialById);

// --- Admin & Kho Manager Routes ---
// Note: Manual adjustments are discouraged. Use Shrinkage or Requisitions for tracking.
materialRouter.post('/', rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER]), createMaterial);
materialRouter.patch('/:id', rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER]), updateMaterial);

// --- Admin Routes ---
materialRouter.post('/adjust-by-code', rolePermission([ROLES.ADMIN]), adjustStockByCode);
materialRouter.post('/:id/adjust-stock', rolePermission([ROLES.ADMIN]), adjustStock);


export default materialRouter;
