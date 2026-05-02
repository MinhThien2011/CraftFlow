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

// Apply authentication to all shrinkage routes
shrinkageRouter.use(jwtAuth);

/**
 * @route   GET /api/shrinkage
 * @desc    Get all shrinkage reports (Filtered)
 * @access  Admin, Kho Manager
 */
shrinkageRouter.get('/', 
    rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER]), 
    getAllShrinkageReports
);

/**
 * @route   POST /api/shrinkage
 * @desc    Create a new shrinkage report
 * @access  Kho Manager
 */
shrinkageRouter.post('/', 
    rolePermission([ROLES.KHO_MANAGER]), 
    createShrinkageReport
);

/**
 * @route   PATCH /api/shrinkage/:id/status
 * @desc    Update shrinkage report status (Approve/Reject)
 * @access  Admin
 */
shrinkageRouter.patch('/:id/status', 
    rolePermission([ROLES.ADMIN]), 
    updateShrinkageStatus
);

export default shrinkageRouter;
