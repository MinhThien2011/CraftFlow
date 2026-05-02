import * as productionOrderService from '../services/productionOrderService.js';
import * as materialService from '../services/materialService.js';
import * as dashboardService from '../services/dashboardService.js';
import * as shrinkageService from '../services/shrinkageService.js';
import * as materialRequisitionService from '../services/materialRequisitionService.js';
import * as userService from '../services/userService.js';
import { ROLES, SHRINKAGE_STATUS } from '../utils/constants.js';

/**
 * AI Tools Definition
 * Each tool has a name, description, parameters, and permission roles.
 */
export const AI_TOOLS = {
    get_user_stats: {
        description: 'Lấy thống kê số lượng người dùng trong hệ thống (chỉ dành cho Admin).',
        parameters: {},
        permissions: [ROLES.ADMIN],
        execute: async () => {
            const result = await userService.getUserByQuery({}, 1, 1);
            if (result.success) {
                return `Hiện có tổng cộng ${result.data.pagination.total} người dùng trong hệ thống.`;
            }
            return 'Không thể lấy dữ liệu người dùng.';
        }
    },
    get_overview_stats: {
        description: 'Lấy các chỉ số thống kê tổng quan của hệ thống (Vật liệu, Sản phẩm, Đơn hàng).',
        parameters: {},
        permissions: [ROLES.ADMIN, ROLES.PRODUCTION_MANAGER],
        execute: async () => {
            const result = await dashboardService.getOverviewStats();
            if (result.success) {
                return JSON.stringify(result.data);
            }
            return 'Không thể lấy dữ liệu thống kê tổng quan.';
        }
    },
    get_production_summary: {
        description: 'Lấy tóm tắt thống kê các đơn hàng đang sản xuất theo trạng thái.',
        parameters: {},
        permissions: [ROLES.ADMIN, ROLES.PRODUCTION_MANAGER, ROLES.PRODUCT_MANAGER],
        execute: async () => {
            const result = await productionOrderService.getProductionOrders({ limit: 100 });
            if (result.status === 'success') {
                const stats = result.data.orders.reduce((acc, order) => {
                    acc[order.status] = (acc[order.status] || 0) + 1;
                    return acc;
                }, {});
                return JSON.stringify(stats);
            }
            return 'Không thể lấy dữ liệu sản xuất.';
        }
    },
    get_low_stock_materials: {
        description: 'Lấy danh sách các vật liệu đang dưới mức tồn kho tối thiểu (low stock).',
        parameters: {},
        permissions: [ROLES.ADMIN, ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER],
        execute: async () => {
            const result = await materialService.getLowStockMaterialsService({});
            if (result.success) {
                // Ensure result.data is an array (it might be an object with pagination)
                const materials = Array.isArray(result.data) ? result.data : (result.data.materials || []);
                return JSON.stringify(materials.map(m => ({
                    name: m.name,
                    code: m.code,
                    currentStock: m.currentStock,
                    threshold: m.threshold,
                    unit: m.unit
                })));
            }
            return 'Không có vật liệu nào sắp hết hoặc không thể lấy dữ liệu.';
        }
    },
    get_pending_requisitions: {
        description: 'Lấy danh sách các yêu cầu cấp phát vật tư đang chờ duyệt.',
        parameters: {},
        permissions: [ROLES.ADMIN, ROLES.KHO_MANAGER, ROLES.PRODUCTION_MANAGER],
        execute: async () => {
            const result = await materialRequisitionService.getRequisitions({ status: 'pending' });
            if (result.status === 'success') {
                return JSON.stringify(result.data.requisitions.map(r => ({
                    code: r.requisitionCode,
                    order: r.productionOrder?.orderCode,
                    requestedBy: r.createdBy?.fullName,
                    itemsCount: r.items?.length,
                    createdAt: r.createdAt
                })));
            }
            return 'Không có yêu cầu cấp phát nào đang chờ.';
        }
    },
    get_pending_shrinkage_reports: {
        description: 'Lấy danh sách các báo cáo hao hụt đang chờ xử lý.',
        parameters: {},
        permissions: [ROLES.ADMIN],
        execute: async () => {
            const result = await shrinkageService.getShrinkageReports({ status: SHRINKAGE_STATUS.PENDING });
            if (result.status === 'success') {
                return JSON.stringify(result.data.map(r => ({
                    code: r.reportCode,
                    material: r.material?.name,
                    amount: r.shrinkageAmount,
                    reason: r.shrinkageReason,
                    createdBy: r.createdBy?.fullName
                })));
            }
            return 'Không có báo cáo hao hụt nào đang chờ.';
        }
    },
    get_my_tasks: {
        description: 'Lấy danh sách các công việc (assignments) được giao cho tôi (chỉ dành cho Staff).',
        parameters: {},
        permissions: [ROLES.STAFF],
        execute: async (args, userId) => {
            const result = await productionOrderService.getAssignments({ staffId: userId });
            if (result.status === 'success') {
                return JSON.stringify(result.data.assignments.map(a => ({
                    orderCode: a.productionOrder?.orderCode,
                    product: a.productName,
                    quantity: a.assignedQuantity,
                    status: a.status
                })));
            }
            return 'Bạn hiện không có công việc nào được giao.';
        }
    }
};
