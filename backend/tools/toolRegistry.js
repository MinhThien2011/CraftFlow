import { getActiveProductionOrders } from './productionTools.js';
import { getLowStockMaterials, searchMaterialStock } from './inventoryTools.js';
import { getRequisitions, getRequisitionDetails } from './requisitionTools.js';
import { getPurchaseOrders } from './purchaseOrderTools.js';
import { searchUsers } from './userTools.js';

const registeredTools = [
    // Production
    getActiveProductionOrders,

    // Inventory
    getLowStockMaterials,
    searchMaterialStock,

    // Requisitions
    getRequisitions,
    getRequisitionDetails,

    // Purchase Orders
    getPurchaseOrders,

    // Users (Admin only)
    searchUsers,
];

const toolAliases = {
    get_orders: 'get_active_production_orders',
};

const normalizeFunctionName = (functionName) => {
    const rawName = String(functionName || '');
    const nameWithoutNamespace = rawName.includes(':') ? rawName.split(':').pop() : rawName;
    return toolAliases[nameWithoutNamespace] || nameWithoutNamespace;
};

/**
 * Lấy danh sách các tool khả dụng dựa trên Role của User
 */
export const getToolsForRole = (role) => {
    return registeredTools.filter(tool => 
        tool.roles.includes('admin') || 
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
    const isAllowed = tool.roles.includes('admin') || tool.roles.includes(userRole);

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
