import { Router } from 'express';
import * as requisitionController from '../controllers/requisitionController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const requisitionRouter = Router();
requisitionRouter.use(jwtAuth);

// Staff requests materials
requisitionRouter.post('/', rolePermission([ROLES.STAFF]), requisitionController.requestMaterials);

// Warehouse Manager updates requisition status (accept, prepare, complete, cancel)
requisitionRouter.patch('/:id/status', rolePermission([ROLES.KHO_MANAGER]), requisitionController.updateStatus);

export default requisitionRouter;
