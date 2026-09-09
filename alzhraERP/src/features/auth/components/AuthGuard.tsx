import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import PageLoader from '../../../ui/base/PageLoader';
import { ROUTES } from '../../../core/routes/paths';
import { useAuthStore } from '../store';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard — حارس المصادقة
 *
 * ثلاث حالات:
 * 1. جاري التحميل       → شاشة تحميل
 * 2. غير مسجّل دخول    → توجيه لصفحة تسجيل الدخول
 * 3. مسجّل دخول بدون شركة → شاشة تنبيه بدلاً من لوحة فارغة أو خاطئة
 * 4. مسجّل دخول + شركة  → يُكمل للوحة التحكم
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading, isReady } = useAuth();
  const { user, logout } = useAuthStore();

  // 1. انتظر انتهاء التهيئة
  if (!isReady || isLoading) {
    return <PageLoader />;
  }

  // 2. غير مسجّل دخول → صفحة الدخول
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.AUTH.LOGIN} replace />;
  }

  // 3. مسجّل دخول لكن بدون company_id → شاشة تنبيه واضحة
  if (!user?.company_id) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--color-bg-primary, #0f172a)',
          fontFamily: 'inherit',
          direction: 'rtl',
          padding: '2rem',
          gap: '1.5rem',
          textAlign: 'center',
        }}
      >
        {/* أيقونة تحذير */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(245,158,11,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 40,
          }}
        >
          ⚠️
        </div>

        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--color-text-primary, #f8fafc)',
            margin: 0,
          }}
        >
          الحساب غير مرتبط بشركة
        </h1>

        <p
          style={{
            fontSize: '1rem',
            color: 'var(--color-text-secondary, #94a3b8)',
            maxWidth: 400,
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          حسابك ({user?.email}) غير مرتبط بأي شركة حتى الآن. يرجى التواصل مع مدير النظام لإضافتك إلى
          شركتك، أو تحديث الصفحة إذا كان تم إضافتك مؤخراً.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.625rem 1.5rem',
              borderRadius: 8,
              border: '1.5px solid var(--color-primary, #3b82f6)',
              background: 'transparent',
              color: 'var(--color-primary, #3b82f6)',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🔄 تحديث الصفحة
          </button>

          <button
            onClick={() => void logout()}
            style={{
              padding: '0.625rem 1.5rem',
              borderRadius: 8,
              border: 'none',
              background: 'rgba(239,68,68,0.15)',
              color: '#f87171',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  // 4. مسجّل دخول + شركة محددة → اعرض المحتوى
  return <>{children}</>;
};
