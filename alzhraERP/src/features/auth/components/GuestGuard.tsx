
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import PageLoader from '../../../ui/base/PageLoader';
import { ROUTES } from '../../../core/routes/paths';

interface GuestGuardProps {
  children: React.ReactNode;
}

export const GuestGuard: React.FC<GuestGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading, isReady } = useAuth();

  if (!isReady || isLoading) {
    return <PageLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD.ROOT} replace />;
  }

  return <>{children}</>;
};
