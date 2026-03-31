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
materialRouter.use(rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER]));

materialRouter.post('/', createMaterial);
materialRouter.patch('/:id', updateMaterial);
materialRouter.post('/adjust-by-code', adjustStockByCode);
materialRouter.post('/:id/adjust-stock', adjustStock);


export default materialRouter;
