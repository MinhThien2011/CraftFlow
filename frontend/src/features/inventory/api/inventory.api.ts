import { materialApi } from "@/api/material.api";
import { inventoryApi } from "@/api/inventory.api";

export const inventoryFeatureApi = {
    ...materialApi,
    ...inventoryApi
};
