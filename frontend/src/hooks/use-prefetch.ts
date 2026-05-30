"use client";

import { useQueryClient } from "@tanstack/react-query";
import { materialKeys } from "@/features/inventory/hooks/use-materials";
import { materialApi } from "@/api/material.api";
import { productionKeys } from "@/features/production/hooks/use-production";
import { productionApi } from "@/api/production.api";
import { inventoryKeys } from "@/features/inventory/hooks/use-inventory";
import { inventoryApi } from "@/api/inventory.api";
import { productKeys } from "@/features/production/hooks/use-products";
import { productApi } from "@/api/product.api";

export function usePrefetch() {
  const queryClient = useQueryClient();

  const prefetchMaterials = () => {
    queryClient.prefetchQuery({
      queryKey: materialKeys.list({}),
      queryFn: () => materialApi.getMaterials({}),
    });
  };

  const prefetchProductionOrders = () => {
    queryClient.prefetchQuery({
      queryKey: productionKeys.orders({}, null),
      queryFn: () => productionApi.getOrders({}),
    });
  };

  const prefetchInventory = () => {
    queryClient.prefetchQuery({
      queryKey: inventoryKeys.materials({}),
      queryFn: () => inventoryApi.getMaterialsStock({}),
    });
  };

  const prefetchProducts = () => {
    queryClient.prefetchQuery({
      queryKey: productKeys.list({}),
      queryFn: () => productApi.getProducts({}),
    });
  };

  const prefetchMap: Record<string, () => void> = {
    "/inventory/materials": prefetchMaterials,
    "/production": prefetchProductionOrders,
    "/inventory": prefetchInventory,
    "/products": prefetchProducts,
    "/production-management/orders": prefetchProductionOrders,
    "/production-management/products": prefetchProducts,
  };

  return (href: string) => {
    const action = prefetchMap[href];
    if (action) action();
  };
}
