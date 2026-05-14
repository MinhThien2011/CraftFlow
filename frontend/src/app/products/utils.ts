export const calculateBaseCost = (product: any) => {
    if (product.baseCost && product.baseCost > 0) return product.baseCost;
    if (!product.estimateMaterialCost || !Array.isArray(product.estimateMaterialCost)) return 0;
    return product.estimateMaterialCost.reduce((acc: number, item: any) => {
        const qty = item.quantity ?? item.qtyPerUnit ?? item.amount ?? 0;
        const price = item.priceAtTime ?? item.material?.price ?? 0;
        return acc + (qty * price);
    }, 0);
}