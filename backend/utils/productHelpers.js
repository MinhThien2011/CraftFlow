import Material from '../models/Material.js';
import mongoose from 'mongoose';

/**
 * Process estimate material costs for a product.
 * @param {Array<Object>} estimateMaterialCost - Array of material cost items from payload.
 * @returns {Promise<Object>} Object containing processedMaterials and totalBaseCost.
 * @throws {Error} If any material is not found or inactive.
 */
export const processMaterialCosts = async (estimateMaterialCost) => {
  if (!Array.isArray(estimateMaterialCost) || estimateMaterialCost.length === 0) {
    return { processedMaterials: [], totalBaseCost: 0 };
  }

  const materialIds = new Set();
  const materialCodes = new Set();

  estimateMaterialCost.forEach(item => {
    const { material, materialCode } = item;

    // Handle 'material' field which can be either ID or Code
    if (material) {
      const materialStr = material.toString();
      if (mongoose.Types.ObjectId.isValid(materialStr)) {
        materialIds.add(materialStr);
      } else {
        materialCodes.add(materialStr);
      }
    }

    // Handle explicit 'materialCode' field (for backward compatibility)
    if (materialCode) {
      materialCodes.add(materialCode);
    }
  });

  const queryConditions = [];
  if (materialIds.size > 0) queryConditions.push({ _id: { $in: Array.from(materialIds) } });
  if (materialCodes.size > 0) queryConditions.push({ code: { $in: Array.from(materialCodes) } });

  const foundMaterials = await Material.find({
    $or: queryConditions,
    isActive: true
  }).lean();

  const materialMapById = new Map(foundMaterials.map(m => [m._id.toString(), m]));
  const materialMapByCode = new Map(foundMaterials.map(m => [m.code, m]));

  let totalBaseCost = 0;
  const processedMaterials = estimateMaterialCost.map((item, index) => {
    const { material, materialCode, quantity } = item;

    let materialDoc;

    // 1. Try to find by 'material' field
    if (material) {
      const materialStr = material.toString();
      materialDoc = mongoose.Types.ObjectId.isValid(materialStr)
        ? materialMapById.get(materialStr)
        : materialMapByCode.get(materialStr);
    }

    // 2. Fallback to 'materialCode' field if still not found
    if (!materialDoc && materialCode) {
      materialDoc = materialMapByCode.get(materialCode);
    }

    if (!materialDoc) {
      const identifier = material || materialCode || `item at index ${index}`;
      throw new Error(`Material "${identifier}" not found or is currently inactive.`);
    }

    const priceAtTime = materialDoc.price || 0;
    const unit = materialDoc.unit;
    const cost = priceAtTime * quantity;
    totalBaseCost += cost;

    return {
      ...item,
      material: materialDoc._id,
      materialCode: materialDoc.code,
      priceAtTime,
      unit
    };
  });

  return {
    processedMaterials,
    totalBaseCost: Number(totalBaseCost.toFixed(2))
  };
};
