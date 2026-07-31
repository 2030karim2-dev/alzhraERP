/**
 * Unified Logger System — Al-Zahra Smart ERP
 * ============================================
 * Replaces scattered console.log/warn/error calls with a centralized,
 * configurable logger. Includes:
 *  - Structured log levels (debug / info / warn / error)
 *  - Deduplication via logOnce()
 *  - Session context enrichment
 *  - APM bridge (pluggable: Sentry, Datadog, custom endpoint)
 *  - Zero `any` — fully typed
 *
 * Usage:
 *   import { logger } from '@/core/utils/logger';
 *   logger.info('Auth', 'User logged in', { userId: '123' });
 *   logger.error('API', 'Failed to fetch data', error);
 */

// ── Types ────────────────────────────────────────────────────────────────────

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
    enabled: boolean;
    minLevel: LogLevel;
    includeTimestamp: boolean;
    /** Enable forwarding errors to the APM adapter */
    apmEnabled: boolean;
}

/** Structured payload forwarded to the APM adapter */
export interface APMEvent {
    level: LogLevel;
    context: string;
    message: string;
    data?: Record<string, unknown>;
    error?: { name: string; message: string; stack?: string };
    timestamp: string;
    sessionContext: Record<string, unknown>;
}

/**
 * APM Adapter interface — implement this to integrate Sentry, Datadog,
 * LogRocket, or a custom endpoint without touching the logger internals.
 *
 * @example
 * logger.setApmAdapter({
 *   captureEvent(event) {
 *     Sentry.captureMessage(event.message, { extra: event.data });
 *   },
 *   captureError(event) {
 *     Sentry.captureException(new Error(event.error?.message), { extra: event.data });
 *   },
 * });
 */
export interface APMAdapter {
    captureEvent?: (event: APMEvent) => void;
    captureError?: (event: APMEvent) => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info:  1,
    warn:  2,
    error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
    debug: '\x1b[36m', // Cyan
    info:  '\x1b[32m', // Green
    warn:  '\x1b[33m', // Yellow
    error: '\x1b[31m', // Red
};

const RESET_COLOR = '\x1b[0m';

// ── Logger class ─────────────────────────────────────────────────────────────

class Logger {
    private config: LoggerConfig = {
        enabled: true,
        minLevel: import.meta.env.PROD ? 'warn' : 'debug',
        includeTimestamp: true,
        apmEnabled: import.meta.env.PROD,
    };

    private loggedMessages = new Set<string>();
    private sessionContext: Record<string, unknown> = {};
    private apmAdapter: APMAdapter | null = null;

    // ── Public API ────────────────────────────────────────────────────────

