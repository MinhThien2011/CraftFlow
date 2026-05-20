import ai, { modelConfig } from '../config/gemini.js';
import { appLogger } from '../utils/appLogger.js';

const safeJsonParse = (text) => {
  if (!text) return null;
  const trimmed = String(text).trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenceMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i) || trimmed.match(/```([\s\S]*?)```/);
    if (!fenceMatch) return null;
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      return null;
    }
  }
};

const getChunkParts = (chunk) => chunk?.candidates?.[0]?.content?.parts || [];

const getModelChain = () => {
  const primary = process.env.AI_GUARD_MODEL_PRIMARY || process.env.AI_MODEL_PRIMARY || modelConfig.model;
  const fallbackStr = process.env.AI_GUARD_MODEL_FALLBACKS || process.env.AI_MODEL_FALLBACKS || 'gemini-2.0-flash';
  const fallbacks = String(fallbackStr)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([primary, ...fallbacks])];
};

const classifyProviderError = (error) => {
  const status = Number(error?.status || error?.code || 0);
  const message = String(error?.message || '').toLowerCase();
  if (status === 503 || message.includes('overload') || message.includes('unavailable')) return 'overload';
  if (status === 429 || message.includes('quota') || message.includes('rate limit') || message.includes('resource_exhausted')) return 'quota';
  return 'other';
};

const shouldTryNextModel = (error) => {
  const kind = classifyProviderError(error);
  return kind === 'overload' || kind === 'quota';
};

const runGuardClassifier = async ({ text, user }) => {
  const models = getModelChain();
  const maxAttempts = Math.max(1, Number(process.env.AI_GUARD_MAX_ATTEMPTS || process.env.AI_FALLBACK_MAX_ATTEMPTS || models.length));
  const policyExtra = process.env.AI_GUARD_POLICY || '';
  let lastError = null;

  for (let i = 0; i < Math.min(models.length, maxAttempts); i++) {
    const model = models[i];
    try {
      const prompt = [
        {
          role: 'user',
          parts: [{
            text: `Ban la guard policy engine cho chat noi bo cua CraftFlow.
Tra ve JSON DUY NHAT voi schema:
{
  "block": boolean,
  "type": "allow|profanity|role_mismatch|security|other",
  "confidence": number,
  "response": "string"
}
Rule:
1) Neu user nhan tin tuc/chui boi: block=true, type=profanity.
2) Neu request vuot quyen role hien tai: block=true, type=role_mismatch.
3) Neu request nguy hiem/an ninh: block=true, type=security.
4) Neu hop le: block=false, type=allow, response="".
5) Khi block do profanity, response phai nhan manh nghiem tuc lich su + chen cau "chua TAY dau".
6) Khong giai thich dai dong, chi tra ve JSON.
${policyExtra ? `7) Policy bo sung: ${policyExtra}` : ''}`
          }]
        },
        {
          role: 'user',
          parts: [{
            text: `Context:
- userRole: ${user?.role || 'unknown'}
- userName: ${user?.username || 'unknown'}
- message: ${text}`
          }]
        }
      ];

      const stream = await ai.models.generateContentStream({
        model,
        contents: prompt,
        config: { generationConfig: { temperature: 0, maxOutputTokens: 512 } }
      });

      let raw = '';
      for await (const chunk of stream) {
        const parts = getChunkParts(chunk);
        raw += parts.map((part) => part?.text || '').filter(Boolean).join('');
      }

      const parsed = safeJsonParse(raw);
      if (parsed && typeof parsed.block === 'boolean') {
        return { ...parsed, classifierAvailable: true };
      }
      appLogger.warn('AI', 'guard_parse_failed', { model, raw: raw.slice(0, 220) });
    } catch (error) {
      lastError = error;
      appLogger.warn('AI', 'guard_model_failed', { model, status: error?.status, message: error?.message?.slice?.(0, 160) });
      if (!shouldTryNextModel(error)) break;
    }
  }

  if (lastError) {
    appLogger.warn('AI', 'guard_classifier_unavailable', { reason: 'model_failed' });
  }
  return { block: false, type: 'allow', confidence: 0, classifierAvailable: false };
};

export const evaluateChatGuard = async ({ text, user }) => {
  const cleanText = String(text || '').trim();
  if (!cleanText) return { block: false, type: 'allow', confidence: 0 };

  const decision = await runGuardClassifier({ text: cleanText, user });
  if (decision.classifierAvailable) return decision;

  const failClosed = process.env.AI_GUARD_FAIL_CLOSED === 'true';
  if (!failClosed) return { block: false, type: 'allow', confidence: 0 };

  appLogger.warn('AI', 'guard_fail_closed_block', { role: user?.role || 'unknown' });
  return {
    block: true,
    type: 'guard_unavailable',
    confidence: 0,
    response: 'He thong kiem duyet tam thoi khong san sang, nen yeu cau duoc tam khoa de dam bao an toan. Vui long thu lai sau.',
  };
};

