import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Check,
  Download,
} from 'lucide-react';
import {
  useSecurityLogs,
  useSecurityMutations,
  SECURITY_LOGS_PAGE_SIZE,
  type SecurityStatusFilter,
} from '../../hooks/useAdminData';
import type { SecurityAlertLog } from '../../types';
import { ResolveAlertDialog } from './ResolveAlertDialog';
import { exportAlertsCsv, exportCspReportsCsv } from './securityCsvExport';
import { AdminTableShell } from '../shared/AdminTableShell';
import Button from '../../../../ui/base/Button';
import { useFeedbackStore } from '../../../feedback/store';

export const SecurityAuditingHub: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'honeypot' | 'csp'>('honeypot');
  const [statusFilter, setStatusFilter] = useState<SecurityStatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [alertsPage, setAlertsPage] = useState(1);
  const [cspPage, setCspPage] = useState(1);
  const [selectedAlertToResolve, setSelectedAlertToResolve] = useState<SecurityAlertLog | null>(
    null
  );
  const [isExportingLogs, setIsExportingLogs] = useState(false);

  const {
    securityAlerts,
    securityAlertsTotal,
    isLoadingAlerts,
    isErrorAlerts,
    alertsError,
    cspReports,
    cspTotal,
    isLoadingCsp,
    isErrorCsp,
    cspError,
    refetch,
  } = useSecurityLogs(alertsPage, statusFilter, cspPage);

  const { resolveAlert, isResolvingAlert } = useSecurityMutations();
  const { showToast } = useFeedbackStore();

  const alertsTotalPages = Math.max(1, Math.ceil(securityAlertsTotal / SECURITY_LOGS_PAGE_SIZE));
  const cspTotalPages = Math.max(1, Math.ceil(cspTotal / SECURITY_LOGS_PAGE_SIZE));

  // إعادة الضبط إلى الصفحة الأولى عند تغيير فلتر حالة المعالجة أو مصطلح البحث
  useEffect(() => {
    setAlertsPage(1);
  }, [statusFilter, searchTerm]);

  // منع البقاء في صفحة فارغة إذا تقلص عدد النتائج
  useEffect(() => {
    if (!isLoadingAlerts && alertsPage > alertsTotalPages) {
      setAlertsPage(alertsTotalPages);
    }
  }, [isLoadingAlerts, alertsPage, alertsTotalPages]);

  useEffect(() => {
    if (!isLoadingCsp && cspPage > cspTotalPages) {
      setCspPage(cspTotalPages);
    }
  }, [isLoadingCsp, cspPage, cspTotalPages]);

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-rose-500/10 border-rose-500/20 text-rose-600';
      case 'high':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-600';
      case 'medium':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-600';
      default:
        return 'bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400';
    }
  };

  const handleConfirmResolve = async (notes: string): Promise<void> => {
    if (!selectedAlertToResolve) return;
    try {
      await resolveAlert({
        alertId: selectedAlertToResolve.id,
        ...(notes ? { notes } : {}),
      });
      setSelectedAlertToResolve(null);
    } catch {
      // Error handled by mutation hook toast
    }
  };

  const handleExportActive = async () => {
    if (isExportingLogs) return;
    setIsExportingLogs(true);
    try {
      if (activeSubTab === 'csp') {
        await exportCspReportsCsv();
        return;
      }
      await exportAlertsCsv(statusFilter);
    } catch {
      showToast('تعذر تصدير سجلات الأمان. تحقق من الاتصال وحاول مجدداً.', 'error');
    } finally {
      setIsExportingLogs(false);
    }
  };

  const filteredAlerts = searchTerm.trim()
    ? securityAlerts.filter(
        a =>
          a.alert_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.source_ip?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          JSON.stringify(a.details || {})
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      )
    : securityAlerts;

  const filteredCsp = searchTerm.trim()
    ? cspReports.filter(
        c =>
          c.document_uri?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.blocked_uri?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.violated_directive?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : cspReports;

  return (
    <div className="space-y-3">
      {/* Top Posture & Controls Shell */}
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-xs">
        <div className="flex flex-col items-start justify-between gap-2.5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-rose-500" />
              <h2 className="text-xs font-black text-[var(--app-text)]">مركز الأمان والتنبيهات</h2>
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--app-text-secondary)]">
              سجلات تنبيهات الأمان (مصيدة Honeypot، حماية Rate-limit، وحظر تلقائي) وتقارير سياسة
              أمان المتصفح CSP.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              onClick={() => void handleExportActive()}
              disabled={isExportingLogs}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
              title="تصدير كل السجلات المطابقة CSV"
            >
              <Download size={12} className={isExportingLogs ? 'animate-pulse' : ''} />
              <span className="hidden sm:inline">
                {isExportingLogs ? 'جاري التصدير...' : 'تصدير CSV'}
              </span>
            </Button>
            <Button
              variant="outline"
              onClick={refetch}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
              title="تحديث السجلات"
            >
              <RefreshCw
                size={12}
                className={isLoadingAlerts || isLoadingCsp ? 'animate-spin' : ''}
              />
              <span>تحديث</span>
            </Button>
          </div>
        </div>

        {/* Security Posture Status Strip — High-density, no bloated cards */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--app-border)] pt-2.5 text-[11px] text-[var(--app-text-secondary)]">
          <span className="flex items-center gap-1.5 font-bold text-[var(--app-text)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            عزل RLS متعدد المستأجرين
          </span>
          <span className="flex items-center gap-1.5 font-bold text-[var(--app-text)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            مصيدة Honeypot نشطة
          </span>
          <span className="flex items-center gap-1.5 font-bold text-[var(--app-text)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            معدل الطلب (Rate Limit)
          </span>
          <span className="flex items-center gap-1.5 font-bold text-[var(--app-text)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            حماية CSP للمتصفح
          </span>
        </div>

        {/* Subtabs Switcher — Calm, Monochromatic */}
        <div className="mt-2.5 flex items-center gap-1 border-t border-[var(--app-border)] pt-2.5">
          <button
            onClick={() => setActiveSubTab('honeypot')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              activeSubTab === 'honeypot'
                ? 'bg-blue-600 text-white'
                : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
            }`}
          >
            <ShieldAlert size={13} />
            <span>سجلات الأمان ({securityAlertsTotal})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('csp')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              activeSubTab === 'csp'
                ? 'bg-blue-600 text-white'
                : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
            }`}
          >
            <AlertTriangle size={13} />
            <span>تقارير CSP ({cspTotal})</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'honeypot' && (
        <AdminTableShell
          columns={[
            { label: 'المستوى' },
            { label: 'نوع التنبيه' },
            { label: 'عنوان IP المهاجم' },
            { label: 'تفاصيل الهجوم' },
            { label: 'التوقيت' },
            { label: 'حالة التنبيه', align: 'center' },
            { label: 'إجراء', align: 'left' },
          ]}
          hasRows={filteredAlerts.length > 0}
          loading={isLoadingAlerts}
          error={isErrorAlerts}
          errorMessage={`تعذر تحميل تنبيهات الأمان: ${alertsError || 'خطأ في الاتصال'}`}
          emptyMessage="لا توجد تنبيهات أمنية مطابقة للفلتر المحدد."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="بحث بـ IP أو نوع التنبيه..."
          pagination={{
            page: alertsPage,
            totalPages: alertsTotalPages,
            itemCount: filteredAlerts.length,
            totalItems: securityAlertsTotal,
            itemLabel: 'تنبيه',
            isLoading: isLoadingAlerts,
            onPrev: () => {
              setAlertsPage(p => Math.max(1, p - 1));
            },
            onNext: () => {
              setAlertsPage(p => p + 1);
            },
          }}
          actions={
            <div className="flex items-center gap-1.5">
              <Filter size={12} className="text-[var(--app-text-secondary)]" />
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value as 'all' | 'unresolved' | 'resolved');
                }}
                aria-label="تصفية حسب حالة المعالجة"
                className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 py-1 text-xs text-[var(--app-text)] focus:outline-none"
              >
                <option value="all">كافة التنبيهات</option>
                <option value="unresolved">النشطة (غير المعالجة)</option>
                <option value="resolved">المعالجة (المغلقة)</option>
              </select>
            </div>
          }
        >
          {filteredAlerts.map(log => (
            <tr key={log.id} className="hover:bg-[var(--app-surface-hover)]/60 transition-colors">
              <td className="px-3.5 py-2.5">
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${getSeverityBadge(log.severity)}`}
                >
                  {log.severity || 'CRITICAL'}
                </span>
              </td>
              <td className="px-3.5 py-2.5 font-mono text-[11px] font-bold text-[var(--app-text)]">
                {log.alert_type}
              </td>
              <td className="px-3.5 py-2.5 font-mono text-[11px] text-[var(--app-text-secondary)]">
                {log.source_ip || 'غير معروف'}
              </td>
              <td className="max-w-xs truncate px-3.5 py-2.5 font-mono text-[10px] text-[var(--app-text-secondary)]">
                {JSON.stringify(log.details || {})}
              </td>
              <td className="px-3.5 py-2.5 font-mono text-[10px] text-[var(--app-text-secondary)]">
                {new Date(log.detected_at).toLocaleString('ar-SA')}
              </td>
              <td className="px-3.5 py-2.5 text-center">
                {log.resolved_at ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600"
                    title={
                      log.resolution_notes ? `ملاحظات: ${log.resolution_notes}` : 'تمت المعالجة'
                    }
                  >
                    <CheckCircle2 size={10} />
                    <span>معالج</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                    <AlertTriangle size={10} />
                    <span>نشط</span>
                  </span>
                )}
              </td>
              <td className="px-3.5 py-2.5 text-left">
                {!log.resolved_at ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedAlertToResolve(log);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-600 hover:bg-emerald-500/10"
                  >
                    <Check size={11} />
                    <span>معالجة</span>
                  </Button>
                ) : (
                  <span className="text-[10px] text-[var(--app-text-secondary)]">
                    {new Date(log.resolved_at).toLocaleDateString('ar-SA')}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </AdminTableShell>
      )}

      {activeSubTab === 'csp' && (
        <AdminTableShell
          columns={[
            { label: 'الصفحة المستهدفة' },
            { label: 'المورد المحظور (Blocked URI)' },
            { label: 'القاعدة المنتهكة' },
            { label: 'التوقيت' },
          ]}
          hasRows={filteredCsp.length > 0}
          loading={isLoadingCsp}
          error={isErrorCsp}
          errorMessage={`تعذر تحميل تقارير الـ CSP: ${cspError || 'خطأ في الاتصال'}`}
          emptyMessage="لا توجد انتهاكات لسياسة أمان المحتوى (CSP)."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="بحث في تقارير CSP..."
          pagination={{
            page: cspPage,
            totalPages: cspTotalPages,
            itemCount: filteredCsp.length,
            totalItems: cspTotal,
            itemLabel: 'تقرير',
            isLoading: isLoadingCsp,
            onPrev: () => {
              setCspPage(p => Math.max(1, p - 1));
            },
            onNext: () => {
              setCspPage(p => p + 1);
            },
          }}
        >
          {filteredCsp.map(report => (
            <tr
              key={report.id}
              className="hover:bg-[var(--app-surface-hover)]/60 transition-colors"
            >
              <td className="px-3.5 py-2.5 font-mono text-[11px] text-[var(--app-text)]">
                {report.document_uri || '-'}
              </td>
              <td className="px-3.5 py-2.5 font-mono text-[11px] text-amber-600">
                {report.blocked_uri || '-'}
              </td>
              <td className="px-3.5 py-2.5 font-bold text-[var(--app-text-secondary)]">
                {report.violated_directive || '-'}
              </td>
              <td className="px-3.5 py-2.5 font-mono text-[10px] text-[var(--app-text-secondary)]">
                {report.received_at ? new Date(report.received_at).toLocaleString('ar-SA') : '-'}
              </td>
            </tr>
          ))}
        </AdminTableShell>
      )}

      {/* Resolve Alert Modal */}
      {selectedAlertToResolve && (
        <ResolveAlertDialog
          alert={selectedAlertToResolve}
          isResolving={isResolvingAlert}
          onClose={() => {
            setSelectedAlertToResolve(null);
          }}
          onConfirm={handleConfirmResolve}
        />
      )}
    </div>
  );
};
