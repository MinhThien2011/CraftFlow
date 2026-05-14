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
  suggestAssignments,
  getMaterialAlerts,
  reassignTask,
  updateAssignmentStatus,
  updateOrderStatus,
  updateOrder,
  cancelOrder
} from '../controllers/productionOrderController.js';

const productionRouter = Router();

// --- General Access (Authenticated) ---
productionRouter.use(jwtAuth);

// Planning & Lists
productionRouter.get('/material-alerts', rolePermission([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER]), getMaterialAlerts);
productionRouter.get('/suggestions', rolePermission([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER]), getSuggestions);
productionRouter.get('/:id/suggest', rolePermission([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER]), suggestAssignments);
productionRouter.get('/', rolePermission([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.STAFF]), getListProductionOrder);
productionRouter.get('/:id', rolePermission([ROLES.ADMIN, ROLES.STAFF, ROLES.PRODUCTION_MANAGER]), getProductionOrderById);
productionRouter.get('/:id/bom', rolePermission([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.STAFF, ROLES.KHO_MANAGER]), getBom);

// Order Management (Production Manager)
productionRouter.post('/', rolePermission([ROLES.PRODUCTION_MANAGER]), createOrder);
productionRouter.put('/:id', rolePermission([ROLES.PRODUCTION_MANAGER]), updateOrder);
productionRouter.delete('/:id', rolePermission([ROLES.PRODUCTION_MANAGER]), cancelOrder);
productionRouter.post('/assign', rolePermission([ROLES.PRODUCTION_MANAGER]), assignOrder);
productionRouter.post('/reassign', rolePermission([ROLES.PRODUCTION_MANAGER]), reassignTask);
productionRouter.post('/:id/stock-in', rolePermission([ROLES.PRODUCTION_MANAGER]), createStockInSlip);

// Status Updates
productionRouter.patch('/:id/status', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]), updateOrderStatus);
productionRouter.patch('/:id/check-materials', rolePermission([ROLES.PRODUCTION_MANAGER]), checkMaterials);
productionRouter.patch('/assignments/:id/status', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.STAFF, ROLES.ADMIN]), updateAssignmentStatus);

export default productionRouter;
