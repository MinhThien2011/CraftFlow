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

productExportRouter.use(jwtAuth);

/**
 * @route   GET /api/product-exports
 * @desc    Get all product export requests
 * @access  Admin, Production Manager, Kho Manager
 */
productExportRouter.get('/',rolePermission([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.KHO_MANAGER]),getAllExportRequests);

/**
 * @route   POST /api/product-exports
 * @desc    Create a new product export request
 * @access  Production Manager
 */
productExportRouter.post('/', rolePermission([ROLES.PRODUCTION_MANAGER]), createExportRequest);

/**
 * @route   PATCH /api/product-exports/:id/status
 * @desc    Admin approve or reject request
 * @access  Admin
 */
productExportRouter.patch('/:id/status', rolePermission([ROLES.ADMIN]), updateRequestStatus);

export default productExportRouter;
