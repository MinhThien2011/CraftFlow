import { STOCK_LEVEL } from './constants.js';

/**
 * Determine the stock level based on current quantity and threshold.
 * 
 * Senior approach: Centralize this business logic in a utility to ensure 
 * consistency across the entire application (API, frontend, reports).
 * 
 * @param {number} currentStock - The current amount in inventory
 * @param {number} threshold - The target minimum threshold
 * @returns {string} One of STOCK_LEVEL values
 */
export const determineStockLevel = (currentStock, threshold) => {
  // 1. Absolute zero stock
  if (currentStock <= 0) {
    return STOCK_LEVEL.OUT_OF_STOCK;
  }

  // 2. Critical level: dangerously low, below 25% of threshold
  const criticalThreshold = threshold * 0.25;
  if (currentStock <= criticalThreshold) {
    return STOCK_LEVEL.CRITICAL;
  }

  // 3. Low level: below or equal to threshold
  if (currentStock <= threshold) {
    return STOCK_LEVEL.LOW;
  }

  // 4. Overstock level: potentially too much tied-up capital (e.g., 10x threshold)
  // This is a common senior consideration for inventory health
  const overstockThreshold = threshold * 10;
  if (currentStock >= overstockThreshold) {
    return STOCK_LEVEL.OVERSTOCK;
  }

  // 5. Everything else is normal
  return STOCK_LEVEL.NORMAL;
};
