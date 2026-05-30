import Material from '../models/Material.js';
import Product from '../models/Product.js';
import ProductionOrder from '../models/ProductionOrder.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import MaterialRequisition from '../models/MaterialRequisition.js';
import InventoryShrinkageReport from '../models/InventoryShrinkageReport.js';
import InventoryImportExportSlip from '../models/InventoryImportExportSlip.js';
import MaterialAlert from '../models/MaterialAlert.js';
import ProductionOrderAssignment from '../models/ProductionOrderAssignment.js';
import { 
    ORDER_STATUS, 
    TRANSACTION_TYPE, 
    REQUISITION_STATUS, 
    REQUISITION_TYPE, 
    SHRINKAGE_STATUS, 
    INVENTORY_IMPORT_EXPORT_SLIP_STATUS 
} from '../utils/constants.js';
import mongoose from 'mongoose';

import { getCachedData, setCachedData } from '../utils/redisFetching.js';
import { applyAggregateGuards, applyQueryGuards } from '../utils/queryPerformance.js';

const DASHBOARD_CACHE_KEY = 'dashboard:overview';
const DASHBOARD_CACHE_TTL = 300; // 5 minutes

/**
 * Service to get overview statistics for the dashboard.
 */
export const getOverviewStats = async () => {
    try {
        const cachedData = await getCachedData(DASHBOARD_CACHE_KEY);
        if (cachedData) {
            return { success: true, data: cachedData, fromCache: true };
        }

        const [materialStats, productStats, orderStats] = await Promise.all([
            // 1. Material stats: Total items, Total value, Low stock items, Stock percentage
            applyAggregateGuards(Material.aggregate([
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
            ])),
            // 2. Product stats: Total items, Total value, Low stock items, Stock percentage
            applyAggregateGuards(Product.aggregate([
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
            ])),
            // 3. Production order stats: Counts by status
            applyAggregateGuards(ProductionOrder.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]))
        ]);

        // Format order stats into an object
        const formattedOrderStats = orderStats.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});

        const resultData = {
            materials: materialStats[0] || { totalItems: 0, totalValue: 0, lowStockItems: 0, stockPercentage: 0 },
            products: productStats[0] || { totalItems: 0, totalValue: 0, lowStockItems: 0, stockPercentage: 0 },
            orders: formattedOrderStats
        };

        // Save to cache asynchronously
        setCachedData(DASHBOARD_CACHE_KEY, resultData, DASHBOARD_CACHE_TTL).catch(() => {});
        /*
        if (false) {
            client.setEx(DASHBOARD_CACHE_KEY, DASHBOARD_CACHE_TTL, JSON.stringify(resultData)).catch(err => {
                console.error('⚠️ Dashboard Cache Set Error:', err.message);
            });
        }
        */

        return {
            success: true,
            data: resultData
        };
    } catch (error) {
        console.log('[DashboardService] getOverviewStats error:', error);
        return { success: false, message: error.message };
    }
};

/**
 * Service to get recent alerts for dashboard.
 */
