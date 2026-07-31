/**
 * APM Initialization — Al-Zahra Smart ERP
 * ==========================================
 * Plugs the logger into an APM backend at app startup.
 *
 * Currently ships with a lightweight IN-HOUSE adapter that:
 *  - Buffers errors in memory (last 50)
 *  - Exposes them via `getErrorLog()` for a dev overlay
 *  - Is structured to be swapped for Sentry with ONE line of code
 *
 * ## To enable Sentry (future):
 * 1. `npm install @sentry/react`
 * 2. Uncomment the Sentry block below
 * 3. Remove the InHouseAdapter section
 *
 * ## To enable Datadog RUM (future):
 * 1. `npm install @datadog/browser-rum`
 * 2. Uncomment the Datadog block below
 */

import { logger, APMAdapter, APMEvent } from './logger';

// ── In-House Error Buffer (zero external dependencies) ──────────────────────

const MAX_BUFFER_SIZE = 50;
const errorBuffer: APMEvent[] = [];

const inHouseAdapter: APMAdapter = {
    captureError(event: APMEvent) {
        errorBuffer.push(event);
        if (errorBuffer.length > MAX_BUFFER_SIZE) errorBuffer.shift();
    },
    captureEvent(event: APMEvent) {
        if (event.level === 'error' || event.level === 'warn') {
            errorBuffer.push(event);
            if (errorBuffer.length > MAX_BUFFER_SIZE) errorBuffer.shift();
        }
    },
};

/**
 * Returns the last N captured error events (useful for a dev overlay or
 * a future "Error Reporter" admin panel).
 */
export const getErrorLog = (limit = 20): APMEvent[] =>
    errorBuffer.slice(-limit);

/**
 * Clears the in-memory error buffer.
 */
export const clearErrorLog = (): void => {
    errorBuffer.length = 0;
};

// ── Sentry Adapter (uncomment when ready) ───────────────────────────────────
/*
import * as Sentry from '@sentry/react';

const sentryAdapter: APMAdapter = {
    captureError(event) {
        const err = new Error(event.error?.message ?? event.message);
        err.name = event.error?.name ?? 'AppError';
        Sentry.withScope((scope) => {
            scope.setContext('feature', { context: event.context });
            scope.setContext('session', event.sessionContext);
            if (event.data) scope.setContext('extra', event.data);
            Sentry.captureException(err);
        });
    },
    captureEvent(event) {
        Sentry.captureMessage(event.message, {
            level: event.level,
            extra: { ...event.data, context: event.context },
        });
    },
};
*/

// ── Datadog RUM Adapter (uncomment when ready) ───────────────────────────────
/*
import { datadogRum } from '@datadog/browser-rum';

const datadogAdapter: APMAdapter = {
    captureError(event) {
        datadogRum.addError(new Error(event.error?.message ?? event.message), {
            context: event.context,
            ...event.data,
        });
    },
};
*/

// ── Main init function ───────────────────────────────────────────────────────

interface InitAPMOptions {
    userId?: string;
    companyId?: string;
    companyName?: string;
}

/**
 * Call this ONCE in `useSystemInitialization()` (or at app root).
 * It wires the logger to the chosen APM adapter and sets session context.
 */
export function initAPM(options: InitAPMOptions = {}): void {
    // 1. Set session context so every log is enriched
    logger.setSessionContext({
        userId:      options.userId      ?? 'anonymous',
        companyId:   options.companyId   ?? 'unknown',
        companyName: options.companyName ?? 'unknown',
        appVersion:  import.meta.env.VITE_APP_VERSION ?? '0.0.0',
        env:         import.meta.env.MODE,
    });

    // 2. Wire adapter
    //    Swap `inHouseAdapter` with `sentryAdapter` or `datadogAdapter` when ready
    if (!(globalThis as any).__APM_INITIALIZED__) {
        logger.setApmAdapter(inHouseAdapter);

        logger.info('APM', 'APM initialized', {
            adapter: 'inHouse',
            env: import.meta.env.MODE,
        });
        (globalThis as any).__APM_INITIALIZED__ = true;
    }
}
