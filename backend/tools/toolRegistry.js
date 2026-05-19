import { getActiveProductionOrders, getTodayProductionSummary } from './productionTools.js';
import { getLowStockMaterials, searchMaterialStock } from './inventoryTools.js';
import { getRequisitions, getRequisitionDetails } from './requisitionTools.js';
import { getPurchaseOrders } from './purchaseOrderTools.js';
import { searchUsers } from './userTools.js';
import { getSystemSnapshotTool } from './systemTools.js';
import {
    getInventoryOverviewTool,
    getLowStockAlertsTool,
    getProductionDashboardStatsTool,
    getWarehouseDashboardStatsTool,
    getWarehouseFifoOverviewTool,
    getItemFifoHistoryTool,
    getSlipsSummaryTool
} from './analyticsTools.js';

const registeredTools = [
    // Production
    getActiveProductionOrders,
    getTodayProductionSummary,

    // Inventory
    getLowStockMaterials,
    searchMaterialStock,

    // Requisitions
    getRequisitions,
    getRequisitionDetails,

    // Purchase Orders
    getPurchaseOrders,
    getInventoryOverviewTool,
    getLowStockAlertsTool,
    getProductionDashboardStatsTool,
    getWarehouseDashboardStatsTool,
    getWarehouseFifoOverviewTool,
    getItemFifoHistoryTool,
    getSlipsSummaryTool,
    getSystemSnapshotTool,

    // Users (Admin only)
    searchUsers,
];

const toolAliases = {
    get_orders: 'get_active_production_orders',
};

const normalizeFunctionName = (functionName) => {
    const rawName = String(functionName || '');
    const nameWithoutNamespace = rawName
        .split(':')
        .pop()
        .split('.')
        .pop()
        .split('/')
        .pop();
    return toolAliases[nameWithoutNamespace] || nameWithoutNamespace;
};

/**
 * Lấy danh sách các tool khả dụng dựa trên Role của User
 */
export const getToolsForRole = (role) => {
    if (role === 'admin') return registeredTools;
    return registeredTools.filter(tool => 
        tool.roles.includes(role)
    );
};

/**
 * Thực thi tool khi Gemini yêu cầu (Function Calling)
 */
export const executeTool = async (functionName, args, user) => {
    const normalizedFunctionName = normalizeFunctionName(functionName);
    const tool = registeredTools.find(t => t.declaration.name === normalizedFunctionName);

    if (!tool) {
        return { error: `Tool ${functionName} không tồn tại.` };
    }

    // Bảo mật 2 lớp: Check quyền thực thi
    const userRole = user.role || 'staff';
    const isAllowed = userRole === 'admin' || tool.roles.includes(userRole);

    if (!isAllowed) {
        return { error: `Bạn (${userRole}) không có quyền sử dụng công cụ này.` };
    }

    try {
        console.log(`[ToolRegistry] Executing: ${normalizedFunctionName} for user: ${user.username}`);
        return await tool.execute(args, user);
    } catch (error) {
        console.error(`[ToolRegistry] Error running ${functionName}:`, error);
        return { error: 'Lỗi hệ thống khi thực thi công cụ dữ liệu.' };
    }
};
