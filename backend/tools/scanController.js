import * as myService from '../services/myService.js';

export const myNewTool = {
    declaration: {
        name: "tên_tool_viết_thường_có_gạch_dưới",
        description: "Mô tả bằng tiếng Việt để AI biết khi nào nên dùng tool này",
        parameters: {
            type: "OBJECT",
            properties: {
                param1: { type: "STRING", description: "Mô tả tham số" }
            }
        }
    },
    roles: ['admin', 'kho_manager'],

    execute: async (args, user) => {
        const result = await myService.someFunction(args.param1);
        return result;
    }
};