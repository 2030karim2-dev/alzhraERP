
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import PageLoader from '../../../ui/base/PageLoader';
import { ROUTES } from '../../../core/routes/paths';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading, isReady } = useAuth();

  // Wait until auth initialization is complete before making any routing decisions
  if (!isReady || isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.AUTH.LOGIN} replace />;
  }

  return <>{children}</>;
};
