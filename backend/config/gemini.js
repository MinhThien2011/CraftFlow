import { GoogleGenAI } from "@google/genai";

// Khởi tạo instance với API Key
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

export const modelConfig = {
    model: "gemini-3-flash-preview", // Sử dụng model như tài liệu bạn đưa
    generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
    }
};

export default ai;