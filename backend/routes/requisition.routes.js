import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';
import { getRequisitions, getRequisitionById, updateRequisitionStatus, updateRequisitionDetails, requestMaterials, approveRequisition } from '../controllers/requisitionController.js';

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
requisitionRouter.get('/', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.PRODUCT_MANAGER, ROLES.KHO_MANAGER, ROLES.ADMIN]), getRequisitions);
requisitionRouter.get('/:id', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.PRODUCT_MANAGER, ROLES.KHO_MANAGER, ROLES.ADMIN]), getRequisitionById);

// Manager requests materials
requisitionRouter.post('/', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.PRODUCT_MANAGER]), requestMaterials);

// Admin approves requisition
requisitionRouter.post('/:id/approve', rolePermission([ROLES.ADMIN]), approveRequisition);

// Manager updates requisition details (notes)
requisitionRouter.patch('/:id/details', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.PRODUCT_MANAGER]), updateRequisitionDetails);

// Warehouse Manager updates requisition status (accept, prepare, complete, cancel)
requisitionRouter.patch('/:id/status', rolePermission([ROLES.KHO_MANAGER]), updateRequisitionStatus);

export default requisitionRouter;
