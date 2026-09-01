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
const InventoryPage = lazy(() => import('../features/inventory/InventoryPage'));
const AuditSessionPage = lazy(() => import('../features/inventory/pages/AuditSessionPage'));
const QuickAuditPage = lazy(() => import('../features/inventory/pages/QuickAuditPage'));

const POSPage = lazy(() => import('../features/pos/pages/POSPage'));
const VINPage = lazy(() => import('../features/vin-intelligence/pages/VINPage'));
const SalesPage = lazy(() => import('../features/sales/pages/SalesPage'));
const AccountingPage = lazy(() => import('../features/accounting/AccountingPage'));
const PurchasesPage = lazy(() => import('../features/purchases/pages/PurchasesPage'));
const ExpensesPage = lazy(() => import('../features/expenses/pages/ExpensesPage'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));
const AppearancePage = lazy(() => import('../features/appearance/AppearancePage'));
const BondsPage = lazy(() => import('../features/bonds/BondsPage'));
const PartiesPage = lazy(() => import('../features/parties/PartiesPage'));
const ReportsPage = lazy(() => import('../features/reports/ReportsPage'));
const CommissionDashboardPage = lazy(
  () => import('../features/commissions/pages/CommissionDashboardPage')
);
const CommissionConfigurationPage = lazy(
  () => import('../features/commissions/pages/CommissionConfigurationPage')
);
const CommissionAssignmentsPage = lazy(
  () => import('../features/commissions/pages/CommissionAssignmentsPage')
);
const CommissionPeriodsPage = lazy(
  () => import('../features/commissions/pages/CommissionPeriodsPage')
);
const CommissionReportsPage = lazy(
  () => import('../features/commissions/pages/CommissionReportsPage')
);

// Debts & Collection module — one lazy page per main service
const DebtsLayout = lazy(() => import('../features/debts/pages/DebtsLayout'));
const DebtOverviewPage = lazy(() => import('../features/debts/pages/OverviewPage'));
const DebtFollowUpPage = lazy(() => import('../features/debts/pages/FollowUpPage'));
const DebtPromisesPage = lazy(() => import('../features/debts/pages/PromisesPage'));
const DebtOutboxPage = lazy(() => import('../features/debts/pages/OutboxPage'));
const DebtStatementsPage = lazy(() => import('../features/debts/pages/StatementsPage'));
const DebtSettingsPage = lazy(() => import('../features/debts/pages/SettingsPage'));
const SupplierPortalPage = lazy(
  () => import('../features/supplier-portal/pages/SupplierPortalPage')
);
const PublicSupplierPortalPage = lazy(
  () => import('../features/supplier-portal/pages/PublicSupplierPortalPage')
);
const ChatHubPage = lazy(() => import('../features/chat').then(m => ({ default: m.ChatHubPage })));

// ── 404 ──────────────────────────────────────────────────────────────────────

