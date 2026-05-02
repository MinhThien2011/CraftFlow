import { AI_TOOLS } from './tools.js';
import { getSystemPrompt } from './prompts.js';
import User from '../models/User.js';

/**
 * AI Agent Service
 * Handles the logic of chatting, role validation, and tool execution.
 */
export const processAgentChat = async (userId, userRole, message) => {
    try {
        const user = await User.findById(userId);
        const fullName = user ? user.fullName : 'Người dùng';

        const systemPrompt = getSystemPrompt(userRole, fullName);

        // Note: In a real implementation, can call the Gemini API here.
        // For this module, we simulate the logic of identifying a tool call.

        console.log(`[AI Agent] User ${fullName} (${userRole}) sent: ${message}`);

        // 1. Logic identify tool call (Simulated for demonstration)
        // In reality, you'd send systemPrompt + message + tool definitions to Gemini
        let responseMessage = "";
        let toolOutput = null;

        if (message.toLowerCase().includes('đơn') && message.toLowerCase().includes('sản xuất')) {
            if (AI_TOOLS.get_production_summary.permissions.includes(userRole)) {
                toolOutput = await AI_TOOLS.get_production_summary.execute();
                responseMessage = `Dựa trên dữ liệu hệ thống, đây là thống kê các đơn hàng: ${toolOutput}`;
            } else {
                responseMessage = "Xin lỗi, bạn không có quyền xem thống kê sản xuất tổng thể.";
            }
        }
        else if (message.toLowerCase().includes('vật liệu') || message.toLowerCase().includes('hết hàng')) {
            if (AI_TOOLS.get_low_stock_materials.permissions.includes(userRole)) {
                toolOutput = await AI_TOOLS.get_low_stock_materials.execute();
                responseMessage = `Danh sách vật liệu sắp hết: ${toolOutput}`;
            } else {
                responseMessage = "Xin lỗi, bạn không có quyền xem dữ liệu tồn kho.";
            }
        }
        else if (message.toLowerCase().includes('thống kê') || message.toLowerCase().includes('tổng quan')) {
            if (AI_TOOLS.get_overview_stats.permissions.includes(userRole)) {
                toolOutput = await AI_TOOLS.get_overview_stats.execute();
                responseMessage = `Thống kê tổng quan hệ thống: ${toolOutput}`;
            } else {
                responseMessage = "Xin lỗi, bạn không có quyền xem thống kê tổng quan.";
            }
        }
        else if (message.toLowerCase().includes('yêu cầu') || message.toLowerCase().includes('cấp phát')) {
            if (AI_TOOLS.get_pending_requisitions.permissions.includes(userRole)) {
                toolOutput = await AI_TOOLS.get_pending_requisitions.execute();
                responseMessage = `Danh sách yêu cầu cấp phát đang chờ duyệt: ${toolOutput}`;
            } else {
                responseMessage = "Xin lỗi, bạn không có quyền xem yêu cầu cấp phát.";
            }
        }
        else if (message.toLowerCase().includes('hao hụt') || message.toLowerCase().includes('shrinkage')) {
            if (AI_TOOLS.get_pending_shrinkage_reports.permissions.includes(userRole)) {
                toolOutput = await AI_TOOLS.get_pending_shrinkage_reports.execute();
                responseMessage = `Danh sách báo cáo hao hụt đang chờ: ${toolOutput}`;
            } else {
                responseMessage = "Xin lỗi, bạn không có quyền xem báo cáo hao hụt.";
            }
        }
        else if (message.toLowerCase().includes('user') || message.toLowerCase().includes('người dùng') || message.toLowerCase().includes('nhân viên')) {
            if (AI_TOOLS.get_user_stats.permissions.includes(userRole)) {
                toolOutput = await AI_TOOLS.get_user_stats.execute();
                responseMessage = toolOutput;
            } else {
                responseMessage = "Xin lỗi, bạn không có quyền xem thông tin về người dùng trong hệ thống.";
            }
        }
        else if (message.toLowerCase().includes('công việc') || message.toLowerCase().includes('task')) {
            if (AI_TOOLS.get_my_tasks.permissions.includes(userRole)) {
                toolOutput = await AI_TOOLS.get_my_tasks.execute({}, userId);
                responseMessage = `Các công việc của bạn: ${toolOutput}`;
            } else {
                responseMessage = "Tôi có thể giúp gì cho bạn về công việc không?";
            }
        }
        else if (message.toLowerCase().includes('xóa') || message.toLowerCase().includes('drop')) {
            responseMessage = "Tôi không có quyền thực hiện các hành động nguy hiểm như xóa dữ liệu. Vui lòng liên hệ Admin kỹ thuật.";
        }
        else {
            responseMessage = `Chào ${fullName}, tôi là trợ lý CraftFlow. Bạn có thể hỏi tôi về tình trạng đơn hàng, vật liệu tồn kho hoặc các task được giao tùy theo quyền hạn của bạn.`;
        }

        return {
            status: 'success',
            message: responseMessage,
            data: {
                role: userRole,
                user: fullName
            }
        };

    } catch (error) {
        console.error('[AI Agent Service] Error:', error);
        return {
            status: 'error',
            message: 'Đã có lỗi xảy ra khi xử lý yêu cầu của bạn.',
            data: null
        };
    }
};
