import { Router } from "express";
import { createPurchaseOrder, deletePurchaseOrder, getAllPurchaseOrders, getPurchaseOrderById, updatePurchaseOrder, updatePurchaseOrderStatus } from "../controllers/purchaseOrderController.js";
import { rolePermission } from "../middleware/rolePermission.js";
import { ROLES } from "../utils/constants.js";
import { jwtAuth } from "../middleware/jwtAuth.js";
import { validate } from "../middleware/paramsValidator.js";
import { commonParamsSchema } from "../validations/paramsValidator.js";

const purchaseOrderRouter = Router();

purchaseOrderRouter.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to the Purchase Order API of Crafb Flow",
    })
})
purchaseOrderRouter.use(jwtAuth);

purchaseOrderRouter.post('/', rolePermission([ROLES.PRODUCTION_MANAGER]), createPurchaseOrder);
purchaseOrderRouter.patch('/:id/status', validate(commonParamsSchema(null, true)), rolePermission([ROLES.ADMIN]), updatePurchaseOrderStatus);
purchaseOrderRouter.put('/:id', validate(commonParamsSchema(null, true)), rolePermission([ROLES.PRODUCTION_MANAGER]), updatePurchaseOrder);
purchaseOrderRouter.delete('/:id', validate(commonParamsSchema(null, true)), rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]), deletePurchaseOrder);
purchaseOrderRouter.get('/:id', validate(commonParamsSchema(null, true)), rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]), getPurchaseOrderById);
purchaseOrderRouter.get('/', rolePermission([ROLES.PRODUCTION_MANAGER, ROLES.ADMIN]), getAllPurchaseOrders);

export default purchaseOrderRouter;
