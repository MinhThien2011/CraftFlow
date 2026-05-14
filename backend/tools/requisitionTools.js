import * as requisitionService from '../services/materialRequisitionService.js';

export const getRequisitions = {
    declaration: {
        name: "get_requisitions",
        description: "Lấy danh sách các phiếu yêu cầu nguyên liệu (vật tư) từ sản xuất gửi lên kho.",
        parameters: {
            type: "OBJECT",
            properties: {
                status: {
                    type: "STRING",
                    description: "Trạng thái phiếu: 'pending' (chờ duyệt), 'approved' (đã duyệt), 'rejected' (đã từ chối), 'issued' (đã xuất kho)."
                },
                type: {
                    type: "STRING",
                    description: "Loại yêu cầu: 'normal' (thông thường), 'supplementary' (bổ sung), 'return' (hoàn trả)."
                }
            }
        }
    },
    roles: ['admin', 'kho_manager', 'production_manager'],

    execute: async (args, user) => {
        try {
            const result = await requisitionService.getRequisitions({
                status: args.status,
                type: args.type,
                limit: 10
            });

            if (result.status === 'error') {
                return { error: result.message };
            }

            const formatted = result.data.requisitions.map(r => ({
                id: r._id,
                code: r.requisitionCode,
                type: r.type,
                status: r.status,
                productionOrder: r.productionOrder?.orderCode,
                createdAt: new Date(r.createdAt).toLocaleDateString('vi-VN')
            }));

            return {
                total: result.data.pagination.total,
                requisitions: formatted,
                message: formatted.length > 0 ? "Đây là danh sách các phiếu yêu cầu vật tư." : "Không tìm thấy phiếu yêu cầu nào."
            };
        } catch (error) {
            console.error('Error in getRequisitions tool:', error);
            return { error: "Không thể lấy danh sách phiếu yêu cầu." };
        }
    }
};

export const getRequisitionDetails = {
    declaration: {
        name: "get_requisition_details",
        description: "Xem chi tiết một phiếu yêu cầu nguyên liệu cụ thể để biết danh sách vật tư cần lấy.",
        parameters: {
            type: "OBJECT",
            properties: {
                id: {
                    type: "STRING",
                    description: "ID của phiếu yêu cầu (ví dụ: 65f...)"
                }
            },
            required: ["id"]
        }
    },
    roles: ['admin', 'kho_manager', 'production_manager'],

    execute: async (args, user) => {
        try {
            const result = await requisitionService.getRequisitionById(args.id);

            if (result.status === 'error') {
                return { error: result.message };
            }

            const r = result.data;
            return {
                code: r.requisitionCode,
                status: r.status,
                items: r.items.map(i => ({
                    material: i.material?.name || i.materialName,
                    quantity: i.requestedQuantity,
                    unit: i.unit
                })),
                note: r.note
            };
        } catch (error) {
            console.error('Error in getRequisitionDetails tool:', error);
            return { error: "Không thể lấy chi tiết phiếu yêu cầu." };
        }
    }
};
