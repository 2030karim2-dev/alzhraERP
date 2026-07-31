import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Standard React Error Boundary.
 * Provides a fallback UI if any child component crashes during rendering.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
      const texts = {
        ar: {
          title: "عذراً، حدث خطأ غير متوقع.",
          message: "واجه التطبيق مشكلة تمنعه من العمل بشكل صحيح. يرجى محاولة تحديث الصفحة.",
          button: "تحديث الصفحة"
        },
        en: {
          title: "Sorry, an unexpected error occurred.",
          message: "The application encountered a problem that prevents it from working correctly. Please try refreshing the page.",
          button: "Refresh Page"
        }
      };

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
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem',
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
            {texts[lang].button}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
