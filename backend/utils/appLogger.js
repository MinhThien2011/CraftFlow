const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const parseLevel = (value) => {
  const normalized = String(value || "info").toLowerCase();
  return Object.prototype.hasOwnProperty.call(LEVELS, normalized) ? normalized : "info";
};

const currentLevel = () => parseLevel(process.env.LOG_LEVEL);

const shouldLog = (level) => LEVELS[level] <= LEVELS[currentLevel()];

const serializeMeta = (meta = {}) =>
  Object.entries(meta)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(" ");

const write = (level, module, event, meta = {}) => {
  if (!shouldLog(level)) return;
  const ts = new Date().toISOString();
  const suffix = serializeMeta(meta);
  const line = `${ts} level=${level.toUpperCase()} module=${module} event=${event}${suffix ? ` ${suffix}` : ""}`;
  if (level === "error") process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);
};

export const appLogger = {
  error: (module, event, meta) => write("error", module, event, meta),
  warn: (module, event, meta) => write("warn", module, event, meta),
  info: (module, event, meta) => write("info", module, event, meta),
  debug: (module, event, meta) => write("debug", module, event, meta),
};

