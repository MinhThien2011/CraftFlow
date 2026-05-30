import { Router } from 'express';
import {
    createShrinkageReport,
    updateShrinkageStatus,
    getAllShrinkageReports,
    createShrinkageReturnRequest,
    getShrinkageSummary
} from '../controllers/shrinkageController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const shrinkageRouter = Router();

// --- General Access (Authenticated) ---
shrinkageRouter.use(jwtAuth);

shrinkageRouter.get('/', 
    rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER]), 
    getAllShrinkageReports
);
shrinkageRouter.get('/summary',
    rolePermission([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER]),
    getShrinkageSummary
);

// --- Operations (Production Manager) ---
shrinkageRouter.post('/', 
    rolePermission([ROLES.PRODUCTION_MANAGER]), 
    createShrinkageReport
);
shrinkageRouter.post('/:id/return-request',
    rolePermission([ROLES.PRODUCTION_MANAGER]),
    createShrinkageReturnRequest
);

// --- Approvals (Admin) ---
shrinkageRouter.patch('/:id/status', 
    rolePermission([ROLES.ADMIN]), 
    updateShrinkageStatus
);

export default shrinkageRouter;