export const getRecentAlerts = async (limit = 5) => {
    try {
        const [materials, products] = await Promise.all([
            applyQueryGuards(Material.find({
                isActive: true,
                $expr: { $lte: ['$currentStock', '$threshold'] }
            })
                .sort({ currentStock: 1 })
                .limit(limit)
                .select('name currentStock threshold unit')
                .lean()),
            applyQueryGuards(Product.find({
                isActive: true,
                $expr: { $lte: ['$currentStock', '$threshold'] }
            })
                .sort({ currentStock: 1 })
                .limit(limit)
                .select('name currentStock threshold unit category')
                .lean())
        ]);

        const alerts = [
            ...materials.map(m => ({ ...m, type: 'material' })),
            ...products.map(p => ({ ...p, type: 'product' }))
        ].sort((a, b) => {
            const aPct = a.threshold > 0 ? a.currentStock / a.threshold : 0;
            const bPct = b.threshold > 0 ? b.currentStock / b.threshold : 0;
            return aPct - bPct;
        }).slice(0, limit);

        return {
            success: true,
            data: alerts.map(a => ({
                id: a._id,
                name: a.name,
                currentStock: a.currentStock,
                minStock: a.threshold,
                unit: a.unit,
                type: a.type,
                status: a.currentStock === 0 ? 'Nguy cấp' : 'Sắp hết'
            }))
        };
    } catch (error) {
        console.log('[DashboardService] getRecentAlerts error:', error);
        return { success: false, message: error.message, data: [] };
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
            applyAggregateGuards(InventoryTransaction.aggregate([
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
            ])),
            // 2. Production completion trends
            applyAggregateGuards(ProductionOrder.aggregate([
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
                        totalProduced: { $sum: { $sum: '$products.quantity' } }
                    }
                },
                { $sort: { _id: 1 } }
            ])),
            // 3. Material Consumption Trends
            applyAggregateGuards(InventoryTransaction.aggregate([
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
            ]))
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
        console.log('[DashboardService] getChartData error:', error);
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
            applyQueryGuards(Product.find({ isActive: true })
                .sort({ totalProduced: -1 })
                .limit(5)
                .select('name code totalProduced currentStock')
                .lean()),
            // 2. Top 5 materials most in need (lowest stock relative to threshold)
            applyAggregateGuards(Material.aggregate([
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
            ]))
        ]);

        return {
            success: true,
            data: {
                topProducts,
                criticalMaterials
            }
        };
    } catch (error) {
        console.log('[DashboardService] getTopPerformanceStats error:', error);
        return { success: false, message: error.message };
    }
};

/**
 * Service to get specific statistics for the Warehouse Manager dashboard.
 */
export const getWarehouseStats = async () => {
    try {
        const [
            pendingRequisitions,
            pendingReturns,
            lowStockMaterials,
            pendingDefects,
            pendingSlips
        ] = await Promise.all([
            // 1. Pending Requisitions (Issue/Supplementary) that need action
            applyQueryGuards(MaterialRequisition.countDocuments({ status: { $in: [REQUISITION_STATUS.PENDING, REQUISITION_STATUS.APPROVED] } })),
            
            // 2. Pending Returns
            applyQueryGuards(MaterialRequisition.countDocuments({ type: REQUISITION_TYPE.RETURN, status: REQUISITION_STATUS.RETURN_PENDING })),

            // 3. Low stock materials (below threshold)
            applyQueryGuards(Material.countDocuments({ isActive: true, $expr: { $lte: ['$currentStock', '$threshold'] } })),

            // 4. Pending Defects/Shrinkage
            applyQueryGuards(InventoryShrinkageReport.countDocuments({ status: SHRINKAGE_STATUS.PENDING })),

            // 5. Pending Import/Export Slips
            applyQueryGuards(InventoryImportExportSlip.countDocuments({ status: { $in: [INVENTORY_IMPORT_EXPORT_SLIP_STATUS.PENDING, INVENTORY_IMPORT_EXPORT_SLIP_STATUS.INSPECTED] } }))
        ]);

        return {
            success: true,
            data: {
                pendingRequisitions,
                pendingReturns,
                lowStockItems: lowStockMaterials,
                pendingDefects,
                pendingSlips,
                timeoutRequisitions: 0 // Default for now, can implement specific logic if needed
            }
        };
    } catch (error) {
        console.log('[DashboardService] getWarehouseStats error:', error);
        return { success: false, message: error.message };
    }
};

/**
 * Service to get recent inventory transactions for the warehouse.
 */
