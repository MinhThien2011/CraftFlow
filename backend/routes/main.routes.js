import { Router } from "express";
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

const mainRouter = Router();

mainRouter.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to the Crab Flow API",
    })
})
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

export default mainRouter;
