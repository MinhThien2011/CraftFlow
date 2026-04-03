import { Router } from 'express';
import * as productionOrderController from '../controllers/productionOrderController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const productionRouter = Router();

productionRouter.use([jwtAuth, rolePermission([ROLES.ADMIN])]);

productionRouter.post('/', productionOrderController.createOrder);
productionRouter.get('/suggestions', productionOrderController.getSuggestions);
productionRouter.post('/assign', productionOrderController.assignOrder);
productionRouter.post('/reassign', productionOrderController.reassignTask);
productionRouter.patch('/assignments/:id/status', productionOrderController.updateAssignmentStatus);
productionRouter.patch('/:id/check-materials', productionOrderController.checkMaterials);

export default productionRouter;
