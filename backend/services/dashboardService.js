import Material from '../models/Material.js';
import Product from '../models/Product.js';
import ProductionOrder from '../models/ProductionOrder.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import { ORDER_STATUS, TRANSACTION_TYPE } from '../utils/constants.js';
import mongoose from 'mongoose';

/**
 * Service to get overview statistics for the dashboard.
 */
export const getOverviewStats = async () => {
    try {
        const [materialStats, productStats, orderStats] = await Promise.all([
            // 1. Material stats: Total items, Total value, Low stock items, Stock percentage
            Material.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: null,
                        totalItems: { $sum: 1 },
                        totalValue: { $sum: { $multiply: ['$currentStock', '$price'] } },
                        totalCurrentStock: { $sum: '$currentStock' },
                        totalThreshold: { $sum: '$threshold' },
                        lowStockItems: {
                            $sum: { $cond: [{ $lte: ['$currentStock', '$threshold'] }, 1, 0] }
                        }
                    }
                },
                {
                    $addFields: {
                        stockPercentage: {
                            $cond: [
                                { $eq: ['$totalThreshold', 0] },
                                0,
                                { $multiply: [{ $divide: ['$totalCurrentStock', '$totalThreshold'] }, 100] }
                            ]
                        }
                    }
                }
            ]),
            // 2. Product stats: Total items, Total value, Low stock items, Stock percentage
            Product.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: null,
                        totalItems: { $sum: 1 },
                        totalValue: { $sum: { $multiply: ['$currentStock', '$baseCost'] } },
                        totalCurrentStock: { $sum: '$currentStock' },
                        totalThreshold: { $sum: '$threshold' },
                        lowStockItems: {
                            $sum: { $cond: [{ $lte: ['$currentStock', '$threshold'] }, 1, 0] }
                        }
                    }
                },
                {
                    $addFields: {
                        stockPercentage: {
                            $cond: [
                                { $eq: ['$totalThreshold', 0] },
                                0,
                                { $multiply: [{ $divide: ['$totalCurrentStock', '$totalThreshold'] }, 100] }
                            ]
                        }
                    }
                }
            ]),
            // 3. Production order stats: Counts by status
            ProductionOrder.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        // Format order stats into an object
        const formattedOrderStats = orderStats.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});

        return {
            success: true,
            data: {
                materials: materialStats[0] || { totalItems: 0, totalValue: 0, lowStockItems: 0, stockPercentage: 0 },
                products: productStats[0] || { totalItems: 0, totalValue: 0, lowStockItems: 0, stockPercentage: 0 },
                orders: formattedOrderStats
            }
        };
    } catch (error) {
        console.error('[DashboardService] getOverviewStats error:', error);
        return { success: false, message: error.message };
    }
};

/**
 * Service to get data for charts (Inventory movement & Production trends).
 */
export const getChartData = async (days = 7) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const [inventoryTrends, productionTrends, materialConsumptionTrends] = await Promise.all([
            // 1. Inventory movement trends (Receive vs Issue/Sales)
            InventoryTransaction.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            isInput: {
                                $in: ['$type', [TRANSACTION_TYPE.RECEIVE, TRANSACTION_TYPE.PRODUCTION_IN]]
                            }
                        },
                        totalQuantity: { $sum: { $abs: '$quantity' } }
                    }
                },
                {
                    $group: {
                        _id: '$_id.date',
                        input: {
                            $sum: { $cond: ['$_id.isInput', '$totalQuantity', 0] }
                        },
                        output: {
                            $sum: { $cond: ['$_id.isInput', 0, '$totalQuantity'] }
                        }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            // 2. Production completion trends
            ProductionOrder.aggregate([
                {
                    $match: {
                        status: ORDER_STATUS.COMPLETED,
                        completedAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
                        completedCount: { $sum: 1 },
                        totalProduced: { $sum: '$quantity' }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            // 3. Material Consumption Trends
            InventoryTransaction.aggregate([
                {
                    $match: {
                        material: { $exists: true },
                        type: { $in: [TRANSACTION_TYPE.ISSUE, TRANSACTION_TYPE.DEDUCT] },
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            material: '$material'
                        },
                        consumedQuantity: { $sum: { $abs: '$quantity' } }
                    }
                },
                {
                    $lookup: {
                        from: 'materials',
                        localField: '_id.material',
                        foreignField: '_id',
                        as: 'materialInfo'
                    }
                },
                { $unwind: '$materialInfo' },
                {
                    $group: {
                        _id: '$_id.date',
                        materials: {
                            $push: {
                                materialId: '$_id.material',
                                materialName: '$materialInfo.name',
                                quantity: '$consumedQuantity'
                            }
                        },
                        totalConsumed: { $sum: '$consumedQuantity' }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        return {
            success: true,
            data: {
                inventoryTrends,
                productionTrends,
                materialConsumptionTrends
            }
        };
    } catch (error) {
        console.error('[DashboardService] getChartData error:', error);
        return { success: false, message: error.message };
    }
};

/**
 * Service to get top performing products and critical materials.
 */
export const getTopPerformanceStats = async () => {
    try {
        const [topProducts, criticalMaterials] = await Promise.all([
            // 1. Top 5 products by total produced
            Product.find({ isActive: true })
                .sort({ totalProduced: -1 })
                .limit(5)
                .select('name code totalProduced currentStock')
                .lean(),
            // 2. Top 5 materials most in need (lowest stock relative to threshold)
            Material.aggregate([
                { $match: { isActive: true } },
                {
                    $addFields: {
                        stockRatio: {
                            $cond: [
                                { $eq: ['$threshold', 0] },
                                '$currentStock',
                                { $divide: ['$currentStock', '$threshold'] }
                            ]
                        }
                    }
                },
                { $sort: { stockRatio: 1 } },
                { $limit: 5 },
                { $project: { name: 1, code: 1, currentStock: 1, threshold: 1, stockRatio: 1 } }
            ])
        ]);

        return {
            success: true,
            data: {
                topProducts,
                criticalMaterials
            }
        };
    } catch (error) {
        console.error('[DashboardService] getTopPerformanceStats error:', error);
        return { success: false, message: error.message };
    }
};
