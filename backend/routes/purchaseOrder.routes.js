import { Router } from "express";
import { createPurchaseOrder, deletePurchaseOrder, getAllPurchaseOrders, getPurchaseOrderById, updatePurchaseOrder, updatePurchaseOrderStatus } from "../controllers/purchaseOrderController.js";
import { rolePermission } from "../middleware/rolePermission.js";
import { ROLES } from "../utils/constants.js";
import { jwtAuth } from "../middleware/jwtAuth.js";

const purchaseOrderRouter = Router();

purchaseOrderRouter.use(jwtAuth);

purchaseOrderRouter.post('/', rolePermission([ROLES.PRODUCTION_MANAGER]), createPurchaseOrder);
purchaseOrderRouter.put('/:id', rolePermission([ROLES.ADMIN]), updatePurchaseOrderStatus);
purchaseOrderRouter.put('/update', rolePermission([ROLES.PRODUCTION_MANAGER]), updatePurchaseOrder);
purchaseOrderRouter.delete('/:id', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]), deletePurchaseOrder);
purchaseOrderRouter.get('/:id', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]), getPurchaseOrderById);
purchaseOrderRouter.get('/', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]), getAllPurchaseOrders);

export default purchaseOrderRouter;
