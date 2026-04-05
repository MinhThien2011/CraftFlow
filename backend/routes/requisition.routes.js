import { Router } from 'express';
import * as requisitionController from '../controllers/requisitionController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const requisitionRouter = Router();
requisitionRouter.use([jwtAuth, rolePermission([ROLES.STAFF])]);

requisitionRouter.post('/', requisitionController.requestMaterials);
requisitionRouter.patch('/:id/status', requisitionController.updateStatus);

export default requisitionRouter;
