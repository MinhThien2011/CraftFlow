import { Router } from "express";
import { 
    createPurchaseOrder, 
    deletePurchaseOrder, 
    getAllPurchaseOrders, 
    getPurchaseOrderById, 
    updatePurchaseOrder, 
    updatePurchaseOrderStatus 
} from "../controllers/purchaseOrderController.js";
import { rolePermission } from "../middleware/rolePermission.js";
import { ROLES } from "../utils/constants.js";
import { jwtAuth } from "../middleware/jwtAuth.js";

const purchaseOrderRouter = Router();

// --- General Access (Authenticated) ---
purchaseOrderRouter.use(jwtAuth);

// Collection & Individual Access
purchaseOrderRouter.get('/', 
    rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]), 
    getAllPurchaseOrders
);

purchaseOrderRouter.get('/:id', 
    rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]), 
    getPurchaseOrderById
);

// --- Management (Production Manager) ---
purchaseOrderRouter.post('/', rolePermission([ROLES.PRODUCTION_MANAGER]), createPurchaseOrder);
purchaseOrderRouter.put('/:id', rolePermission([ROLES.PRODUCTION_MANAGER]), updatePurchaseOrder);
purchaseOrderRouter.delete('/:id', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]), deletePurchaseOrder);

// --- Approvals (Admin) ---
purchaseOrderRouter.patch('/:id/status', rolePermission([ROLES.ADMIN]), updatePurchaseOrderStatus);

export default purchaseOrderRouter;
