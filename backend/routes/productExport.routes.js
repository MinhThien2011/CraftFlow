import { Router } from 'express';
import {
    createExportRequest,
    updateRequestStatus,
    getAllExportRequests
} from '../controllers/productExportController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const productExportRouter = Router();

// --- General Access (Authenticated) ---
productExportRouter.use(jwtAuth);

productExportRouter.get('/', 
    rolePermission([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER]), 
    getAllExportRequests
);

// --- Operations (Managers) ---
productExportRouter.post('/', rolePermission([ROLES.PRODUCTION_MANAGER]), createExportRequest);

// --- Approvals (Admin) ---
productExportRouter.patch('/:id/status', rolePermission([ROLES.ADMIN]), updateRequestStatus);

export default productExportRouter;
