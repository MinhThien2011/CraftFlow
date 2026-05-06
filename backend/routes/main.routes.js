import { Router } from "express";
import { apiLimiter } from "../middleware/rateLimit.js";

// Import all modular routes
import authRouter from "./auth.routes.js";
import userRouter from "./user.routes.js";
import materialRouter from "./material.routes.js";
import systemRouter from "./system.routes.js";
import productionRouter from "./production.routes.js";
import requisitionRouter from "./requisition.routes.js";
import productRouter from "./product.routes.js";
import inventoryRouter from "./inventory.routes.js";
import dashboardRouter from "./dashboard.routes.js";
import shelfRouter from "./shelf.routes.js";
import slipRouter from "./slip.routes.js";
import purchaseOrderRouter from "./purchaseOrder.routes.js";
import batchRouter from "./batch.routes.js";
import shrinkageRouter from "./shrinkage.routes.js";
import productExportRouter from "./productExport.routes.js";
import notificationRouter from "./notification.routes.js";

const mainRouter = Router();

// Apply global API Rate Limiting
mainRouter.use(apiLimiter);

// Health check endpoint
mainRouter.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to the CraftFlow API Service",
    });
});

// Modular Route Mountings
mainRouter.use('/auth', authRouter);
mainRouter.use('/users', userRouter);
mainRouter.use('/materials', materialRouter);
mainRouter.use('/system', systemRouter);
mainRouter.use('/production', productionRouter);
mainRouter.use('/requisitions', requisitionRouter);
mainRouter.use('/products', productRouter);
mainRouter.use('/inventory', inventoryRouter);
mainRouter.use('/dashboard', dashboardRouter);
mainRouter.use('/shelves', shelfRouter);
mainRouter.use('/slips', slipRouter);
mainRouter.use('/purchaseOrders', purchaseOrderRouter);
mainRouter.use('/batches', batchRouter);
mainRouter.use('/shrinkage', shrinkageRouter);
mainRouter.use('/product-exports', productExportRouter);
mainRouter.use('/notifications', notificationRouter);

export default mainRouter;
