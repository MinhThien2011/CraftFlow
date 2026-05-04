import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';
import { imageUploader } from '../middleware/cloudinary_uploader.js';
import { createImportExportSlip, getAllSlips, getSlipById, updateSlipStatus, uploadSlipImages, updateSlipByManager } from '../controllers/importExportSlipController.js';

const slipRouter = Router();

slipRouter.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the Import Export Slip API of Crafb Flow",
  })
})

// --- Private Routes ---
slipRouter.use(jwtAuth);

// Production Manager or Admin can create initial request (PENDING)
slipRouter.post('/', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]), createImportExportSlip);

// Production Manager or Admin can update details (NOT status, NOT items)
slipRouter.patch('/:id/details', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]), updateSlipByManager);

// Everyone can view
slipRouter.get('/', getAllSlips);
slipRouter.get('/:id', getSlipById);

// Warehouse Manager or Admin can update status (RECEIVED, INSPECTED, IN_STOCK, COMPLETED)
slipRouter.patch('/:id/status', rolePermission([ROLES.KHO_MANAGER, ROLES.ADMIN]), updateSlipStatus);

// Upload signed slip images (Multiple images support)
slipRouter.post('/:id/upload-images', rolePermission([ROLES.KHO_MANAGER, ROLES.ADMIN]), imageUploader('slips', 'evidenceImages', 5), uploadSlipImages
);

export default slipRouter;
