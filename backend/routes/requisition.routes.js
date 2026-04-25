import { Router } from 'express';
import * as requisitionController from '../controllers/requisitionController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const requisitionRouter = Router();

requisitionRouter.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the Requisition API of Crafb Flow",
  })
})
// --- Private Routes (Logged in users) ---
requisitionRouter.use(jwtAuth);

// Common routes
requisitionRouter.get('/', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER , ROLES.ADMIN]), requisitionController.getRequisitions);
requisitionRouter.get('/:id', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER , ROLES.ADMIN]), requisitionController.getRequisitionById);

// Production Manager requests materials for production orders
requisitionRouter.post('/', rolePermission([ROLES.PRODUCTION_MANAGER]), requisitionController.requestMaterials);

// Warehouse Manager updates requisition status (accept, prepare, complete, cancel)
requisitionRouter.patch('/:id/status', rolePermission([ROLES.KHO_MANAGER]), requisitionController.updateRequisitionStatus);

export default requisitionRouter;
