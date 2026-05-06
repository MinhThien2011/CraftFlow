import { Router } from 'express';
import {
    createShrinkageReport,
    updateShrinkageStatus,
    getAllShrinkageReports
} from '../controllers/shrinkageController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const shrinkageRouter = Router();

// --- General Access (Authenticated) ---
shrinkageRouter.use(jwtAuth);

shrinkageRouter.get('/', 
    rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER]), 
    getAllShrinkageReports
);

// --- Operations (Warehouse Manager) ---
shrinkageRouter.post('/', 
    rolePermission([ROLES.KHO_MANAGER]), 
    createShrinkageReport
);

// --- Approvals (Admin) ---
shrinkageRouter.patch('/:id/status', 
    rolePermission([ROLES.ADMIN]), 
    updateShrinkageStatus
);

export default shrinkageRouter;