    configure(config: Partial<LoggerConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Plug in an APM adapter (Sentry, Datadog, etc.).
     * Call this once at app startup after initializing your APM SDK.
     *
     * @example
     * import * as Sentry from '@sentry/react';
     * logger.setApmAdapter({
     *   captureError: (e) => Sentry.captureException(new Error(e.error?.message)),
     * });
     */
    setApmAdapter(adapter: APMAdapter): void {
        this.apmAdapter = adapter;
        this.config.apmEnabled = true;
    }

    /** Enrich every subsequent log with session-level metadata (userId, companyId, etc.) */
    setSessionContext(context: Record<string, unknown>): void {
        this.sessionContext = { ...this.sessionContext, ...context };
    }

    /** Log a message exactly once per session (useful for deprecation warnings) */
    logOnce(level: LogLevel, context: string, message: string, data?: unknown): void {
        const key = `${level}:${context}:${message}`;
        if (this.loggedMessages.has(key)) return;
        this.loggedMessages.add(key);
        this[level](context, message, data);
    }

    // ── Log level methods ─────────────────────────────────────────────────

    debug(context: string, message: string, data?: unknown): void {
        if (!this.shouldLog('debug')) return;
        const merged = this.merge(data);
        console.debug(`${LOG_COLORS.debug}${this.prefix('debug', context)}${RESET_COLOR}`, message, merged);
    }

    info(context: string, message: string, data?: unknown): void {
        if (!this.shouldLog('info')) return;
        const merged = this.merge(data);
        console.info(`${LOG_COLORS.info}${this.prefix('info', context)}${RESET_COLOR}`, message, merged);
    }

    warn(context: string, message: string, data?: unknown): void {
        if (!this.shouldLog('warn')) return;
        const merged = this.merge(data);
        console.warn(`${LOG_COLORS.warn}${this.prefix('warn', context)}${RESET_COLOR}`, message, merged);
    }

    error(context: string, message: string, error?: unknown): void {
        if (!this.shouldLog('error')) return;

        const errorDetails = this.extractError(error);
        const merged = { ...this.sessionContext, error: errorDetails };

        console.error(`${LOG_COLORS.error}${this.prefix('error', context)}${RESET_COLOR}`, message, merged);

        if (this.config.apmEnabled && this.apmAdapter) {
            const event: APMEvent = {
                level: 'error',
                context,
                message,
                timestamp: new Date().toISOString(),
                sessionContext: this.sessionContext,
                ...(errorDetails && { error: errorDetails }),
            };
            this.apmAdapter.captureError?.(event);
        }
    }

    // ── Performance helpers ───────────────────────────────────────────────

    trace(context: string, step: string, data?: unknown): void {
        if (!this.shouldLog('debug')) return;
        const merged = this.merge(data);
        console.info(`${LOG_COLORS.debug}${this.prefix('debug', context)}${RESET_COLOR} [TRACE]`, step, merged);
    }

    time(context: string, label: string): void {
        if (!this.shouldLog('debug')) return;
        console.time(`[${context}] ${label}`);
    }

    timeEnd(context: string, label: string): void {
        if (!this.shouldLog('debug')) return;
        console.timeEnd(`[${context}] ${label}`);
    }

    // ── Child logger ──────────────────────────────────────────────────────

    /** Create a child logger pre-bound to a context string */
    child(context: string): ContextLogger {
        return new ContextLogger(this, context);
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private shouldLog(level: LogLevel): boolean {
        if (!this.config.enabled) return false;
        return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
    }

    private prefix(level: LogLevel, context: string): string {
        const parts: string[] = [];
        if (this.config.includeTimestamp) parts.push(`[${new Date().toISOString()}]`);
        parts.push(`[${level.toUpperCase()}]`);
        parts.push(`[${context}]`);
        return parts.join(' ');
    }

    private merge(data?: unknown): Record<string, unknown> {
        if (data === undefined || data === null) return { ...this.sessionContext };
        if (typeof data === 'object' && !Array.isArray(data)) {
            return { ...this.sessionContext, ...(data as Record<string, unknown>) };
        }
        return { ...this.sessionContext, data };
    }

    private extractError(error: unknown): { name: string; message: string; stack?: string } | undefined {
        if (!error) return undefined;
        if (error instanceof Error) {
            const entry: { name: string; message: string; stack?: string } = {
                name: error.name,
                message: error.message,
            };
            if (error.stack) entry.stack = error.stack;
            return entry;
        }
        if (typeof error === 'string') {
            return { name: 'Error', message: error };
        }
        return { name: 'UnknownError', message: JSON.stringify(error) };
    }
}

// ── ContextLogger ─────────────────────────────────────────────────────────────

class ContextLogger {
    constructor(private readonly logger: Logger, private readonly context: string) {}

    debug(message: string, data?: unknown): void  { this.logger.debug(this.context, message, data); }
    info(message: string, data?: unknown): void   { this.logger.info(this.context, message, data); }
    warn(message: string, data?: unknown): void   { this.logger.warn(this.context, message, data); }
    error(message: string, error?: unknown): void { this.logger.error(this.context, message, error); }
    time(label: string): void                     { this.logger.time(this.context, label); }
    timeEnd(label: string): void                  { this.logger.timeEnd(this.context, label); }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const logger = new Logger();
export type { LogLevel, LoggerConfig };
