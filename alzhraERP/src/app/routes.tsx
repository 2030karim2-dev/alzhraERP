
import React, { lazy } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import MainLayout from '../ui/layout/MainLayout';
import { ROUTES } from '../core/routes/paths';
import { useTranslation } from '../lib/hooks/useTranslation';
import { AuthGuard } from '../features/auth/components/AuthGuard';
import { GuestGuard } from '../features/auth/components/GuestGuard';
import { FeatureBoundary } from '../core/components/FeatureBoundary';

// Auth Pages (Eager Loading — must be instant)
import LandingPage from '../features/auth/LandingPage';
import ForgotPasswordPage from '../features/auth/ForgotPasswordPage';
import UpdatePasswordPage from '../features/auth/UpdatePasswordPage';

// Critical Dashboard Page (eager — first thing user sees)
import DashboardPage from '../features/dashboard/DashboardPage';

// Lazy Loaded Features — each isolated by FeatureBoundary
const InventoryPage            = lazy(() => import('../features/inventory/InventoryPage'));
const AuditSessionPage         = lazy(() => import('../features/inventory/pages/AuditSessionPage'));

const POSPage                  = lazy(() => import('../features/pos/pages/POSPage'));
const SalesPage                = lazy(() => import('../features/sales/pages/SalesPage'));
const AccountingPage           = lazy(() => import('../features/accounting/AccountingPage'));
const PurchasesPage            = lazy(() => import('../features/purchases/pages/PurchasesPage'));
const VehiclesPage             = lazy(() => import('../features/vehicles/VehiclesPage'));
const VehicleCompatibilityPage = lazy(() => import('../features/inventory/pages/VehicleCompatibilityPage'));
const ExpensesPage             = lazy(() => import('../features/expenses/pages/ExpensesPage'));
const SettingsPage             = lazy(() => import('../features/settings/SettingsPage'));
const AppearancePage           = lazy(() => import('../features/appearance/AppearancePage'));
const BondsPage                = lazy(() => import('../features/bonds/BondsPage'));
const PartiesPage              = lazy(() => import('../features/parties/PartiesPage'));
const ReportsPage              = lazy(() => import('../features/reports/ReportsPage'));
const AICommandCenter          = lazy(() => import('../features/ai/AICommandCenter'));
const AIBrainPage              = lazy(() => import('../features/ai/AIBrainPage'));

// ── 404 ──────────────────────────────────────────────────────────────────────

const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full text-[var(--app-text-secondary)] bg-[var(--app-bg)] py-20">
      <div className="text-6xl mb-4 opacity-20">🧭</div>
      <h2 className="text-2xl font-bold text-[var(--app-text)]">{t('page_not_found_title')}</h2>
      <p className="mt-2 text-sm text-[var(--app-text-secondary)]">{t('page_not_found_desc')}</p>
      <button
        onClick={() => navigate(ROUTES.DASHBOARD.ROOT)}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
      >
        {t('back_to_home')}
      </button>
    </div>
  );
};

// ── Routes ───────────────────────────────────────────────────────────────────

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path={ROUTES.AUTH.LANDING}         element={<GuestGuard><LandingPage /></GuestGuard>} />
      <Route path={ROUTES.AUTH.LOGIN}           element={<Navigate to={ROUTES.AUTH.LANDING} replace />} />
      <Route path={ROUTES.AUTH.REGISTER}        element={<Navigate to={ROUTES.AUTH.LANDING} replace />} />
      <Route path={ROUTES.AUTH.FORGOT_PASSWORD} element={<GuestGuard><ForgotPasswordPage /></GuestGuard>} />
      <Route path={ROUTES.AUTH.UPDATE_PASSWORD} element={<GuestGuard><UpdatePasswordPage /></GuestGuard>} />

      {/* Protected App Routes */}
      <Route path="/" element={<AuthGuard><MainLayout /></AuthGuard>}>

        {/* Dashboard — eager, no boundary needed */}
        <Route index element={<DashboardPage />} />

        {/* Inventory cluster */}
        <Route path={ROUTES.DASHBOARD.INVENTORY}
          element={<FeatureBoundary name="inventory"><InventoryPage /></FeatureBoundary>} />
        <Route path={ROUTES.DASHBOARD.INVENTORY_AUDIT_SESSION}
          element={<FeatureBoundary name="audit-session"><AuditSessionPage /></FeatureBoundary>} />


        {/* Transactional */}
        <Route path={ROUTES.DASHBOARD.SALES}
          element={<FeatureBoundary name="sales"><SalesPage /></FeatureBoundary>} />
        <Route path={ROUTES.DASHBOARD.POS}
          element={<FeatureBoundary name="pos"><POSPage /></FeatureBoundary>} />
        <Route path={ROUTES.DASHBOARD.PURCHASES}
          element={<FeatureBoundary name="purchases"><PurchasesPage /></FeatureBoundary>} />
        <Route path={ROUTES.DASHBOARD.EXPENSES}
          element={<FeatureBoundary name="expenses"><ExpensesPage /></FeatureBoundary>} />
        <Route path={ROUTES.DASHBOARD.BONDS}
          element={<FeatureBoundary name="bonds"><BondsPage /></FeatureBoundary>} />

        {/* Finance */}
        <Route path={ROUTES.DASHBOARD.ACCOUNTING}
          element={<FeatureBoundary name="accounting"><AccountingPage /></FeatureBoundary>} />
        <Route path={ROUTES.DASHBOARD.REPORTS}
          element={<FeatureBoundary name="reports"><ReportsPage /></FeatureBoundary>} />

        {/* Parties */}
        <Route path={ROUTES.DASHBOARD.SUPPLIERS}
          element={<FeatureBoundary name="suppliers"><PartiesPage partyType="supplier" /></FeatureBoundary>} />
        <Route path={ROUTES.DASHBOARD.CLIENTS}
          element={<FeatureBoundary name="clients"><PartiesPage partyType="customer" /></FeatureBoundary>} />
        <Route path={ROUTES.DASHBOARD.PARTIES}
          element={<FeatureBoundary name="parties"><PartiesPage partyType="customer" /></FeatureBoundary>} />
        <Route path={ROUTES.DASHBOARD.PARTIES_CUSTOMERS}
          element={<FeatureBoundary name="parties-customers"><PartiesPage partyType="customer" /></FeatureBoundary>} />
        <Route path={ROUTES.DASHBOARD.PARTIES_SUPPLIERS}
          element={<FeatureBoundary name="parties-suppliers"><PartiesPage partyType="supplier" /></FeatureBoundary>} />

        {/* Vehicles */}
        <Route path="/vehicles"
          element={<FeatureBoundary name="vehicles"><VehiclesPage /></FeatureBoundary>} />
        <Route path={ROUTES.DASHBOARD.VEHICLE_COMPATIBILITY}
          element={<FeatureBoundary name="vehicle-compatibility"><VehicleCompatibilityPage /></FeatureBoundary>} />

        {/* Settings & Appearance */}
        <Route path={ROUTES.DASHBOARD.SETTINGS}
          element={<FeatureBoundary name="settings"><SettingsPage /></FeatureBoundary>} />
        <Route path={ROUTES.DASHBOARD.APPEARANCE}
          element={<FeatureBoundary name="appearance"><AppearancePage /></FeatureBoundary>} />

        {/* AI */}
        <Route path="/ai-center"
          element={<FeatureBoundary name="ai-center"><AICommandCenter isOpen={true} onClose={() => {}} /></FeatureBoundary>} />
        <Route path="/ai-brain"
          element={<FeatureBoundary name="ai-brain"><AIBrainPage /></FeatureBoundary>} />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
