import mongoose from "mongoose";
import { models_list } from "../../models/models_list.js";
import {
  seedRoles,
  seedUsers,
  seedShelves,
  seedMaterials,
  seedProducts,
  seedProductionOrders,
  seedProductionOrderAssignments,
  seedMaterialRequisitions,
  seedProductionOrderSlips,
  seedBoms,
  seedProductExportRequests,
  seedProductExportSlips,
  seedInventoryTransactions,
  seedMaterialAlerts,
  syncCurrentStockFromBatches,
} from "./seeds/seeders.js";

export const initializeCollections = async () => {
  console.log(`[INIT] Initializing collections for "${mongoose.connection.db.databaseName}"...`);
  let count = 0;

  await Promise.all(
    Object.entries(models_list).map(async ([name, model]) => {
      if (!(model?.prototype instanceof mongoose.Model)) {
        console.warn(`[WARN] Skipping "${name}" - not a valid Mongoose model`);
        return;
      }
      try {
        await model.init();
        count++;
      } catch (err) {
        console.error(`[ERROR] Failed to init "${name}":`, err.message);
      }
    })
  );

  console.log(`[OK] ${count}/${Object.keys(models_list).length} collections initialized`);
};

const SEED_PIPELINE = [
  { name: "Roles", fn: seedRoles },
  { name: "Users", fn: seedUsers },
  { name: "Shelves", fn: seedShelves },
  { name: "Materials", fn: seedMaterials },
  { name: "Products", fn: seedProducts },
  { name: "ProductionOrders", fn: seedProductionOrders },
  { name: "ProductionOrderAssignments", fn: seedProductionOrderAssignments },
  { name: "MaterialRequisitions", fn: seedMaterialRequisitions },
  { name: "ProductionOrderSlips", fn: seedProductionOrderSlips },
  { name: "BOMs", fn: seedBoms },
  { name: "ProductExportRequests", fn: seedProductExportRequests },
  { name: "ProductExportSlips", fn: seedProductExportSlips },
  { name: "InventoryTransactions", fn: seedInventoryTransactions },
  { name: "CurrentStockSync", fn: syncCurrentStockFromBatches },
  { name: "MaterialAlerts", fn: seedMaterialAlerts },
];

export const runSeedPipeline = async () => {
  console.log("[SEED] Running seed pipeline...");

  for (const { name, fn } of SEED_PIPELINE) {
    try {
      await fn();
    } catch (err) {
      console.error(`[ERROR] Seed "${name}" failed:`, err.message);
      throw err;
    }
  }

  console.log("[SEED] Seed pipeline complete");
};
