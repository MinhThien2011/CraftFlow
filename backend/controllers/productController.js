import * as productService from '../services/productService.js';

/**
 * Controller to get all products with advanced query features.
 */
export const getAllProducts = async (req, res) => {
  const result = await productService.getProductsByQuery(req.query);

  if (result.status === 'success') {
    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result.data
    });
  } else {
    res.status(500).json({
      status: 'error',
      message: result.message,
      data: null
    });
  }
};
