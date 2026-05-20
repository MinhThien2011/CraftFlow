import ProductionOrder from '../models/ProductionOrder.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import InventoryImportExportSlip from '../models/InventoryImportExportSlip.js';
import MaterialRequisition from '../models/MaterialRequisition.js';
import { appLogger } from '../utils/appLogger.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const DATASET_CONFIG = {
  production_orders: {
    model: ProductionOrder,
    dateField: 'createdAt',
    requiredTimeFilter: false,
    roles: ['admin', 'production_manager'],
    fields: {
      status: { type: 'string', operators: ['eq', 'in', 'not_eq'] },
      priority: { type: 'string', operators: ['eq', 'in', 'not_eq'] },
      orderCode: { type: 'string', operators: ['eq', 'contains'] },
      createdAt: { type: 'date', operators: ['between', 'gte', 'lte'] },
      deadline: { type: 'date', operators: ['between', 'gte', 'lte'] },
      completedAt: { type: 'date', operators: ['between', 'gte', 'lte'] },
    },
    metricFields: ['actualCost', 'totalPlannedCost'],
    groupBy: ['status', 'priority', 'day', 'month'],
  },
  inventory_transactions: {
    model: InventoryTransaction,
    dateField: 'createdAt',
    requiredTimeFilter: true,
    roles: ['admin', 'production_manager', 'kho_manager'],
    fields: {
      type: { type: 'string', operators: ['eq', 'in', 'not_eq'] },
      orderRef: { type: 'string', operators: ['eq', 'contains'] },
      createdAt: { type: 'date', operators: ['between', 'gte', 'lte'] },
      quantity: { type: 'number', operators: ['eq', 'gte', 'lte'] },
    },
    metricFields: ['quantity'],
    groupBy: ['type', 'day', 'month'],
  },
  slips: {
    model: InventoryImportExportSlip,
    dateField: 'date',
    requiredTimeFilter: true,
    roles: ['admin', 'production_manager', 'kho_manager'],
    fields: {
      type: { type: 'string', operators: ['eq', 'in', 'not_eq'] },
      status: { type: 'string', operators: ['eq', 'in', 'not_eq'] },
      slipNumber: { type: 'string', operators: ['eq', 'contains'] },
      date: { type: 'date', operators: ['between', 'gte', 'lte'] },
      totalAmount: { type: 'number', operators: ['eq', 'gte', 'lte'] },
    },
    metricFields: ['totalAmount'],
    groupBy: ['type', 'status', 'day', 'month'],
  },
  requisitions: {
    model: MaterialRequisition,
    dateField: 'createdAt',
    requiredTimeFilter: true,
    roles: ['admin', 'production_manager', 'kho_manager'],
    fields: {
      type: { type: 'string', operators: ['eq', 'in', 'not_eq'] },
      status: { type: 'string', operators: ['eq', 'in', 'not_eq'] },
      requisitionCode: { type: 'string', operators: ['eq', 'contains'] },
      createdAt: { type: 'date', operators: ['between', 'gte', 'lte'] },
      completedAt: { type: 'date', operators: ['between', 'gte', 'lte'] },
    },
    metricFields: [],
    groupBy: ['type', 'status', 'day', 'month'],
  }
};

const makeError = (code, message, details = {}) => ({
  ok: false,
  error: { code, message, details }
});

const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

const normalizeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeDsl = (args = {}) => {
  const dataset = String(args.dataset || '').trim().toLowerCase();
  const metric = String(args.metric || args?.aggregation?.type || 'count').trim().toLowerCase();
  const metricField = String(args.metricField || args?.aggregation?.target_field || '').trim();
  const groupBy = args.groupBy ? String(args.groupBy).trim().toLowerCase() : null;
  const limit = Math.max(1, Math.min(MAX_LIMIT, Number(args.limit || DEFAULT_LIMIT)));

  const filters = Array.isArray(args.filters)
    ? args.filters
    : isObject(args.filters)
      ? Object.entries(args.filters).flatMap(([k, v]) => {
          if (k === 'from' || k === 'to' || k === 'timeRange') return [];
          if (Array.isArray(v)) return [{ field: k, op: 'in', value: v }];
          return [{ field: k, op: 'eq', value: v }];
        })
      : [];

  let timeRange = args.timeRange;
  if (!timeRange && isObject(args.filters) && (args.filters.from || args.filters.to)) {
    timeRange = { from: args.filters.from, to: args.filters.to };
  }
  if (!timeRange && args.from && args.to) {
    timeRange = { from: args.from, to: args.to };
  }

  return { dataset, metric, metricField, groupBy, limit, filters, timeRange };
};

