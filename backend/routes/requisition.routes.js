import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';
import {
    getRequisitions,
    getRequisitionById,
    updateRequisitionStatus,
    updateRequisitionDetails,
    requestMaterials,
    requestSupplementaryMaterials,
    requestReturnMaterials,
    approveReturnRequisition
} from '../controllers/requisitionController.js';

const requisitionRouter = Router();

// --- General Access (Authenticated) ---
requisitionRouter.use(jwtAuth);

// Viewing Requisitions
requisitionRouter.get('/',
    rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER, ROLES.ADMIN]),
    getRequisitions
);

requisitionRouter.get('/:id',
    rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER, ROLES.ADMIN]),
    getRequisitionById
);

// --- Operations (Managers) ---
requisitionRouter.post('/', rolePermission([ROLES.PRODUCTION_MANAGER]), requestMaterials);
requisitionRouter.post('/supplementary', rolePermission([ROLES.PRODUCTION_MANAGER]), requestSupplementaryMaterials);
requisitionRouter.post('/return', rolePermission([ROLES.PRODUCTION_MANAGER]), requestReturnMaterials);

requisitionRouter.patch('/:id/details',
    rolePermission([ROLES.PRODUCTION_MANAGER]),
    updateRequisitionDetails
);

// --- Approvals & Status (Warehouse Manager) ---
requisitionRouter.post('/:id/approve-return',
    rolePermission([ROLES.KHO_MANAGER]),
    approveReturnRequisition
);

requisitionRouter.patch('/:id/status',
    rolePermission([ROLES.KHO_MANAGER]),
    updateRequisitionStatus
);

export default requisitionRouter;
