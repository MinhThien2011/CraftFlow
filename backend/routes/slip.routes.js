import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';
import { imageUploader } from '../middleware/cloudinary_uploader.js';
import { 
    createImportExportSlip, 
    getAllSlips, 
    getSlipById, 
    updateSlipStatus, 
    uploadSlipImages, 
    updateSlipByManager 
} from '../controllers/importExportSlipController.js';

const slipRouter = Router();

// --- General Access (Authenticated) ---
slipRouter.use(jwtAuth);

slipRouter.get('/', getAllSlips);
slipRouter.get('/:id', getSlipById);

// --- Operations (Production Manager & Admin) ---
slipRouter.post('/', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]), createImportExportSlip);
slipRouter.patch('/:id/details', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]), updateSlipByManager);

// --- Warehouse Operations (Warehouse Manager & Admin) ---
slipRouter.patch('/:id/status', rolePermission([ROLES.KHO_MANAGER, ROLES.ADMIN]), updateSlipStatus);

// Evidence & Image Upload
slipRouter.post('/:id/upload-images', 
    rolePermission([ROLES.KHO_MANAGER, ROLES.ADMIN]), 
    imageUploader('slips', 'evidenceImages', 5), 
    uploadSlipImages
);

export default slipRouter;