const validateDsl = (dsl, user = {}) => {
  const cfg = DATASET_CONFIG[dsl.dataset];
  if (!cfg) return makeError('INVALID_DSL', `Dataset '${dsl.dataset}' khong hop le.`);

  const userRole = user.role || 'staff';
  if (userRole !== 'admin' && !cfg.roles.includes(userRole)) {
    return makeError('ROLE_DENIED', `Role '${userRole}' khong duoc truy cap dataset '${dsl.dataset}'.`);
  }

  if (!['count', 'sum'].includes(dsl.metric)) {
    return makeError('INVALID_DSL', `Metric '${dsl.metric}' khong hop le.`);
  }

  if (dsl.metric === 'sum' && !cfg.metricFields.includes(dsl.metricField)) {
    return makeError('FORBIDDEN_FIELD', `metricField '${dsl.metricField}' khong duoc phep.`);
  }

  if (dsl.groupBy && !cfg.groupBy.includes(dsl.groupBy)) {
    return makeError('FORBIDDEN_FIELD', `groupBy '${dsl.groupBy}' khong duoc phep.`);
  }

  let hasTimeFilter = false;
  for (const f of dsl.filters) {
    const field = String(f.field || '').trim();
    const op = String(f.op || '').trim().toLowerCase();
    if (!field || !op) return makeError('INVALID_DSL', 'Filter thieu field/op.');

    const fieldCfg = cfg.fields[field];
    if (!fieldCfg) return makeError('FORBIDDEN_FIELD', `Field '${field}' khong nam trong whitelist.`);
    if (!fieldCfg.operators.includes(op)) return makeError('FORBIDDEN_FIELD', `Operator '${op}' khong hop le cho field '${field}'.`);

    if (field === cfg.dateField || fieldCfg.type === 'date') hasTimeFilter = true;
  }

  if (dsl.timeRange) {
    const from = normalizeDate(dsl.timeRange.from);
    const to = normalizeDate(dsl.timeRange.to);
    if (!from || !to) return makeError('INVALID_DSL', 'timeRange khong hop le.');
    hasTimeFilter = true;
  }

  if (cfg.requiredTimeFilter && !hasTimeFilter) {
    return makeError('UNSAFE_QUERY', `Dataset '${dsl.dataset}' bat buoc co bo loc thoi gian.`);
  }

  return { ok: true, cfg, dsl: { ...dsl, hasTimeFilter } };
};

const applyTenantContext = (dsl, user = {}) => {
  const out = { ...dsl, filters: [...dsl.filters] };
  // Inject context constraints when available
  if (user.siteId) out.filters.push({ field: 'siteId', op: 'eq', value: user.siteId, _system: true });
  if (user.warehouseId && dsl.dataset === 'slips') out.filters.push({ field: 'warehouseId', op: 'eq', value: user.warehouseId, _system: true });
  return out;
};

const compileMatch = (dsl, cfg) => {
  const match = {};

  const appendCondition = (field, condition) => {
    if (!match[field]) {
      match[field] = condition;
      return;
    }
    if (isObject(match[field]) && isObject(condition)) {
      match[field] = { ...match[field], ...condition };
      return;
    }
    match[field] = condition;
  };

  for (const f of dsl.filters) {
    const field = f.field;
    const op = String(f.op || '').toLowerCase();
    const value = f.value;

    if (op === 'eq') appendCondition(field, value);
    else if (op === 'in') appendCondition(field, { $in: Array.isArray(value) ? value : [value] });
    else if (op === 'not_eq') appendCondition(field, { $ne: value });
    else if (op === 'contains') appendCondition(field, { $regex: String(value || ''), $options: 'i' });
    else if (op === 'gte') appendCondition(field, { $gte: cfg.fields[field]?.type === 'date' ? normalizeDate(value) : value });
    else if (op === 'lte') appendCondition(field, { $lte: cfg.fields[field]?.type === 'date' ? normalizeDate(value) : value });
    else if (op === 'between') {
      const from = normalizeDate(value?.[0] || value?.from || value?.start);
      const to = normalizeDate(value?.[1] || value?.to || value?.end);
      appendCondition(field, { $gte: from, $lte: to });
    }
  }

  if (dsl.timeRange?.from && dsl.timeRange?.to) {
    const from = normalizeDate(dsl.timeRange.from);
    const to = normalizeDate(dsl.timeRange.to);
    appendCondition(cfg.dateField, { $gte: from, $lte: to });
  }

  return { $match: match };
};

const compileGroup = (dsl, cfg) => {
  if (!dsl.groupBy) {
    return {
      _id: null,
      value: dsl.metric === 'sum' ? { $sum: `$${dsl.metricField}` } : { $sum: 1 },
      count: { $sum: 1 }
    };
  }

  let groupId;
  if (dsl.groupBy === 'day') {
    groupId = { $dateToString: { format: '%Y-%m-%d', date: `$${cfg.dateField}` } };
  } else if (dsl.groupBy === 'month') {
    groupId = { $dateToString: { format: '%Y-%m', date: `$${cfg.dateField}` } };
  } else {
    groupId = `$${dsl.groupBy}`;
  }

  return {
    _id: groupId,
    value: dsl.metric === 'sum' ? { $sum: `$${dsl.metricField}` } : { $sum: 1 },
    count: { $sum: 1 }
  };
};

