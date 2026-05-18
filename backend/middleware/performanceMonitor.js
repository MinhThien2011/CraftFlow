const SLOW_REQUEST_MS = Number(process.env.SLOW_REQUEST_MS || 500);

export const performanceMonitor = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const writeHead = res.writeHead;

  res.writeHead = function patchedWriteHead(...args) {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    if (!res.headersSent) {
      res.setHeader('Server-Timing', `app;dur=${durationMs.toFixed(1)}`);
    }
    return writeHead.apply(this, args);
  };

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    if (durationMs >= SLOW_REQUEST_MS) {
      console.warn(`[SlowRequest] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`);
    }
  });

  next();
};
