import { getActiveProductionOrders, getAtRiskProductionOrders, getTodayProductionSummary } from './productionTools.js';
import { getLowStockMaterials, searchMaterialStock } from './inventoryTools.js';
import { getRequisitions, getRequisitionDetails } from './requisitionTools.js';
import { getPurchaseOrders } from './purchaseOrderTools.js';
import { searchUsers } from './userTools.js';
import { getSystemSnapshotTool } from './systemTools.js';
import { queryBusinessDataTool } from './queryTools.js';
import { askForClarificationTool } from './clarificationTools.js';
import {
  getInventoryOverviewTool,
  getLowStockAlertsTool,
  getProductionDashboardStatsTool,
  getWarehouseDashboardStatsTool,
  getWarehouseFifoOverviewTool,
  getItemFifoHistoryTool,
  getSlipsSummaryTool
} from './analyticsTools.js';
import { appLogger } from '../utils/appLogger.js';

const registeredTools = [
  getActiveProductionOrders,
  getAtRiskProductionOrders,
  getTodayProductionSummary,
  queryBusinessDataTool,
  askForClarificationTool,
  getLowStockMaterials,
  searchMaterialStock,
  getRequisitions,
  getRequisitionDetails,
  getPurchaseOrders,
  getInventoryOverviewTool,
  getLowStockAlertsTool,
  getProductionDashboardStatsTool,
  getWarehouseDashboardStatsTool,
  getWarehouseFifoOverviewTool,
  getItemFifoHistoryTool,
  getSlipsSummaryTool,
  getSystemSnapshotTool,
  searchUsers,
];

const toolAliases = {
  get_orders: 'get_active_production_orders',
  get_production_orders: 'get_active_production_orders',
  get_order_status: 'get_active_production_orders',
  get_at_risk_orders: 'get_at_risk_production_orders',
  query_data: 'query_business_data',
  query_database: 'query_business_data',
  get_history: 'query_business_data',
  clarification: 'ask_for_clarification',
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

export const getToolsForRole = (role) => {
  if (role === 'admin') return registeredTools;
  return registeredTools.filter((tool) => tool.roles.includes(role));
};

export const executeTool = async (functionName, args, user) => {
  const normalizedFunctionName = normalizeFunctionName(functionName);
  const tool = registeredTools.find((t) => t.declaration.name === normalizedFunctionName);

  if (!tool) {
    return { error: `Tool ${functionName} khong ton tai.` };
  }

  const userRole = user.role || 'staff';
  const isAllowed = userRole === 'admin' || tool.roles.includes(userRole);

  if (!isAllowed) {
    return { error: { code: 'ROLE_DENIED', message: `Ban (${userRole}) khong co quyen su dung cong cu nay.` } };
  }

  try {
    appLogger.info('TOOL', 'execute', { tool: normalizedFunctionName, user: user.username });
    return await tool.execute(args, user);
  } catch (error) {
    appLogger.error('TOOL', 'execute_failed', { tool: normalizedFunctionName, message: error?.message });
    return { error: { code: 'TOOL_EXECUTION_ERROR', message: 'Loi he thong khi thuc thi cong cu du lieu.' } };
  }
};
