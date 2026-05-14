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
    const tool = registeredTools.find(t => t.declaration.name === functionName);

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
        console.log(`[ToolRegistry] Executing: ${functionName} for user: ${user.username}`);
        return await tool.execute(args, user);
    } catch (error) {
        console.error(`[ToolRegistry] Error running ${functionName}:`, error);
        return { error: 'Lỗi hệ thống khi thực thi công cụ dữ liệu.' };
    }
};
