import { Router } from 'express';
import * as shelfController from '../controllers/shelfController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const shelfRouter = Router();

// --- General Access (Authenticated) ---
shelfRouter.use(jwtAuth);

// Viewing Shelves
shelfRouter.get('/', 
    rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER]), 
    shelfController.getAllShelves
);

shelfRouter.get('/:id', 
    rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER]), 
    shelfController.getShelfById
);

shelfRouter.get('/recommendations/:itemId',
    rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER]),
    shelfController.getShelfRecommendations
);

// --- Management (Warehouse Manager Only) ---
shelfRouter.post('/', rolePermission([ROLES.KHO_MANAGER]), shelfController.createShelf);
shelfRouter.put('/:id', rolePermission([ROLES.KHO_MANAGER]), shelfController.updateShelf);
shelfRouter.delete('/:id', rolePermission([ROLES.KHO_MANAGER]), shelfController.deleteShelf);

export default shelfRouter;
