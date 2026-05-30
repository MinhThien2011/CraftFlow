import { determineStockLevel } from './inventoryHelpers.js';

/**
 * Transforms a single product object.
 * 
 * @param {Object} product - The raw product data from database (Mongoose Document or Lean Object)
 * @returns {Object} Transformed product data with all virtuals and formatted fields.
 */
export const transformProduct = (product) => {
  if (!product) return null;
  const productObj = product.toObject ? product.toObject({ virtuals: true }) : { ...product };
  const { id, __v, ...rest } = productObj;
  if (rest.estimateMaterialCost && Array.isArray(rest.estimateMaterialCost)) {
    rest.estimateMaterialCost = rest.estimateMaterialCost.map(item => {
      const itemObj = item.toObject ? item.toObject({ virtuals: true }) : { ...item };
      const { id: subId, __v: subV, ...subRest } = itemObj;
      return subRest;
    });
  }

  return {
    ...rest,
    stockLevel: rest.stockLevel || determineStockLevel(rest.currentStock, rest.threshold),
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
