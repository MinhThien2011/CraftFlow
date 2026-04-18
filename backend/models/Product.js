import mongoose from 'mongoose';
import { determineStockLevel } from '../utils/inventoryHelpers.js';

const materialCostSchema = new mongoose.Schema({
  material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
  quantity: { type: Number, required: true, min: 0, default: 0.0 },
  materialCode: { type: String, required: true },
  unit: { type: String, default: 'unit' },
  priceAtTime: { type: Number, min: 0, default: 0.0 },
  currency: { type: String, default: 'VND' },
}, {
  toJSON: {
    versionKey: false,
  },
    toObject: {
    versionKey: false,
  }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  description: String,
  category: { type: String, required: true },
  unit: { type: String, default: 'unit' },
  estimatedProductionTime: { type: Number, default: 0, min: 0 },
  estimateMaterialCost: [materialCostSchema],
  isActive: { type: Boolean, default: true },
  baseCost: { type: Number, default: 0.0, min: 0 },
  productImage: { type: String, default: 'https://res.cloudinary.com/dvjop6kew/image/upload/v1775898313/products/akyfj6xpovcyhaupebmb.jpg' },
  currentStock: { type: Number, default: 0, min: 0 }, // Current stock quantity
  threshold: { type: Number, default: 5, min: 0 }, // Warning threshold for low stock
  shelf: { type: mongoose.Schema.Types.ObjectId, ref: 'Shelf' }, // Link to Shelf model
  locationDetails: { type: String, trim: true }, // Extra details like row/box number
  totalProduced: { type: Number, default: 0, min: 0 } // total produced quantity
}, {
  timestamps: true,
  toJSON: {
    // virtuals: true,
    versionKey: false,
  },
  toObject: {
    // virtuals: true,
    versionKey: false,
  }
});

/**
 * Virtual property to get current stock level status.
 * Used for display and categorization.
 */
productSchema.virtual('stockLevel').get(function () {
  return determineStockLevel(this.currentStock, this.threshold);
});

/**
 * Static method to synchronize material information across all products.
 * @param {string} materialId - The ID of the material that changed
 * @param {Object} updateData - The new data for the material (name, code, price, unit, currency)
 */
productSchema.statics.syncMaterialChanges = async function (materialId, updateData) {
  const { name, code, price, unit, currency } = updateData;

  try {
    await this.updateMany(
      { 'estimateMaterialCost.material': materialId },
      [
        {
          $set: {
            estimateMaterialCost: {
              $map: {
                input: '$estimateMaterialCost',
                as: 'item',
                in: {
                  $mergeObjects: [
                    '$$item',
                    {
                      $cond: [
                        { $eq: ['$$item.material', new mongoose.Types.ObjectId(materialId)] },
                        {
                          materialName: name,
                          materialCode: code,
                          priceAtTime: price,
                          unit: unit,
                          currency: currency || 'VND',
                        },
                        {}
                      ]
                    }
                  ]
                }
              }
            }
          }
        },
        {
          $set: {
            baseCost: {
              $reduce: {
                input: '$estimateMaterialCost',
                initialValue: 0,
                in: {
                  $add: [
                    '$$value',
                    { $multiply: ['$$this.quantity', '$$this.priceAtTime'] }
                  ]
                }
              }
            }
          }
        }
      ],
      { updatePipeline: true }
    );
    console.log(`[ProductSync] Successfully updated material ${materialId} in all related products.`);
  } catch (error) {
    console.error(`[ProductSync] Error syncing material changes for ${materialId}:`, error);
  }
};

productSchema.index({ isActive: 1 });
productSchema.index({ category: 1 });
productSchema.index({ name: 1, code: 1 });
productSchema.index({ createdAt: -1 });

export default mongoose.model('Product', productSchema);