/**
 * Logger centralizado para o Teggram-X.
 *
 * Em produção o esbuild remove todas as chamadas de console (drop: ['console']),
 * mas usar este wrapper mantém o código limpo e permite controlar o nível de log
 * via variável de ambiente VITE_LOG_LEVEL (debug, info, warn, error, none).
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

function getLogLevel(): LogLevel {
  const env = (import.meta.env.VITE_LOG_LEVEL as string | undefined)?.toLowerCase();
  if (env && env in LEVEL_ORDER) return env as LogLevel;
  return import.meta.env.DEV ? 'debug' : 'warn';
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[getLogLevel()];
}

function formatArgs(scope: string, args: unknown[]): unknown[] {
  return scope ? [`[${scope}]`, ...args] : args;
}

export const logger = {
  debug: (scope: string, ...args: unknown[]) => {
    if (shouldLog('debug')) console.debug(...formatArgs(scope, args));
  },
  info: (scope: string, ...args: unknown[]) => {
    if (shouldLog('info')) console.info(...formatArgs(scope, args));
  },
  log: (scope: string, ...args: unknown[]) => {
    if (shouldLog('info')) console.log(...formatArgs(scope, args));
  },
  warn: (scope: string, ...args: unknown[]) => {
    if (shouldLog('warn')) console.warn(...formatArgs(scope, args));
  },
  error: (scope: string, ...args: unknown[]) => {
    if (shouldLog('error')) console.error(...formatArgs(scope, args));
  },
};

export type Logger = typeof logger;
