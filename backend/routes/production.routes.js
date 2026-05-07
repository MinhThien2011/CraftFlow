import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';
import {
  assignOrder,
  checkMaterials,
  createOrder,
  createStockInSlip,
  getBom,
  getListProductionOrder,
  getProductionOrderById,
  getSuggestions,
  reassignTask,
  updateAssignmentStatus,
  updateOrderStatus
} from '../controllers/productionOrderController.js';

const productionRouter = Router();

// --- General Access (Authenticated) ---
productionRouter.use(jwtAuth);

// Planning & Lists
productionRouter.get('/suggestions', rolePermission([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER]), getSuggestions);
productionRouter.get('/', rolePermission([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.STAFF]), getListProductionOrder);
productionRouter.get('/:id', rolePermission([ROLES.ADMIN, ROLES.STAFF, ROLES.PRODUCTION_MANAGER]), getProductionOrderById);
productionRouter.get('/:id/bom', rolePermission([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.STAFF, ROLES.KHO_MANAGER]), getBom);

// Order Management (Production Manager)
productionRouter.post('/', rolePermission([ROLES.PRODUCTION_MANAGER]), createOrder);
productionRouter.post('/assign', rolePermission([ROLES.PRODUCTION_MANAGER]), assignOrder);
productionRouter.post('/reassign', rolePermission([ROLES.PRODUCTION_MANAGER]), reassignTask);
productionRouter.post('/:id/stock-in', rolePermission([ROLES.PRODUCTION_MANAGER]), createStockInSlip);

// Status Updates
productionRouter.patch('/:id/status', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]), updateOrderStatus);
productionRouter.patch('/:id/check-materials', rolePermission([ROLES.PRODUCTION_MANAGER]), checkMaterials);
productionRouter.patch('/assignments/:id/status', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.STAFF, ROLES.ADMIN]), updateAssignmentStatus);

export default productionRouter;
