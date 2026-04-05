import { Router } from 'express';
import * as productController from '../controllers/productController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const productRouter = Router();

// @route   GET /api/products
// @desc    Get all products with search, filter, sort, and pagination
// @access  Public (or Private if you want to restrict access)
productRouter.get('/', productController.getAllProducts);
productRouter.get('/low-stock', productController.getLowStockProducts);

// @route   POST /api/products/outgoing
// @desc    Record outgoing products (e.g., sales, damage)
// @access  Private (Admin or Kho Manager)
productRouter.post('/outgoing', jwtAuth, rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER]), productController.outgoingProduct);

export default productRouter;
