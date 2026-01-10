export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

export interface Logger {
  level: LogLevel;
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

const noop = (): void => undefined;

export const noopLogger: Logger = {
  level: "silent",
  debug: noop,
  info: noop,
  warn: noop,
  error: noop
};

export function createConsoleLogger(level: LogLevel = "info"): Logger {
  const order: LogLevel[] = ["debug", "info", "warn", "error", "silent"];
  const threshold = order.indexOf(level);

  const shouldLog = (l: LogLevel) => order.indexOf(l) >= threshold && level !== "silent";

  const make = (l: LogLevel, fn: (msg?: unknown, ...args: unknown[]) => void) =>
    (message: string, meta?: Record<string, unknown>) => {
      if (!shouldLog(l)) return;
      if (meta && Object.keys(meta).length) {
        fn(message, meta);
      } else {
        fn(message);
      }
    };

  return {
    level,
    debug: make("debug", console.debug),
    info: make("info", console.info),
    warn: make("warn", console.warn),
    error: make("error", console.error)
  };
}

export function resolveLogger(logger?: Logger): Logger {
  return logger ?? noopLogger;
}
