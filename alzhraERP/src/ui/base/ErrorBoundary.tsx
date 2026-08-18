import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../core/utils/logger';

/** مفتاح localStorage لتخزين سجل الأخطاء */
const ERROR_LOG_KEY = 'app_error_log';
const MAX_ERROR_LOG = 10;

function logErrorToStorage(error: Error, errorInfo: ErrorInfo): void {
  try {
    const existing = JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || '[]');
    const entry = {
      message: error.message,
      stack: error.stack?.slice(0, 500) || '',
      componentStack: errorInfo.componentStack?.slice(0, 500) || '',
      time: new Date().toISOString(),
      url: window.location.href,
    };
    existing.unshift(entry);
    if (existing.length > MAX_ERROR_LOG) existing.pop();
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(existing));
  } catch { /* noop - localStorage قد يكون ممتلئاً */ }
}

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  autoReloadSeconds: number;
}

/**
 * Standard React Error Boundary.
 * Provides a fallback UI with retry, copy error details, and component stack.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
    autoReloadSeconds: 8,
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error("ErrorBoundary", "Uncaught error:", [error, errorInfo]);
    logErrorToStorage(error, errorInfo);
    this.setState({ error, errorInfo, autoReloadSeconds: 8 });

    // إعادة تحميل تلقائية بعد 8 ثواني للأخطاء الحرجة
    if (typeof window !== 'undefined') {
      const countdownInterval = setInterval(() => {
        this.setState(prev => {
          const next = prev.autoReloadSeconds - 1;
          if (next <= 0) {
            clearInterval(countdownInterval);
            try { window.location.reload(); } catch { /* noop */ }
            return { autoReloadSeconds: 0 };
          }
          return { autoReloadSeconds: next };
        });
      }, 1000);
    }
  }

  private copyErrorDetails(): void {
    const { error, errorInfo } = this.state;
    const details = [
      `Error: ${error?.message ?? 'Unknown'}`,
      `Stack: ${error?.stack ?? 'N/A'}`,
      `Component Stack: ${errorInfo?.componentStack ?? 'N/A'}`,
      `Time: ${new Date().toISOString()}`,
    ].join('\n\n');
    navigator.clipboard.writeText(details).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }).catch(() => {
      // Fallback: select text for manual copy
    });
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
      const texts = {
        ar: {
          title: "عذراً، حدث خطأ غير متوقع.",
          message: "واجه التطبيق مشكلة تمنعه من العمل بشكل صحيح. يرجى محاولة تحديث الصفحة.",
          button: "تحديث الصفحة",
          copy: "نسخ تفاصيل الخطأ",
          copied: "✓ تم النسخ!",
          details: "التفاصيل التقنية",
        },
        en: {
          title: "Sorry, an unexpected error occurred.",
          message: "The application encountered a problem that prevents it from working correctly. Please try refreshing the page.",
          button: "Refresh Page",
          copy: "Copy Error Details",
          copied: "✓ Copied!",
          details: "Technical Details",
        }
      };

      const errorMessage = this.state.error?.message ?? 'Unknown error';
      const componentStack = this.state.errorInfo?.componentStack ?? '';

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#FFFBEB',
          color: '#92400E',
          fontFamily: 'Cairo, sans-serif'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{texts[lang].title}</h2>
          <p style={{ marginTop: '0.5rem', maxWidth: '400px' }}>
            {texts[lang].message}
          </p>

          <div style={{
            marginTop: '1rem',
            maxWidth: '600px',
            width: '100%',
            backgroundColor: '#FEF3C7',
            borderRadius: '0.75rem',
            padding: '1rem',
            textAlign: 'left',
            direction: 'ltr',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            color: '#78350F',
            overflowX: 'auto',
            maxHeight: '200px',
            overflowY: 'auto',
          }}>
            <strong>{texts[lang].details}:</strong>
            <pre style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {errorMessage}
              {componentStack ? `\n\nComponent Stack:\n${componentStack}` : ''}
            </pre>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#92400E',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {texts[lang].button} ({this.state.autoReloadSeconds}s)
            </button>
            <button
              onClick={() => this.copyErrorDetails()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: this.state.copied ? '#059669' : '#FEF3C7',
                color: this.state.copied ? 'white' : '#92400E',
                border: '1px solid #D97706',
                borderRadius: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {this.state.copied ? texts[lang].copied : texts[lang].copy}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
