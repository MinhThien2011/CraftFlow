import { Router } from 'express';
import * as importExportSlipController from '../controllers/importExportSlipController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';
import { imageUploader } from '../middleware/cloudinary_uploader.js';

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
slipRouter.post('/', rolePermission(ROLES.PRODUCTION_MANAGER), importExportSlipController.createImportExportSlip);

// Everyone can view
slipRouter.get('/', importExportSlipController.getAllSlips);
slipRouter.get('/:id', importExportSlipController.getSlipById);

// Warehouse Manager or Admin can update status (RECEIVED, INSPECTED, IN_STOCK)
slipRouter.patch('/:id/status', rolePermission([ROLES.KHO_MANAGER]), importExportSlipController.updateSlipStatus);

// Upload signed slip images (Multiple images support)
slipRouter.post('/:id/upload-images', 
  rolePermission([ROLES.KHO_MANAGER]), 
  imageUploader('slips', 'evidenceImages', 5), // Upload to 'slips' folder, field 'evidenceImages', max 5 files
  importExportSlipController.uploadSlipImages
);

export default slipRouter;