const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col items-center justify-center bg-[var(--app-bg)] py-20 text-[var(--app-text-secondary)]">
      <div className="mb-4 text-6xl opacity-20">🧭</div>
      <h2 className="text-2xl font-bold text-[var(--app-text)]">{t('page_not_found_title')}</h2>
      <p className="mt-2 text-sm text-[var(--app-text-secondary)]">{t('page_not_found_desc')}</p>
      <button
        onClick={() => {
          void navigate(ROUTES.DASHBOARD.ROOT);
        }}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
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
      <Route
        path={ROUTES.AUTH.LANDING}
        element={
          <GuestGuard>
            <LandingPage />
          </GuestGuard>
        }
      />
      <Route path={ROUTES.AUTH.LOGIN} element={<Navigate to={ROUTES.AUTH.LANDING} replace />} />
      <Route path={ROUTES.AUTH.REGISTER} element={<Navigate to={ROUTES.AUTH.LANDING} replace />} />
      <Route
        path={ROUTES.AUTH.FORGOT_PASSWORD}
        element={
          <GuestGuard>
            <ForgotPasswordPage />
          </GuestGuard>
        }
      />
      <Route
        path={ROUTES.AUTH.UPDATE_PASSWORD}
        element={
          <GuestGuard>
            <UpdatePasswordPage />
          </GuestGuard>
        }
      />

      {/* Public Dedicated Supplier Portal (Token-Based Access) */}
      <Route
        path={ROUTES.PUBLIC.SUPPLIER_PORTAL}
        element={
          <FeatureBoundary name="public-supplier-portal">
            <PublicSupplierPortalPage />
          </FeatureBoundary>
        }
      />
      <Route
        path="/portal/supplier"
        element={
          <FeatureBoundary name="public-supplier-portal">
            <PublicSupplierPortalPage />
          </FeatureBoundary>
        }
      />
      <Route
        path="/portal/:token"
        element={
          <FeatureBoundary name="public-supplier-portal">
            <PublicSupplierPortalPage />
          </FeatureBoundary>
        }
      />
      <Route
        path="/supplier-portal/:token"
        element={
          <FeatureBoundary name="public-supplier-portal">
            <PublicSupplierPortalPage />
          </FeatureBoundary>
        }
      />

      {/* Protected App Routes */}
      <Route
        path="/"
        element={
          <AuthGuard>
            <MainLayout />
          </AuthGuard>
        }
      >
        {/* Dashboard — eager, no boundary needed */}
        <Route index element={<DashboardPage />} />

        {/* Inventory cluster */}
        <Route
          path={ROUTES.DASHBOARD.INVENTORY}
          element={
            <FeatureBoundary name="inventory">
              <InventoryPage />
            </FeatureBoundary>
          }
        />
        <Route
          path={ROUTES.DASHBOARD.INVENTORY_AUDIT_SESSION}
          element={
            <FeatureBoundary name="audit-session">
              <AuditSessionPage />
            </FeatureBoundary>
          }
        />
        <Route
          path={ROUTES.DASHBOARD.INVENTORY_QUICK_AUDIT}
          element={
            <FeatureBoundary name="quick-audit">
              <QuickAuditPage />
            </FeatureBoundary>
          }
        />

        {/* Transactional */}
        <Route
          path={ROUTES.DASHBOARD.SALES}
          element={
            <FeatureBoundary name="sales">
              <SalesPage />
            </FeatureBoundary>
          }
        />
        <Route
          path={ROUTES.DASHBOARD.POS}
          element={
            <FeatureBoundary name="pos">
              <POSPage />
            </FeatureBoundary>
          }
        />
        <Route
          path={ROUTES.DASHBOARD.VIN}
          element={
            <FeatureBoundary name="vin-intelligence">
              <VINPage />
            </FeatureBoundary>
          }
        />
        <Route
          path={ROUTES.DASHBOARD.PURCHASES}
          element={
            <FeatureBoundary name="purchases">
              <PurchasesPage />
            </FeatureBoundary>
          }
        />
        <Route
          path={ROUTES.DASHBOARD.EXPENSES}
          element={
            <FeatureBoundary name="expenses">
              <ExpensesPage />
            </FeatureBoundary>
          }
        />
        <Route
          path={ROUTES.DASHBOARD.BONDS}
          element={
            <FeatureBoundary name="bonds">
              <BondsPage />
            </FeatureBoundary>
          }
        />

        {/* Finance */}
        <Route
          path={ROUTES.DASHBOARD.ACCOUNTING}
          element={
            <FeatureBoundary name="accounting">
              <AccountingPage />
            </FeatureBoundary>
          }
        />
        <Route
          path={ROUTES.DASHBOARD.REPORTS}
          element={
            <FeatureBoundary name="reports">
              <ReportsPage />
            </FeatureBoundary>
          }
        />
        <Route
          path={ROUTES.DASHBOARD.COMMISSIONS}
          element={
            <FeatureBoundary name="commissions">
              <CommissionDashboardPage />
            </FeatureBoundary>
          }
        />
        <Route
          path={ROUTES.DASHBOARD.COMMISSIONS_CONFIG}
          element={
            <FeatureBoundary name="commissions-config">
              <CommissionConfigurationPage />
            </FeatureBoundary>
          }
        />
        <Route
          path={ROUTES.DASHBOARD.COMMISSIONS_ASSIGNMENTS}
          element={
            <FeatureBoundary name="commissions-assignments">
              <CommissionAssignmentsPage />
            </FeatureBoundary>
          }
        />
        <Route
          path={ROUTES.DASHBOARD.COMMISSIONS_PERIODS}
          element={
            <FeatureBoundary name="commissions-periods">
              <CommissionPeriodsPage />
            </FeatureBoundary>
          }
        />
        <Route
          path={ROUTES.DASHBOARD.COMMISSIONS_REPORTS}
          element={
            <FeatureBoundary name="commissions-reports">
              <CommissionReportsPage />
            </FeatureBoundary>
          }
        />

        {/* Parties */}
        <Route
          path={ROUTES.DASHBOARD.SUPPLIERS}
          element={
            <FeatureBoundary name="suppliers">
              <PartiesPage partyType="supplier" />
            </FeatureBoundary>
          }
        />
        <Route
          path={ROUTES.DASHBOARD.CLIENTS}
          element={
            <FeatureBoundary name="clients">
              <PartiesPage partyType="customer" />
            </FeatureBoundary>
          }
        />
        {/* Legacy /parties/* routes → redirect to the unified /clients & /suppliers */}
        <Route
          path={ROUTES.DASHBOARD.LEGACY.PARTIES}
          element={<Navigate to={ROUTES.DASHBOARD.CLIENTS} replace />}
        />
        <Route
          path={ROUTES.DASHBOARD.LEGACY.PARTIES_CUSTOMERS}
          element={<Navigate to={ROUTES.DASHBOARD.CLIENTS} replace />}
        />
        <Route
          path={ROUTES.DASHBOARD.LEGACY.PARTIES_SUPPLIERS}
          element={<Navigate to={ROUTES.DASHBOARD.SUPPLIERS} replace />}
        />

        {/* Settings & Appearance */}
        <Route
          path={ROUTES.DASHBOARD.SETTINGS}
          element={
            <FeatureBoundary name="settings">
              <SettingsPage />
            </FeatureBoundary>
          }
        />
        <Route
          path={ROUTES.DASHBOARD.APPEARANCE}
          element={
            <FeatureBoundary name="appearance">
              <AppearancePage />
            </FeatureBoundary>
          }
        />

        {/* Debts & Collection module — each main service is its own tab/route */}
        <Route
          path={ROUTES.DASHBOARD.DEBTS}
          element={
            <FeatureBoundary name="debts">
              <DebtsLayout />
            </FeatureBoundary>
          }
        >
          <Route index element={<DebtOverviewPage />} />
          <Route path="followup" element={<DebtFollowUpPage />} />
          <Route path="promises" element={<DebtPromisesPage />} />
          <Route path="outbox" element={<DebtOutboxPage />} />
          <Route path="statements" element={<DebtStatementsPage />} />
          <Route path="settings" element={<DebtSettingsPage />} />
        </Route>

        {/* Supplier Portal & Smart Procurement */}
        <Route
          path={ROUTES.DASHBOARD.SUPPLIER_PORTAL}
          element={
            <FeatureBoundary name="supplier-portal">
              <SupplierPortalPage />
            </FeatureBoundary>
          }
        />

        {/* Enterprise Chat & Branch Collaboration */}
        <Route
          path={ROUTES.DASHBOARD.CHAT}
          element={
            <FeatureBoundary name="chat">
              <ChatHubPage />
            </FeatureBoundary>
          }
        />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
