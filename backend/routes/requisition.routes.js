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
  approveRequisition,
  requestSupplementaryMaterials,
  requestReturnMaterials,
  approveReturnRequisition
} from '../controllers/requisitionController.js';

const requisitionRouter = Router();

// --- General Access (Authenticated) ---
requisitionRouter.use(jwtAuth);

// Viewing Requisitions
requisitionRouter.get('/', 
    rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.PRODUCT_MANAGER, ROLES.KHO_MANAGER, ROLES.ADMIN]), 
    getRequisitions
);

requisitionRouter.get('/:id', 
    rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.PRODUCT_MANAGER, ROLES.KHO_MANAGER, ROLES.ADMIN]), 
    getRequisitionById
);

// --- Operations (Managers) ---
requisitionRouter.post('/', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.PRODUCT_MANAGER]), requestMaterials);
requisitionRouter.post('/supplementary', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.PRODUCT_MANAGER]), requestSupplementaryMaterials);
requisitionRouter.post('/return', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.PRODUCT_MANAGER]), requestReturnMaterials);

requisitionRouter.patch('/:id/details', 
    rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.PRODUCT_MANAGER]), 
    updateRequisitionDetails
);

// --- Approvals & Status (Admin & Warehouse Manager) ---
requisitionRouter.post('/:id/approve', rolePermission([ROLES.ADMIN]), approveRequisition);

requisitionRouter.post('/:id/approve-return', 
    rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER]), 
    approveReturnRequisition
);

requisitionRouter.patch('/:id/status', 
    rolePermission([ROLES.KHO_MANAGER, ROLES.ADMIN]), 
    updateRequisitionStatus
);

export default requisitionRouter;
