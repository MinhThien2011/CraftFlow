import ai, { modelConfig } from '../config/gemini.js';
import { getToolsForRole, executeTool } from '../tools/toolRegistry.js';
import { appLogger } from '../utils/appLogger.js';
import { evaluateChatGuard } from './guardService.js';
import { getQuerySchemaContext } from '../tools/queryTools.js';

const MAX_LOOPS = 5;
const STUCK_TOOL_LOOP_LIMIT = 2;
const AI_VERBOSE = process.env.AI_LOG_VERBOSE === 'true';
const AI_ERROR_STACK = process.env.AI_ERROR_STACK === 'true';

const runtimeMetrics = {
  totalRequests: 0,
  dslQueries: 0,
  clarifications: 0,
  rejectedByGuardrail: 0,
  dslDurations: [],
};

const getChunkParts = (chunk) => chunk?.candidates?.[0]?.content?.parts || [];

const getLatestUserText = (history) => {
  const lastUser = [...(Array.isArray(history) ? history : [])].reverse().find((m) => m?.role === 'user');
  if (!lastUser?.parts) return '';
  return lastUser.parts.map((p) => p?.text || '').join(' ').trim();
};

const collectTextFromStream = async (stream) => {
  let raw = '';
  for await (const chunk of stream) {
    const parts = getChunkParts(chunk);
    raw += parts.map((part) => part?.text || '').filter(Boolean).join('');
  }
  return raw;
};

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

const getModelChain = () => {
  const primary = process.env.AI_MODEL_PRIMARY || modelConfig.model;
  const fallbacks = String(process.env.AI_MODEL_FALLBACKS || 'gemini-3.1-flash-lite')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([primary, ...fallbacks])];
};

