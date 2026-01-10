export type ValidationStatus = "CONFIRMED" | "INVALID" | "ERROR";

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

export interface Logger {
  level: LogLevel;
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface ValidationResult {
  status: ValidationStatus;
  provider: string;
  message?: string;
  raw?: unknown;
}

export interface ProviderContext {
  signal?: AbortSignal;
  timeoutMs?: number;
  logger?: Logger;
}

export interface ProviderPatterns {
  chave?: RegExp;
  pin?: RegExp;
  [key: string]: RegExp | undefined;
}

export interface Provider {
  name: string;
  patterns: ProviderPatterns;
  validate(chave: string, pin: string, context?: ProviderContext): Promise<ValidationResult>;
}

export interface ExtractedData {
  chave?: string;
  pin?: string;
  text?: string;
}

export interface ExtractAndValidateOptions extends ProviderContext {
  language?: string;
}

export interface ValidateInput {
  chave: string;
  pin: string;
}
