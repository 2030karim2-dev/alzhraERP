import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import { logger } from './core/utils/logger';
import App from './App';
import { ReactQueryProvider } from './core/lib/react-query';
import { OfflineManager } from './core/services/OfflineManager';
import { isSupabaseConfigured, SUPABASE_CONFIG_ERROR } from './lib/supabaseClient';

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

          // احتفظ برسائل استثناءات دوالنا الداخلية العربية (RAISE EXCEPTION '...')
          // فهي مقصودة ومفهومة للمستخدم (مثل 'لا يوجد مستودع للفرع')،
          // وقم فقط بتغطية الأخطاء التقنية الداخلية (Postgres/PostgREST بالإنجليزية).
          if (!/[\u0600-\u06FF]/.test(String(data.message ?? ''))) {
            // Modify the response body to return a generic message
            data.message = "حدث خطأ غير متوقع أثناء معالجة البيانات، المرجو المحاولة لاحقاً.";
          }
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

// ── Supabase setup-error screen ────────────────────────────────────────────────
// Shown instead of the app when Supabase env vars are missing/invalid OUTSIDE
// unit tests, so a misconfigured deployment can never silently run on a mock
// client (empty data / fake success). Unit tests (MODE='test') still use the
// mock client declared in supabaseClient.ts.
const SupabaseSetupErrorScreen: React.FC = () => (
  <div dir="rtl" style={{
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0f172a', color: '#e2e8f0', fontFamily: 'Tajawal, Cairo, system-ui, sans-serif', padding: 24,
  }}>
    <div style={{ maxWidth: 520, background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 32 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 12px', color: '#f8fafc' }}>تعذر الاتصال بقاعدة البيانات</h1>
      <p style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line', margin: '0 0 16px' }}>{SUPABASE_CONFIG_ERROR}</p>
      <code dir="ltr" style={{ display: 'block', background: '#0f172a', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#93c5fd', marginBottom: 16 }}>
        cp .env.example .env
      </code>
      <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>إذا كنت المطوّر، راجع README أو اتصل بمسؤول النظام.</p>
    </div>
  </div>
);

const rootElement = document.querySelector('#root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

if (!isSupabaseConfigured && import.meta.env.MODE !== 'test') {
  root.render(
    <React.StrictMode>
      <SupabaseSetupErrorScreen />
    </React.StrictMode>
  );
} else {
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
}
