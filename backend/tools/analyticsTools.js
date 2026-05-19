import { getInventoryOverview, getUnifiedLowStockAlerts } from "../services/inventoryService.js";
import { getProductionManagerDashboardStats, getWarehouseStats } from "../services/dashboardService.js";
import { getWarehouseFifoOverview, getItemFifoHistory } from "../services/fifoService.js";
import { getAllSlipsService } from "../services/importExportSlipService.js";

export const getInventoryOverviewTool = {
    declaration: {
        name: "get_inventory_overview",
        description: "Lấy tổng quan tồn kho nguyên liệu và thành phẩm.",
        parameters: { type: "OBJECT", properties: {} }
    },
    roles: ["admin", "kho_manager", "production_manager"],
    execute: async () => {
        const result = await getInventoryOverview();
        if (!result?.success) return { error: result?.message || "Không thể lấy tổng quan tồn kho." };
        return result.data;
    }
};

export const getLowStockAlertsTool = {
    declaration: {
        name: "get_low_stock_alerts",
        description: "Lấy danh sách cảnh báo tồn thấp hợp nhất (nguyên liệu + thành phẩm).",
        parameters: { type: "OBJECT", properties: {} }
    },
    roles: ["admin", "kho_manager", "production_manager"],
    execute: async () => {
        const result = await getUnifiedLowStockAlerts();
        if (!result?.success) return { error: result?.message || "Không thể lấy cảnh báo tồn kho." };
        return result.data;
    }
};

export const getProductionDashboardStatsTool = {
    declaration: {
        name: "get_production_dashboard_stats",
        description: "Lấy số liệu dashboard cho quản lý sản xuất.",
        parameters: {
            type: "OBJECT",
            properties: {
                days: { type: "NUMBER", description: "Số ngày thống kê, mặc định 14." },
                staffLimit: { type: "NUMBER", description: "Số nhân sự hiển thị tải công việc, mặc định 8." }
            }
        }
    },
    roles: ["admin", "production_manager"],
    execute: async (args = {}) => {
        const result = await getProductionManagerDashboardStats(args.days || 14, args.staffLimit || 8);
        if (!result?.success) return { error: result?.message || "Không thể lấy số liệu dashboard sản xuất." };
        return result.data;
    }
};

export const getWarehouseDashboardStatsTool = {
    declaration: {
        name: "get_warehouse_dashboard_stats",
        description: "Lấy số liệu dashboard cho quản lý kho.",
        parameters: { type: "OBJECT", properties: {} }
    },
    roles: ["admin", "kho_manager"],
    execute: async () => {
        const result = await getWarehouseStats();
        if (!result?.success) return { error: result?.message || "Không thể lấy số liệu dashboard kho." };
        return result.data;
    }
};

export const getWarehouseFifoOverviewTool = {
    declaration: {
        name: "get_warehouse_fifo_overview",
        description: "Lấy tổng quan FIFO toàn kho theo từng nguyên liệu/thành phẩm (số batch, tồn còn lại...).",
        parameters: {
            type: "OBJECT",
            properties: {
                search: { type: "STRING", description: "Tìm theo mã/tên item." },
                type: { type: "STRING", description: "all | material | product" }
            }
        }
    },
    roles: ["admin", "kho_manager", "production_manager"],
    execute: async (args = {}) => {
        const result = await getWarehouseFifoOverview({ search: args.search || "", type: args.type || "all" });
        if (!result?.success) return { error: result?.message || "Không thể lấy tổng quan FIFO kho." };
        return result.data;
    }
};

export const getItemFifoHistoryTool = {
    declaration: {
        name: "get_item_fifo_history",
        description: "Lấy lịch sử FIFO chi tiết cho một item (material/product): batch, tồn còn lại, vị trí, giao dịch in/out.",
        parameters: {
            type: "OBJECT",
            properties: {
                itemType: { type: "STRING", description: "material hoặc product." },
                itemId: { type: "STRING", description: "ObjectId của item." }
            },
            required: ["itemType", "itemId"]
        }
    },
    roles: ["admin", "kho_manager", "production_manager"],
    execute: async (args = {}) => {
        const result = await getItemFifoHistory({ itemType: args.itemType, itemId: args.itemId });
        if (!result?.success) return { error: result?.message || "Không thể lấy lịch sử FIFO item." };
        return result.data;
    }
};

export const getSlipsSummaryTool = {
    declaration: {
        name: "get_slips_summary",
        description: "Lấy nhanh danh sách phiếu nhập/xuất theo loại và trạng thái.",
        parameters: {
            type: "OBJECT",
            properties: {
                type: { type: "STRING", description: "import hoặc export." },
                status: { type: "STRING", description: "pending/received/inspecting/completed..." },
                limit: { type: "NUMBER", description: "Số lượng bản ghi, mặc định 10." }
            }
        }
    },
    roles: ["admin", "kho_manager", "production_manager"],
    execute: async (args = {}) => {
        const result = await getAllSlipsService({
            type: args.type,
            status: args.status,
            page: 1,
            limit: args.limit || 10,
            withTotal: true
        });
        if (!result?.success) return { error: result?.message || "Không thể lấy danh sách phiếu." };
        return result.data;
    }
};

