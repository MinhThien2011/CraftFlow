import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const modelConfig = {
  model: process.env.AI_MODEL_PRIMARY || "gemini-3-flash-preview",
  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 8192,
  },
};

export default ai;
