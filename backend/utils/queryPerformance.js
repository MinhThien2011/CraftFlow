export const QUERY_MAX_TIME_MS = Number(process.env.MONGO_QUERY_MAX_TIME_MS || 8000);

export const applyQueryGuards = (query) => query.maxTimeMS(QUERY_MAX_TIME_MS);

export const applyAggregateGuards = (aggregate) =>
  aggregate
    .allowDiskUse(true)
    .option({ maxTimeMS: QUERY_MAX_TIME_MS });