const compileAggregate = (dsl, cfg) => {
  const stages = [];
  stages.push(compileMatch(dsl, cfg));
  stages.push({ $group: compileGroup(dsl, cfg) });
  return stages;
};

const compileSortLimit = (dsl) => {
  const stages = [];
  stages.push({ $sort: { _id: 1 } });
  stages.push({ $limit: dsl.limit });
  return stages;
};

const compilePipeline = (dsl, cfg) => {
  const pipeline = [...compileAggregate(dsl, cfg), ...compileSortLimit(dsl)];
  return pipeline;
};

const findAmbiguousReason = (dsl) => {
  if (!dsl.dataset) return 'Thieu dataset can truy van.';
  if (!dsl.timeRange && dsl.filters.length === 0) return 'Thieu bo loc. Ban muon xem khoang thoi gian nao?';
  return null;
};

export const getQuerySchemaContext = (role = 'staff') => {
  const entries = Object.entries(DATASET_CONFIG)
    .filter(([, cfg]) => role === 'admin' || cfg.roles.includes(role))
    .map(([name, cfg]) => ({
      dataset: name,
      allowedFields: Object.keys(cfg.fields),
      operatorsByField: Object.fromEntries(Object.entries(cfg.fields).map(([f, def]) => [f, def.operators])),
      groupBy: cfg.groupBy,
      metricFields: cfg.metricFields,
      dateField: cfg.dateField,
      requiredTimeFilter: cfg.requiredTimeFilter,
    }));
  return { datasets: entries };
};

export const queryBusinessDataTool = {
  declaration: {
    name: 'query_business_data',
    description: 'Semantic query DSL v1 cho bao cao/read-only. Dau vao: dataset, filters[], aggregation, groupBy, timeRange, limit.',
    parameters: {
      type: 'OBJECT',
      properties: {
        dataset: { type: 'STRING' },
        filters: { type: 'ARRAY' },
        aggregation: { type: 'OBJECT' },
        metric: { type: 'STRING' },
        metricField: { type: 'STRING' },
        groupBy: { type: 'STRING' },
        timeRange: { type: 'OBJECT' },
        limit: { type: 'NUMBER' }
      },
      required: ['dataset']
    }
  },
  roles: ['admin', 'production_manager', 'kho_manager'],
  execute: async (args = {}, user = {}) => {
    const startedAt = Date.now();
    const dsl = normalizeDsl(args);

    const ambiguousReason = findAmbiguousReason(dsl);
    if (ambiguousReason) {
      appLogger.warn('AI', 'dsl_rejected', { code: 'AMBIGUOUS_REQUEST', dataset: dsl.dataset || 'N/A' });
      return {
        error: {
          code: 'AMBIGUOUS_REQUEST',
          message: ambiguousReason,
          details: { suggestedAction: 'ask_for_clarification' }
        }
      };
    }

    const withContext = applyTenantContext(dsl, user);
    const validation = validateDsl(withContext, user);
    if (!validation.ok) {
      appLogger.warn('AI', 'dsl_rejected', { code: validation.error.code, dataset: dsl.dataset, reason: validation.error.message });
      return { error: validation.error };
    }

    try {
      appLogger.info('AI', 'dsl_validated', { dataset: dsl.dataset, metric: dsl.metric, groupBy: dsl.groupBy || 'none' });
      const pipeline = compilePipeline(validation.dsl, validation.cfg);
      appLogger.info('AI', 'compiler_done', { dataset: dsl.dataset, stages: pipeline.length });

      const rows = await validation.cfg.model.aggregate(pipeline);
      const durationMs = Date.now() - startedAt;
      appLogger.info('AI', 'executor_done', { dataset: dsl.dataset, rows: rows.length, durationMs });

      return {
        result: rows,
        meta: {
          dataset: dsl.dataset,
          appliedFilters: validation.dsl.filters,
          rowCount: rows.length,
          updatedAt: new Date().toISOString(),
          metric: dsl.metric,
          groupBy: dsl.groupBy,
          durationMs,
        }
      };
    } catch (error) {
      appLogger.error('TOOL', 'query_business_data_failed', { message: error?.message });
      return {
        error: {
          code: 'INVALID_DSL',
          message: 'Khong the thuc thi query voi DSL hien tai.',
          details: { raw: error?.message }
        }
      };
    }
  }
};

export const queryBusinessDataCompiler = {
  normalizeDsl,
  validateDsl,
  compileMatch,
  compileGroup,
  compileAggregate,
  compileSortLimit,
  compilePipeline,
};
