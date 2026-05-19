import { Router } from 'express';
import * as batchController from '../controllers/batchController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const batchRouter = Router();

batchRouter.use(jwtAuth);

// Get batches for a specific material
batchRouter.get('/material/:materialId',
    rolePermission([ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]),
    batchController.getBatchesByMaterial
);

// Get batches expiring within N days
batchRouter.get('/expiring',
    rolePermission([ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]),
    batchController.getExpiringBatches
);

// Get calculated stock from batches for a material
batchRouter.get('/stock/:materialId',
    rolePermission([ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]),
    batchController.getMaterialStockFromBatches
);

// Trace a batch by number
batchRouter.get('/trace/:batchNumber',
    rolePermission([ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]),
    batchController.traceBatch
);

// Get active batches with filters
batchRouter.get('/active',
    rolePermission([ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]),
    batchController.getActiveBatches
);

// Warehouse-level FIFO overview
batchRouter.get('/fifo-history/overview',
    rolePermission([ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]),
    batchController.getWarehouseFifoOverview
);

// FIFO history for a single material/product
batchRouter.get('/fifo-history/item',
    rolePermission([ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]),
    batchController.getItemFifoHistory
);

// Assign or move a batch to a shelf
batchRouter.post('/assign/:batchId',
    rolePermission([ROLES.KHO_MANAGER, ROLES.ADMIN]),
    batchController.assignLocation
);

// Reconcile material stock based on batch data
batchRouter.post('/reconcile/:materialId',
    rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER]),
    batchController.reconcileStock
);

export default batchRouter;
