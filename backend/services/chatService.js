import ai, { modelConfig } from '../config/gemini.js';
import { getToolsForRole, executeTool } from '../tools/toolRegistry.js';

const getChunkParts = (chunk) => {
    if (!chunk) return [];
    return chunk.candidates?.[0]?.content?.parts || [];
};

export const processChatMessageStream = async function* (history, user) {
    if (!Array.isArray(history)) {
        history = [];
    }

    if (!user) {
        yield "Hệ thống: Vui lòng đăng nhập để sử dụng tính năng này.";
        return;
    }

    const availableTools = getToolsForRole(user.role);
    const tools = availableTools.length > 0
        ? [{ functionDeclarations: availableTools.map(t => t.declaration) }]
        : [];

    // GIỮ NGUYÊN PROMPT HỆ THỐNG CỦA BẠN
    const systemInstructionContent = {
        role: 'user',
        parts: [{
            text: `Bạn là trợ lý AI chuyên nghiệp của hệ thống CraftFlow (Quản lý sản xuất & kho hàng).
Thông tin người dùng: Tên: ${user.fullName || user.username}, Vai trò: ${user.role}.

Quy tắc:
1. Chỉ trả lời các vấn đề liên quan đến công việc, sản xuất, tồn kho và quy trình trong CraftFlow.
2. Khi người dùng hỏi về số liệu (đơn hàng, tồn kho, vật tư...), BẮT BUỘC phải sử dụng các công cụ (tools) được cung cấp. Tuyệt đối KHÔNG TỰ BỊA RA SỐ LIỆU.
2.1. Nếu câu hỏi liên quan "hôm nay", ưu tiên gọi tool chuyên biệt theo ngày (ví dụ get_today_production_summary) trước khi kết luận.
3. Nếu công cụ trả về lỗi hoặc không có dữ liệu, hãy báo cáo trung thực cho người dùng.
4. BẮT BUỘC dùng đúng mẫu cố định dưới đây cho mọi câu trả lời dữ liệu:
Kết luận: <1-2 câu ngắn>
3 chỉ số:
- <Chỉ số 1: giá trị + đơn vị>
- <Chỉ số 2: giá trị + đơn vị>
- <Chỉ số 3: giá trị + đơn vị>
Ghi chú thời gian cập nhật: <thời gian từ dữ liệu/tool, nếu thiếu thì ghi "chưa có timestamp từ nguồn dữ liệu">
5. Không trả về JSON thô trừ khi người dùng yêu cầu. Luôn diễn giải dữ liệu theo ngôn ngữ tự nhiên.
6. Nếu thiếu dữ liệu cho đủ 3 chỉ số thì vẫn giữ đúng mẫu, dùng "N/A" cho chỉ số thiếu.
7. Từ chối lịch sự các yêu cầu ngoài phạm vi công việc hoặc không có trong quyền hạn của vai trò hiện tại.` }]
    };

    let currentModel = modelConfig.model;
    const fallbackModel = "gemini-2.0-flash"; // Model dự phòng
    let hasVisibleTextResponse = false;

    try {
        let keepLooping = true;
        let loopCount = 0;
        const MAX_LOOPS = 5;

        while (keepLooping && loopCount < MAX_LOOPS) {
            loopCount++;

            const requestContents = [systemInstructionContent, ...history];
            let result;

            try {
                // Gọi API với model hiện tại
                result = await ai.models.generateContentStream({
                    model: currentModel,
                    contents: requestContents,
                    tools: tools,
                    config: {
                        generationConfig: modelConfig.generationConfig
                    }
                });
            } catch (error) {
                // LOG VÀ FALLBACK KHI QUÁ TẢI (503)
                const isOverloaded = error.status === 503 || error.message?.includes("503");
                
                if (isOverloaded && currentModel !== fallbackModel) {
                    console.error(`⚠️ [AI] Model ${currentModel} quá tải. Đang tự động chuyển sang: ${fallbackModel}`);
                    currentModel = fallbackModel;
                    
                    // Thử lại ngay lập tức với model dự phòng
                    result = await ai.models.generateContentStream({
                        model: currentModel,
                        contents: requestContents,
                        tools: tools,
                        config: { generationConfig: modelConfig.generationConfig }
                    });
                } else {
                    throw error; // Nếu lỗi khác hoặc fallback cũng lỗi thì ném lỗi
                }
            }

            if (!result) throw new Error("Không thể khởi tạo luồng dữ liệu từ Gemini API.");

            let isFunctionCall = false;
            let accumulatedModelParts = [];
            let fullTextResponse = "";

            // Xử lý luồng stream
            for await (const chunk of result) {
                if (!chunk) continue;
                const parts = getChunkParts(chunk);

                // Lấy văn bản
                try {
                    const text = parts
                        .map(part => (part?.thought ? '' : part?.text))
                        .filter(textPart => typeof textPart === 'string')
                        .join('');
                    if (text) {
                        fullTextResponse += text;
                        yield text;
                        hasVisibleTextResponse = true;
                        accumulatedModelParts.push({ text });
                    }
                } catch (e) {}

                // Lấy function calls
                try {
                    const calls = parts.filter(part => part?.functionCall);
                    if (calls && calls.length > 0) {
                        isFunctionCall = true;
                        calls.forEach(part => {
                            accumulatedModelParts.push(part);
                        });
                    }
                } catch (e) {}
            }

            if (isFunctionCall && accumulatedModelParts.length > 0) {
                // Lưu yêu cầu gọi hàm vào history
                history.push({ role: 'model', parts: accumulatedModelParts });

                const functionResponses = [];
                for (const part of accumulatedModelParts) {
                    if (part.functionCall) {
                        const call = part.functionCall;
                        try {
                            console.log(`[AI] Calling tool: ${call.name} with args:`, call.args);
                            const toolResult = await executeTool(call.name, call.args, user);

                            functionResponses.push({
                                functionResponse: {
                                    ...(call.id && { id: call.id }),
                                    name: call.name,
                                    response: { content: toolResult } // Bọc kết quả vào object để tránh lỗi format
                                }
                            });
                        } catch (error) {
                            console.error(`[AI] Tool execution error (${call.name}):`, error);
                            functionResponses.push({
                                functionResponse: {
                                    ...(call.id && { id: call.id }),
                                    name: call.name,
                                    response: { error: error.message }
                                }
                            });
                        }
                    }
                }
                // Lưu kết quả của các hàm vào history
                history.push({ role: 'user', parts: functionResponses });
            } else {
                // Lưu câu trả lời văn bản cuối cùng
                if (fullTextResponse) {
                    history.push({ role: 'model', parts: [{ text: fullTextResponse }] });
                }
                keepLooping = false;
            }
        }

        if (!hasVisibleTextResponse) {
            const fallbackText = "Tôi đã xử lý yêu cầu và truy vấn dữ liệu thành công, nhưng chưa tổng hợp được câu trả lời hiển thị. Anh vui lòng hỏi lại cùng nội dung, tôi sẽ trả về theo dạng tóm tắt rõ ràng."
            history.push({ role: 'model', parts: [{ text: fallbackText }] });
            yield fallbackText;
        }
    } catch (error) {
        console.error("[AI] processChatMessageStream error:", error);
        // Hiển thị thông báo thân thiện dựa trên loại lỗi
        if (error.status === 503) {
            yield "Hệ thống AI hiện đang quá tải (503). Bạn vui lòng thử lại sau giây lát.";
        } else {
            yield "Xin lỗi, tôi gặp lỗi kỹ thuật khi xử lý yêu cầu của bạn.";
        }
    }
};
