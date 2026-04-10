import { determineStockLevel } from './inventoryHelpers.js';

/**
 * Transforms a single product object.
 * 
 * @param {Object} product - The raw product data from database (Mongoose Document or Lean Object)
 * @returns {Object} Transformed product data with all virtuals and formatted fields.
 */
export const transformProduct = (product) => {
  if (!product) return null;
  const rawProduct = product.toObject ? product.toObject({ virtuals: true }) : product;

  return {
    ...rawProduct,
    // Ensure virtuals are present even if .lean() was used
    stockLevel: rawProduct.stockLevel || determineStockLevel(rawProduct.currentStock, rawProduct.threshold),
  };
};

/**
 * Transforms an array of product objects.
 * 
 * @param {Array} products - Array of product data
 * @returns {Array} Array of transformed products
 */
export const transformProducts = (products) => {
  if (!Array.isArray(products)) return [];
  return products.map(transformProduct);
};