export const getWarehouseRecentActivity = async (limit = 10) => {
    try {
        const activities = await applyQueryGuards(InventoryTransaction.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('material', 'name code unit')
            .populate('product', 'name code unit')
            .populate('performedBy', 'fullName')
            .lean());
        
        return {
            success: true,
            data: activities.map(act => ({
                id: act._id,
                type: act.type,
                quantity: act.quantity,
                itemName: act.material?.name || act.product?.name || 'N/A',
                itemCode: act.material?.code || act.product?.code || 'N/A',
                unit: act.material?.unit || act.product?.unit || '',
                user: act.performedBy?.fullName || 'System',
                notes: act.notes,
                createdAt: act.createdAt
            }))
        };
    } catch (error) {
        console.log('[DashboardService] getWarehouseRecentActivity error:', error);
        return { success: false, message: error.message, data: [] };
    }
};

/**
 * Service to get dedicated dashboard data for Production Manager.
 */
export const getProductionManagerDashboardStats = async (days = 14, staffLimit = 8) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const [
            totalProducts,
            totalOrders,
            statusDistribution,
            priorityDistribution,
            pendingMaterialAlerts,
            staffWorkload,
            completionTrend,
            recentOrders
        ] = await Promise.all([
            applyQueryGuards(Product.countDocuments({ isActive: true })),
            applyQueryGuards(ProductionOrder.countDocuments({})),
            applyAggregateGuards(ProductionOrder.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ])),
            applyAggregateGuards(ProductionOrder.aggregate([
                { $group: { _id: '$priority', count: { $sum: 1 } } }
            ])),
            applyQueryGuards(MaterialAlert.countDocuments({ status: 'pending' })),
            applyAggregateGuards(ProductionOrderAssignment.aggregate([
                {
                    $addFields: {
                        remainingQuantity: { $max: [{ $subtract: ['$assignedQuantity', '$completedQuantity'] }, 0] }
                    }
                },
                {
                    $match: {
                        remainingQuantity: { $gt: 0 }
                    }
                },
                {
                    $group: {
                        _id: '$staff',
                        assignedQuantity: { $sum: '$assignedQuantity' },
                        completedQuantity: { $sum: '$completedQuantity' },
                        remainingQuantity: { $sum: '$remainingQuantity' },
                        activeAssignments: { $sum: 1 }
                    }
                },
                { $sort: { remainingQuantity: -1, activeAssignments: -1 } },
                { $limit: staffLimit },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'staffInfo'
                    }
                },
                { $unwind: { path: '$staffInfo', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 0,
                        staffId: '$_id',
                        fullName: '$staffInfo.fullName',
                        username: '$staffInfo.username',
                        assignedQuantity: 1,
                        completedQuantity: 1,
                        remainingQuantity: 1,
                        activeAssignments: 1,
                    }
                }
            ])),
            applyAggregateGuards(ProductionOrder.aggregate([
                {
                    $match: {
                        status: ORDER_STATUS.COMPLETED,
                        completedAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
                        completedOrders: { $sum: 1 },
                        totalProduced: { $sum: { $sum: '$products.quantity' } }
                    }
                },
                { $sort: { _id: 1 } }
            ])),
            applyQueryGuards(ProductionOrder.find({})
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('products.product', 'name code')
                .lean())
        ]);

        const statusMap = statusDistribution.reduce((acc, row) => {
            acc[row._id || 'unknown'] = row.count;
            return acc;
        }, {});

        const priorityMap = priorityDistribution.reduce((acc, row) => {
            acc[row._id || 'unknown'] = row.count;
            return acc;
        }, {});

        return {
            success: true,
            data: {
                overview: {
                    totalProducts,
                    totalOrders,
                    inProductionOrders: statusMap[ORDER_STATUS.IN_PRODUCTION] || 0,
                    pendingMaterialAlerts
                },
                statusDistribution: statusMap,
                priorityDistribution: priorityMap,
                staffWorkload,
                completionTrend,
                recentOrders
            }
        };
    } catch (error) {
        console.log('[DashboardService] getProductionManagerDashboardStats error:', error);
        return { success: false, message: error.message, data: null };
    }
};