const getRetryAfterSeconds = (error) => {
  const msg = String(error?.message || '');
  const match = msg.match(/retry in\s+([\d.]+)s/i);
  return match ? Number(match[1]) : null;
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

const detectGuardViolation = async (latestUserText, user) => {
  const decision = await evaluateChatGuard({ text: latestUserText, user });
  if (!decision?.block) return null;
  return {
    type: decision.type || 'other',
    response: decision.response || 'Yeu cau nay khong phu hop theo chinh sach chat hien tai.',
  };
};

const buildSystemInstruction = (user) => ({
  role: 'user',
  parts: [{
    text: `Ban la tro ly AI cua he thong CraftFlow.
Thong tin nguoi dung: Ten: ${user.fullName || user.username}, Vai tro: ${user.role}.

Quy tac:
1. Chi tra loi cac van de lien quan den cong viec trong CraftFlow.
2. Khi hoi so lieu (don hang, ton kho, vat tu...), bat buoc dung tool, khong tu tao so lieu.
3. Neu intent la nguy co tre han/qua han/deadline risk thi uu tien goi tool get_at_risk_production_orders.
4. Neu user can truy van linh hoat theo thoi gian (ngay/thang/nam), uu tien dung query_business_data.
5. Neu tool loi hoac thieu du lieu, bao cao trung thuc.
6. Khong tra ve JSON tho tru khi nguoi dung yeu cau.
7. Mau tra loi:
Ket luan: <1-2 cau>
3 chi so:
- <chi so 1>
- <chi so 2>
- <chi so 3>
Ghi chu thoi gian cap nhat: <timestamp hoac "chua co timestamp tu nguon du lieu">`
  }]
});

const runLLMWithFallback = async ({ requestContents, tools, generationConfig }) => {
  const models = getModelChain();
  const maxAttempts = Math.max(1, Number(process.env.AI_FALLBACK_MAX_ATTEMPTS || models.length));
  let lastError = null;

  for (let i = 0; i < Math.min(models.length, maxAttempts); i++) {
    const model = models[i];
    try {
      if (AI_VERBOSE) appLogger.info('AI', 'model_attempt', { model, attempt: i + 1 });
      const stream = await ai.models.generateContentStream({
        model,
        contents: requestContents,
        tools,
        config: { generationConfig: generationConfig || modelConfig.generationConfig }
      });
      return { stream, model };
    } catch (error) {
      lastError = error;
      const errorType = classifyProviderError(error);
      appLogger.warn('AI', 'model_failed', {
        model,
        status: error?.status,
        type: errorType,
        retryAfterSec: getRetryAfterSeconds(error),
        message: error?.message?.slice?.(0, 180)
      });
      if (!shouldTryNextModel(error) || i === models.length - 1 || i + 1 >= maxAttempts) break;
      appLogger.info('AI', 'switch_model', { from: model, to: models[i + 1] });
    }
  }

  throw lastError || new Error('No AI model available');
};

const planIntent = async ({ userText, user }) => {
  const prompt = [
    {
      role: 'user',
      parts: [{
        text: `Phan loai intent cho yeu cau nguoi dung trong he thong ERP.
Tra ve JSON duy nhat:
{
  "intent": "operational_lookup|analytics_query|action_request|clarification_required",
  "reason": "string",
  "steps": ["step1","step2"],
  "missing_fields": ["field"],
  "suggested_options": ["opt1","opt2"]
}

Rule:
- Cac cau hoi thong ke theo ngay/thang/nam, tong hop, so sanh => analytics_query.
- Cac cau hoi thao tac cap nhat/approve/write => action_request.
- Neu mo ho thieu du lieu (timezone, metric, period) => clarification_required.
- Cac cau hoi tra cuu van hanh don gian => operational_lookup.
Tra ve JSON, khong giai thich them.`
      }]
    },
    {
      role: 'user',
      parts: [{ text: `role=${user.role}; message=${userText}` }]
    }
  ];

  try {
    const { stream } = await runLLMWithFallback({
      requestContents: prompt,
      tools: [],
      generationConfig: { temperature: 0, maxOutputTokens: 512 }
    });
    const raw = await collectTextFromStream(stream);
    const parsed = safeJsonParse(raw);
    if (parsed?.intent) {
      appLogger.info('AI', 'planner_decision', { intent: parsed.intent, reason: parsed.reason || '' });
      return parsed;
    }
  } catch (error) {
    appLogger.warn('AI', 'planner_failed', { message: error?.message });
  }

  const fallbackIntent = /(bao cao|thong ke|tong hop|so sanh|l[ịi]ch su|thang|nam|quy|ngay)/i.test(userText)
    ? 'analytics_query'
    : 'operational_lookup';
  const result = { intent: fallbackIntent, reason: 'planner_fallback', steps: ['route_by_keyword'] };
  appLogger.info('AI', 'planner_decision', { intent: result.intent, reason: result.reason });
  return result;
};

const normalizeBusinessAliases = (dsl) => {
  const out = { ...dsl };
  const metricField = String(out.metricField || out?.aggregation?.target_field || '').toLowerCase();
  if (metricField === 'doanh_thu_net' || metricField === 'net_revenue') out.metricField = 'totalAmount';
  if (metricField === 'doanh_thu_gross' || metricField === 'gross_revenue') out.metricField = 'totalAmount';

  out.filters = Array.isArray(out.filters) ? out.filters : [];
  const hasPendingExclusion = out.filters.some((f) => String(f.field) === 'status' && String(f.op) === 'not_eq' && String(f.value).toLowerCase() === 'pending');
  if (!hasPendingExclusion && /exclude\s+refund|loai\s+refund/i.test(JSON.stringify(dsl))) {
    out.filters.push({ field: 'status', op: 'not_eq', value: 'pending' });
  }

  return out;
};

const generateSemanticDsl = async ({ userText, user }) => {
  const schemaCtx = getQuerySchemaContext(user.role || 'staff');
  const prompt = [
    {
      role: 'user',
      parts: [{
        text: `Sinh DSL query v1 cho query_business_data. Khong duoc sinh SQL.
Schema output:
{
  "dataset":"string",
  "filters":[{"field":"string","op":"eq|in|not_eq|contains|gte|lte|between","value":any}],
  "aggregation":{"type":"count|sum","target_field":"string"},
  "groupBy":"string|null",
  "timeRange":{"from":"ISO","to":"ISO"},
  "limit":50
}
Rule alias:
- "thang nay" -> thoi gian tu ngay 1 den cuoi thang hien tai (UTC)
- "nam ngoai" -> nam truoc (UTC)
- "cung ky" -> so sanh cua cung period nam truoc, neu khong du thong tin thi clarification_required
- "quy 2" -> 01/04 -> 30/06
- "doanh thu/net/gross" map metric field phu hop trong schema cho phep
Chi tra ve JSON.`
      }]
    },
    {
      role: 'user',
      parts: [{ text: `role=${user.role}; message=${userText}; schema_context=${JSON.stringify(schemaCtx)}` }]
    }
  ];

  const { stream } = await runLLMWithFallback({
    requestContents: prompt,
    tools: [],
    generationConfig: { temperature: 0, maxOutputTokens: 900 }
  });
  const raw = await collectTextFromStream(stream);
  const parsed = safeJsonParse(raw);
  if (!parsed) {
    appLogger.warn('AI', 'dsl_rejected', { code: 'INVALID_DSL', reason: 'parse_failed' });
    return null;
  }
  const normalized = normalizeBusinessAliases(parsed);
  appLogger.info('AI', 'dsl_generated', { dataset: normalized.dataset || 'N/A', groupBy: normalized.groupBy || 'none' });
  return normalized;
};

const executeToolCalls = async ({ modelParts, user, toolResults }) => {
  const functionResponses = [];

  for (const part of modelParts) {
    if (!part?.functionCall) continue;
    const call = part.functionCall;
    const startedAt = Date.now();
    try {
      const result = await executeTool(call.name, call.args, user);
      toolResults.push({ name: call.name, args: call.args || {}, result, ts: new Date().toISOString() });
      functionResponses.push({
        functionResponse: {
          ...(call.id && { id: call.id }),
          name: call.name,
          response: { content: result }
        }
      });
      appLogger.info('AI', 'tool_call_done', { tool: call.name, tookMs: Date.now() - startedAt, ok: !result?.error });
    } catch (error) {
      toolResults.push({ name: call.name, args: call.args || {}, result: { error: error?.message || 'tool_failed' }, ts: new Date().toISOString() });
      functionResponses.push({
        functionResponse: {
          ...(call.id && { id: call.id }),
          name: call.name,
          response: { error: error?.message || 'tool_failed' }
        }
      });
      appLogger.warn('AI', 'tool_call_failed', { tool: call.name, message: error?.message });
    }
  }

  return functionResponses;
};

const summarizeFromTools = (toolResults) => {
  const last = [...toolResults].reverse();
  const atRisk = last.find((x) => x.name === 'get_at_risk_production_orders' && !x.result?.error);
  if (atRisk?.result) {
    const rows = Array.isArray(atRisk.result.orders) ? atRisk.result.orders.slice(0, 5) : [];
    const overdue = rows.filter((r) => r.riskLevel === 'overdue').length;
    const high = rows.filter((r) => r.riskLevel === 'high').length;
    const sample = rows.length ? rows.map((r) => `${r.orderCode} (${r.riskLevel}, deadline: ${r.deadline || 'N/A'})`).join('; ') : 'N/A';
    return [
      `Ket luan: Co ${atRisk.result.total || 0} don co nguy co tre han theo nguong ${atRisk.result.thresholdHours || 'N/A'} gio.`,
      '3 chi so:',
      `- Tong don nguy co: ${atRisk.result.total || 0} don`,
      `- Don da qua han: ${overdue} don`,
      `- Don canh bao cao: ${high} don`,
      `Ghi chu thoi gian cap nhat: ${atRisk.result.updatedAt || atRisk.result.now || 'chua co timestamp tu nguon du lieu'}`,
      rows.length ? `Danh sach mau: ${sample}` : 'Danh sach mau: N/A'
    ].join('\n');
  }

  const queryBiz = last.find((x) => x.name === 'query_business_data' && !x.result?.error);
  if (queryBiz?.result?.meta) {
    return [
      'Ket luan: Da tong hop du lieu linh hoat bang semantic query.',
      '3 chi so:',
      `- Dataset: ${queryBiz.result.meta.dataset || 'N/A'}`,
      `- So dong ket qua: ${queryBiz.result.meta.rowCount || 0}`,
      `- Metric: ${queryBiz.result.meta.metric || 'count'}`,
      `Ghi chu thoi gian cap nhat: ${queryBiz.result.meta.updatedAt || 'chua co timestamp tu nguon du lieu'}`
    ].join('\n');
  }

  const clarification = last.find((x) => x.name === 'ask_for_clarification' && !x.result?.error);
  if (clarification?.result?.clarification) {
    return clarification.result.clarification;
  }

  return [
    'Ket luan: Hien tai khong the tong hop du lieu do cac model va cong cu deu gap loi tam thoi.',
    '3 chi so:',
    '- Tool thanh cong: 0',
    `- So lan goi tool: ${toolResults.length}`,
    '- Trang thai: can thu lai',
    'Ghi chu thoi gian cap nhat: chua co timestamp tu nguon du lieu'
  ].join('\n');
};

const isFunctionCallPart = (part) => !!part?.functionCall;

const handleAnalyticsRoute = async ({ userText, user, toolResults }) => {
  const started = Date.now();
  const dsl = await generateSemanticDsl({ userText, user });
  if (!dsl) {
    const clarification = await executeTool('ask_for_clarification', {
      reason: 'Yeu cau chua du ro de tao DSL hop le.',
      missing_fields: ['dataset', 'timeRange'],
      suggested_options: ['Ban muon xem dataset nao?', 'Khoang thoi gian cu the theo UTC?']
    }, user);
    toolResults.push({ name: 'ask_for_clarification', args: {}, result: clarification, ts: new Date().toISOString() });
    runtimeMetrics.clarifications += 1;
    return summarizeFromTools(toolResults);
  }

  const result = await executeTool('query_business_data', dsl, user);
  toolResults.push({ name: 'query_business_data', args: dsl, result, ts: new Date().toISOString() });

  runtimeMetrics.dslQueries += 1;
  runtimeMetrics.dslDurations.push(Date.now() - started);

  if (result?.error) {
    if (result.error?.code === 'AMBIGUOUS_REQUEST' || result.error?.code === 'INVALID_DSL') {
      const clarification = await executeTool('ask_for_clarification', {
        reason: result.error.message,
        missing_fields: ['timeRange'],
        suggested_options: ['Cho ngay bat dau va ket thuc', 'Cho biet metric can thong ke']
      }, user);
      toolResults.push({ name: 'ask_for_clarification', args: {}, result: clarification, ts: new Date().toISOString() });
      runtimeMetrics.clarifications += 1;
      return summarizeFromTools(toolResults);
    }
    runtimeMetrics.rejectedByGuardrail += 1;
  }

  return summarizeFromTools(toolResults);
};

const logMetricsSnapshot = () => {
  const total = runtimeMetrics.totalRequests || 1;
  const dslPct = Math.round((runtimeMetrics.dslQueries / total) * 1000) / 10;
  const clarPct = Math.round((runtimeMetrics.clarifications / total) * 1000) / 10;
  const rejPct = Math.round((runtimeMetrics.rejectedByGuardrail / total) * 1000) / 10;
  const sorted = [...runtimeMetrics.dslDurations].sort((a, b) => a - b);
  const p95 = sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] : 0;

  appLogger.info('AI', 'metrics_snapshot', {
    totalRequests: runtimeMetrics.totalRequests,
    dslQueryPct: dslPct,
    clarificationPct: clarPct,
    rejectedPct: rejPct,
    dslP95Ms: p95,
  });
};

