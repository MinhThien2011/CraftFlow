import { Router } from 'express';
import * as productController from '../controllers/productController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';
import { imageUploader } from '../middleware/cloudinary_uploader.js';

const productRouter = Router();

// --- Public / General Access ---
productRouter.get('/', productController.getAllProducts);
productRouter.get('/low-stock', productController.getLowStockProducts);
productRouter.get('/history', productController.getProductHistory);
productRouter.get('/:id', productController.getProductById);
productRouter.get('/:id/history', productController.getProductHistory);

// --- Authenticated & Authorized Access ---
productRouter.use(jwtAuth);

// Production Manager: CRUD Products
productRouter.post('/', 
    rolePermission([ROLES.PRODUCTION_MANAGER]), 
    imageUploader('products'), 
    productController.createProduct
);

productRouter.put('/:id', 
    rolePermission([ROLES.PRODUCTION_MANAGER]), 
    imageUploader('products'), 
    productController.updateProduct
);

productRouter.delete('/:id', 
    rolePermission([ROLES.ADMIN, ROLES.PRODUCTION_MANAGER]), 
    productController.deleteProduct
);

// Admin: Inventory Operations
productRouter.post('/incoming', rolePermission([ROLES.ADMIN]), productController.incomingProduct);
productRouter.post('/outgoing', rolePermission([ROLES.ADMIN]), productController.outgoingProduct);

export default productRouter;
