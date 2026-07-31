import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import { logger } from './core/utils/logger';
import App from './App';
import { ReactQueryProvider } from './core/lib/react-query';
import { OfflineManager } from './core/services/OfflineManager';

// --- Production: Security & Error Masking ---
if (import.meta.env.PROD) {
  // 1. Suppress console.log and disable debug output to prevent data leakage
  console.log = () => { };
  console.debug = () => { };

  // 2. Intercept fetch to mask PG errors from Supabase RPC / PostgREST
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    if (
      !response.ok &&
      args[0] &&
      typeof args[0] === 'string' &&
      (args[0].includes('supabase') || args[0].includes('rest/v1') || args[0].includes('rpc/'))
    ) {
      // It's a failed Supabase request
      const cloned = response.clone();
      try {
        const data = await cloned.json();
        if (data && (data.code || data.message || data.details)) {
          // Log silently
          logger.error('DB_ERROR_SILENT', 'Underlying database error intercepted', data);

          // Modify the response body to return a generic message
          data.message = "حدث خطأ غير متوقع أثناء معالجة البيانات، المرجو المحاولة لاحقاً.";
          return new Response(JSON.stringify(data), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    return response;
  };
}

// --- Development Mode: Warn about console.log usage ---
// In development, warn developers to use logger instead of console.log
if (import.meta.env.DEV) {
  const originalLog = console.log;
  const originalDebug = console.debug;

  console.log = (...args: unknown[]) => {
    const stack = new Error().stack || '';
    const isFromLogger = stack.includes('logger.ts');
    const isInternal = stack.includes('vite') || stack.includes('hmr') || stack.includes('node_modules');

    if (!isFromLogger && !isInternal && args.length > 0 && typeof args[0] === 'string' && !args[0].includes('[TEST]')) {
      console.warn('[DEV WARNING] Use logger.info() instead of console.log():', args[0]);
    }
    originalLog.apply(console, args);
  };

  console.debug = (...args: unknown[]) => {
    const stack = new Error().stack || '';
    const isFromLogger = stack.includes('logger.ts');
    const isInternal = stack.includes('vite') || stack.includes('hmr') || stack.includes('node_modules');

    if (!isFromLogger && !isInternal && args.length > 0 && typeof args[0] === 'string') {
      console.warn('[DEV WARNING] Use logger.debug() instead of console.debug():', args[0]);
    }
    originalDebug.apply(console, args);
  };
}

// ----------------------------------------
// This ensures that any previous buggy service workers are removed immediately
// to prevent "Failed to fetch" errors caused by SW interception.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  try {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.unregister().catch((err: Error) => {
          logger.warn('SW', 'unregister failed', err);
        });
      }
    }).catch((err: Error) => {
      // This catch block handles "The document is in an invalid state" error
      // which can happen during rapid reloads or specific browser states
      logger.warn('SW', 'access failed', err);
    });
  } catch (e) {
    logger.warn('SW', 'not supported or access denied', e);
  }
}

import { ErrorBoundary } from './core/components/ErrorBoundary';

const rootElement = document.querySelector('#root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ReactQueryProvider>
        <OfflineManager />
        <App />
      </ReactQueryProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
