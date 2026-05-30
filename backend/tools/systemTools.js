import Material from "../models/Material.js";
import Product from "../models/Product.js";
import ProductionOrder from "../models/ProductionOrder.js";
import MaterialRequisition from "../models/MaterialRequisition.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import InventoryImportExportSlip from "../models/InventoryImportExportSlip.js";
import Notification from "../models/Notification.js";
import SystemLog from "../models/SystemLog.js";

const buildRoleAwareSnapshot = async (role) => {
    const now = new Date();
    const base = {
        generatedAt: now.toISOString(),
        role,
    };

    const commonCounts = await Promise.all([
        Material.countDocuments({ isActive: true }),
        Product.countDocuments({ isActive: true }),
        ProductionOrder.countDocuments({}),
        ProductionOrder.countDocuments({ status: "in_production" }),
        MaterialRequisition.countDocuments({}),
        PurchaseOrder.countDocuments({}),
        InventoryImportExportSlip.countDocuments({}),
    ]);

    const [
        totalMaterials,
        totalProducts,
        totalProductionOrders,
        inProductionOrders,
        totalRequisitions,
        totalPurchaseOrders,
        totalSlips,
    ] = commonCounts;

    const response = {
        ...base,
        summary: {
            totalMaterials,
            totalProducts,
            totalProductionOrders,
            inProductionOrders,
            totalRequisitions,
            totalPurchaseOrders,
            totalSlips,
        },
    };

    if (role === "admin") {
        const [totalUsersNoti, unreadNoti, recentLogs] = await Promise.all([
            Notification.countDocuments({}),
            Notification.countDocuments({ isRead: false }),
            SystemLog.find({}).sort({ createdAt: -1 }).limit(5).select("action module createdAt").lean(),
        ]);
        response.admin = {
            notifications: { total: totalUsersNoti, unread: unreadNoti },
            recentSystemLogs: recentLogs,
        };
    } else if (role === "kho_manager") {
        const [pendingPO, pendingSlips] = await Promise.all([
            PurchaseOrder.countDocuments({ status: "pending" }),
            InventoryImportExportSlip.countDocuments({ status: { $in: ["pending", "received", "inspecting", "inspected"] } }),
        ]);
        response.warehouse = { pendingPO, pendingSlips };
    } else if (role === "production_manager") {
        const [pendingOrders, pendingReq] = await Promise.all([
            ProductionOrder.countDocuments({ status: { $in: ["pending", "materials_checking", "ready_to_assign", "in_production"] } }),
            MaterialRequisition.countDocuments({ status: { $in: ["pending", "approved", "accepted"] } }),
        ]);
        response.production = { pendingOrders, pendingReq };
    } else {
        const [myOpenOrders] = await Promise.all([
            ProductionOrder.countDocuments({ status: { $in: ["assigned", "in_production", "partially_complete"] } }),
        ]);
        response.staff = { myOpenOrders };
    }

    return response;
};

export const getSystemSnapshotTool = {
    declaration: {
        name: "get_system_snapshot",
        description: "Lấy snapshot tổng quan hệ thống theo quyền RBAC hiện tại để chat có số liệu toàn cục.",
        parameters: { type: "OBJECT", properties: {} },
    },
    roles: ["admin", "kho_manager", "production_manager", "staff"],
    execute: async (_args, user) => {
        try {
            return await buildRoleAwareSnapshot(user.role);
        } catch (error) {
            console.error("[getSystemSnapshotTool] error:", error);
            return { error: "Không thể lấy snapshot hệ thống." };
        }
    },
};

