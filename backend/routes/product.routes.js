import { Router } from 'express';
import * as productController from '../controllers/productController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';
import { imageUploader } from '../middleware/cloudinary_uploader.js';

const productRouter = Router();

// --- Public Routes (Optional, adjust as needed) ---
// @route   GET /api/products
// @desc    Get all products with search, filter, sort, and pagination
productRouter.get('/', productController.getAllProducts);

// @route   GET /api/products/low-stock
// @desc    Get products with low stock
productRouter.get('/low-stock', productController.getLowStockProducts);

// @route   GET /api/products/history
// @desc    Get all product transaction history
productRouter.get('/history', productController.getProductHistory);

// @route   GET /api/products/:id/history
// @desc    Get transaction history for a specific product
productRouter.get('/:id/history', productController.getProductHistory);

// @route   GET /api/products/:id
// @desc    Get a single product by ID
productRouter.get('/:id', productController.getProductById);


// --- Private Routes (Requires Authentication) ---
productRouter.use(jwtAuth)

// @route   POST /api/products
// @desc    Create a new product with image upload
productRouter.post(
    '/',
    rolePermission([ROLES.PRODUCTION_MANAGER]),
    imageUploader('products'),
    productController.createProduct
);

// @route   PUT /api/products/:id
// @desc    Update an existing product with image upload
productRouter.put(
    '/:id',
    rolePermission([ROLES.PRODUCTION_MANAGER]),
    imageUploader('products'),
    productController.updateProduct
);

// @route   DELETE /api/products/:id
// @desc    Deactivate a product (soft delete)
productRouter.delete('/:id', rolePermission([ROLES.PRODUCTION_MANAGER]), productController.deleteProduct);

// @route   POST /api/products/incoming
// @desc    Record incoming products (e.g., from production, returns)
productRouter.post(
    '/incoming',
    rolePermission([ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER]),
    productController.incomingProduct
);

// @route   POST /api/products/outgoing
// @desc    Record outgoing products (e.g., sales, damage)
productRouter.post(
    '/outgoing',
    rolePermission([ROLES.KHO_MANAGER]),
    productController.outgoingProduct
);

export default productRouter;