import { Router } from 'express';
import * as productionOrderController from '../controllers/productionOrderController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const productionRouter = Router();

productionRouter.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the Production API of Crafb Flow",
  })
})

productionRouter.use(jwtAuth);

// Both Admin and Production Manager can view suggestions
productionRouter.get('/suggestions', rolePermission([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER]), productionOrderController.getSuggestions);

// Only Production Manager can create and manage production orders
productionRouter.post('/', rolePermission([ROLES.PRODUCTION_MANAGER]), productionOrderController.createOrder);
productionRouter.post('/assign', rolePermission([ROLES.PRODUCTION_MANAGER]), productionOrderController.assignOrder);
productionRouter.post('/reassign', rolePermission([ROLES.PRODUCTION_MANAGER]), productionOrderController.reassignTask);
productionRouter.patch('/assignments/:id/status', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.STAFF]), productionOrderController.updateAssignmentStatus);
productionRouter.patch('/:id/check-materials', rolePermission([ROLES.PRODUCTION_MANAGER]), productionOrderController.checkMaterials);
productionRouter.post('/:id/stock-in', rolePermission([ROLES.PRODUCTION_MANAGER]), productionOrderController.createStockInSlip);

export default productionRouter;
