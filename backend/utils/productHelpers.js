import Material from '../models/Material.js';

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
    if (item.material) materialIds.add(item.material.toString());
    if (item.materialCode) materialCodes.add(item.materialCode);
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
    const materialDoc = (material && materialMapById.get(material.toString())) || 
                        (materialCode && materialMapByCode.get(materialCode));

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
