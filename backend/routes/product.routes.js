import { Router } from 'express';
import * as productController from '../controllers/productController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';

const productRouter = Router();

// @route   GET /api/products
// @desc    Get all products with search, filter, sort, and pagination
// @access  Public (or Private if you want to restrict access)
productRouter.get('/', productController.getAllProducts);

export default productRouter;
