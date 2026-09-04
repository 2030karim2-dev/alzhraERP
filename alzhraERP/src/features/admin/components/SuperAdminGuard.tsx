import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { useAuth, useIsSuperAdmin } from '../../auth/hooks';
import PageLoader from '../../../ui/base/PageLoader';
import Button from '../../../ui/base/Button';
import { ROUTES } from '../../../core/routes/paths';

interface SuperAdminGuardProps {
  children: React.ReactNode;
}

export const SuperAdminGuard: React.FC<SuperAdminGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading, isReady } = useAuth();
  const { data: isSuperAdmin, isLoading: isCheckLoading } = useIsSuperAdmin();

  if (!isReady || isAuthLoading || isCheckLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)]">
        <PageLoader />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.AUTH.LANDING} replace />;
  }

  if (isSuperAdmin !== true) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--app-bg)] px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-500 shadow-lg shadow-rose-500/10">
          <ShieldAlert size={32} />
        </div>
        <h1 className="mt-5 text-xl font-black text-[var(--app-text)]">
          منطقة محظورة (403 Forbidden)
        </h1>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-[var(--app-text-secondary)]">
          هذه الواجهة مخصصة حصراً لإدارة المنصة والتطبيق (Super Admin). حسابك الحالي لا يمتلك
          الصلاحيات الكافية للوصول إلى هذا النطاق الأمني.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => {
              void navigate(ROUTES.DASHBOARD.ROOT);
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold"
          >
            <ArrowRight size={14} />
            <span>العودة إلى لوحة تحكم المنشأة</span>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