export const processChatMessageStream = async function* (history, user) {
  runtimeMetrics.totalRequests += 1;
  const normalizedHistory = Array.isArray(history) ? history : [];

  if (!user) {
    yield 'He thong: Vui long dang nhap de su dung tinh nang nay.';
    return;
  }

  const latestUserText = getLatestUserText(normalizedHistory);
  const guard = await detectGuardViolation(latestUserText, user);
  if (guard) {
    appLogger.warn('AI', 'guard_block', { type: guard.type, role: user.role });
    yield guard.response;
    logMetricsSnapshot();
    return;
  }

  const plan = await planIntent({ userText: latestUserText, user });
  const toolResults = [];

  try {
    if (plan.intent === 'clarification_required') {
      const clarification = await executeTool('ask_for_clarification', {
        reason: plan.reason || 'Can lam ro yeu cau de truy van chinh xac.',
        missing_fields: plan.missing_fields || [],
        suggested_options: plan.suggested_options || []
      }, user);
      toolResults.push({ name: 'ask_for_clarification', args: {}, result: clarification, ts: new Date().toISOString() });
      runtimeMetrics.clarifications += 1;
      yield summarizeFromTools(toolResults);
      logMetricsSnapshot();
      return;
    }

    if (plan.intent === 'action_request') {
      const clarification = await executeTool('ask_for_clarification', {
        reason: 'Yeu cau nay thuoc nhom thao tac cap nhat. Chat Agent hien chi ho tro tra cuu/read-only.',
        missing_fields: ['action_permission'],
        suggested_options: ['Ban muon xem du lieu truoc khi thao tac?', 'Ban co can admin xac nhan?']
      }, user);
      toolResults.push({ name: 'ask_for_clarification', args: {}, result: clarification, ts: new Date().toISOString() });
      runtimeMetrics.clarifications += 1;
      yield summarizeFromTools(toolResults);
      logMetricsSnapshot();
      return;
    }

    if (plan.intent === 'analytics_query') {
      const summary = await handleAnalyticsRoute({ userText: latestUserText, user, toolResults });
      yield summary;
      logMetricsSnapshot();
      return;
    }

    // operational_lookup: keep tool-calling loop with specialized tools
    const availableTools = getToolsForRole(user.role);
    const tools = availableTools.length > 0 ? [{ functionDeclarations: availableTools.map((t) => t.declaration) }] : [];
    const systemInstruction = buildSystemInstruction(user);

    let hasVisibleTextResponse = false;
    let noTextToolLoopCount = 0;

    for (let loopCount = 0; loopCount < MAX_LOOPS; loopCount++) {
      const requestContents = [systemInstruction, ...normalizedHistory];
      const { stream, model } = await runLLMWithFallback({ requestContents, tools });

      let isFunctionCall = false;
      const accumulatedModelParts = [];
      let fullTextResponse = '';

      for await (const chunk of stream) {
        const parts = getChunkParts(chunk);
        const text = parts.map((part) => (part?.thought ? '' : part?.text)).filter((x) => typeof x === 'string').join('');

        if (text) {
          fullTextResponse += text;
          hasVisibleTextResponse = true;
          yield text;
          accumulatedModelParts.push({ text });
        }

        const calls = parts.filter(isFunctionCallPart);
        if (calls.length > 0) {
          isFunctionCall = true;
          accumulatedModelParts.push(...calls);
        }
      }

      if (AI_VERBOSE) appLogger.info('AI', 'loop_result', { model, loop: loopCount + 1, textLength: fullTextResponse.length, isFunctionCall });

      if (isFunctionCall && accumulatedModelParts.length > 0) {
        normalizedHistory.push({ role: 'model', parts: accumulatedModelParts });
        const responses = await executeToolCalls({ modelParts: accumulatedModelParts, user, toolResults });
        normalizedHistory.push({ role: 'user', parts: responses });

        if (!fullTextResponse.trim()) {
          noTextToolLoopCount += 1;
          if (noTextToolLoopCount >= STUCK_TOOL_LOOP_LIMIT) {
            appLogger.warn('AI', 'stuck_detected', { loop: loopCount + 1, toolCalls: toolResults.length });
            yield summarizeFromTools(toolResults);
            logMetricsSnapshot();
            return;
          }
        } else {
          noTextToolLoopCount = 0;
        }
        continue;
      }

      if (fullTextResponse) {
        normalizedHistory.push({ role: 'model', parts: [{ text: fullTextResponse }] });
      }
      logMetricsSnapshot();
      return;
    }

    if (!hasVisibleTextResponse) {
      yield summarizeFromTools(toolResults);
    }
    logMetricsSnapshot();
  } catch (error) {
    appLogger.error('AI', 'chat_failed', {
      status: error?.status,
      type: classifyProviderError(error),
      retryAfterSec: getRetryAfterSeconds(error),
      message: error?.message?.slice?.(0, 220),
    });

    if (AI_ERROR_STACK && error?.stack) {
      appLogger.debug('AI', 'chat_failed_stack', { stack: error.stack.slice(0, 1200) });
    }

    yield summarizeFromTools(toolResults);
    logMetricsSnapshot();
  }
};
