import { Router } from 'express';
import * as shelfController from '../controllers/shelfController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const shelfRouter = Router();

shelfRouter.use(jwtAuth);

// All roles (Admin, Kho Manager, Production Manager) can view shelves
shelfRouter.get('/', rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER]), shelfController.getAllShelves);
shelfRouter.get('/:id', rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER]), shelfController.getShelfById);

// Only Kho Manager can create, update, or delete shelves
shelfRouter.post('/', rolePermission([ROLES.KHO_MANAGER]), shelfController.createShelf);
shelfRouter.put('/:id', rolePermission([ROLES.KHO_MANAGER]), shelfController.updateShelf);
shelfRouter.delete('/:id', rolePermission([ROLES.KHO_MANAGER]), shelfController.deleteShelf);

export default shelfRouter;
