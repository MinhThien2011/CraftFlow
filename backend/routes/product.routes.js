import { Router } from 'express';
import * as productController from '../controllers/productController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { rolePermission } from '../middleware/rolePermission.js';
import { ROLES } from '../utils/constants.js';

const productRouter = Router();

// --- Public Routes (Optional, adjust as needed) ---
// @route   GET /api/products
// @desc    Get all products with search, filter, sort, and pagination
productRouter.get('/', productController.getAllProducts);

// @route   GET /api/products/low-stock
// @desc    Get products with low stock
productRouter.get('/low-stock', productController.getLowStockProducts);

// @route   GET /api/products/:id
// @desc    Get a single product by ID
productRouter.get('/:id', productController.getProductById);


// --- Private Routes (Requires Authentication) ---
productRouter.use(jwtAuth);

// --- Admin & Warehouse Manager Routes ---
const adminOrWarehouse = rolePermission([ROLES.ADMIN, ROLES.KHO_MANAGER]);

// @route   POST /api/products
// @desc    Create a new product
productRouter.post('/', adminOrWarehouse, productController.createProduct);

// @route   PUT /api/products/:id
// @desc    Update an existing product
productRouter.put('/:id', adminOrWarehouse, productController.updateProduct);

// @route   DELETE /api/products/:id
// @desc    Deactivate a product (soft delete)
productRouter.delete('/:id', adminOrWarehouse, productController.deleteProduct);

// @route   POST /api/products/outgoing
// @desc    Record outgoing products (e.g., sales, damage)
productRouter.post('/outgoing', adminOrWarehouse, productController.outgoingProduct);

export default productRouter;
