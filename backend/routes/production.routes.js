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
  updateAssignmentStatus
} from '../controllers/productionOrderController.js';
import { validate } from '../middleware/paramsValidator.js';
import { commonParamsSchema } from '../validations/paramsValidator.js';

const productionRouter = Router();

productionRouter.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the Production API of Crafb Flow",
  })
})

productionRouter.use(jwtAuth);

// Both Admin and Production Manager can view suggestions
productionRouter.get('/suggestions', rolePermission([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER]), getSuggestions);

// Production Order List (Admin/PM see all, Staff see their own)
productionRouter.get('/', rolePermission([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.STAFF]), getListProductionOrder);

// Only Production Manager can create and manage production orders
productionRouter.post('/', rolePermission([ROLES.PRODUCTION_MANAGER]), createOrder);
productionRouter.post('/assign', rolePermission([ROLES.PRODUCTION_MANAGER]), assignOrder);
productionRouter.post('/reassign', rolePermission([ROLES.PRODUCTION_MANAGER]), reassignTask);
productionRouter.patch('/assignments/:id/status', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.STAFF]), updateAssignmentStatus);
productionRouter.patch('/:id/check-materials', rolePermission([ROLES.PRODUCTION_MANAGER]), checkMaterials);
productionRouter.get('/:id/bom', rolePermission([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.STAFF, ROLES.KHO_MANAGER]), getBom);
productionRouter.post('/:id/stock-in', rolePermission([ROLES.PRODUCTION_MANAGER]), createStockInSlip);

// Detail view
productionRouter.get('/:id', rolePermission([ROLES.ADMIN, ROLES.STAFF, ROLES.PRODUCTION_MANAGER]), getProductionOrderById);

export default productionRouter;
