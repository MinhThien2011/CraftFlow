import * as userService from '../services/userService.js';

export const searchUsers = {
    declaration: {
        name: "search_users",
        description: "Tìm kiếm thông tin người dùng trong hệ thống theo tên, email hoặc số điện thoại (Chỉ Admin mới dùng được).",
        parameters: {
            type: "OBJECT",
            properties: {
                query: {
                    type: "STRING",
                    description: "Tên, email hoặc số điện thoại cần tìm."
                },
                role: {
                    type: "STRING",
                    description: "Lọc theo vai trò (admin, kho_manager, production_manager, staff)."
                }
            },
            required: ["query"]
        }
    },
    roles: ['admin'],

    execute: async (args, user) => {
        try {
            const result = await userService.getUserByQuery(
                args.role ? { role: args.role } : {},
                1,
                5,
                args.query
            );

            if (!result.success) {
                return { error: result.message };
            }

            const formatted = result.data.users.map(u => ({
                fullName: u.fullName,
                username: u.username,
                role: u.role?.roleName,
                email: u.email,
                isActive: u.isActive
            }));

            return {
                results: formatted,
                message: formatted.length > 0 ? `Tìm thấy ${formatted.length} người dùng.` : "Không tìm thấy người dùng phù hợp."
            };
        } catch (error) {
            console.error('Error in searchUsers tool:', error);
            return { error: "Không thể tìm kiếm người dùng." };
        }
    }
};
