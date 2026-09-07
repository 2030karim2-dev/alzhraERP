import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Lock,
  Terminal,
  Activity,
  AlertCircle,
  CheckCircle2,
  Filter,
  Check,
  Download,
  ChevronRight,
  ChevronLeft,
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
import Button from '../../../../ui/base/Button';
import { useFeedbackStore } from '../../../feedback/store';

export const SecurityAuditingHub: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'honeypot' | 'csp'>('honeypot');
  const [statusFilter, setStatusFilter] = useState<SecurityStatusFilter>('all');
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

  // إعادة الضبط إلى الصفحة الأولى عند تغيير فلتر حالة المعالجة
  useEffect(() => {
    setAlertsPage(1);
  }, [statusFilter]);

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

  return (
    <div className="space-y-4">
      {/* Top Banner & Posture Indicators */}
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-xs">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-rose-500" />
              <h2 className="text-xs font-black text-[var(--app-text)]">
                مركز الأمان والتنبيهات (Security Alerts Hub)
              </h2>
            </div>
            <p className="mt-0.5 text-[10px] text-[var(--app-text-secondary)]">
              سجلّات تنبيهات أمان المنصة (مصيدة Honeypot + Rate-limit + حظر تلقائي) وتقارير انتهاك
              سياسة أمان المتصفح (CSP).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void handleExportActive()}
              disabled={isExportingLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
              title="تصدير كل السجلات المطابقة (لا صفحة العرض فقط)"
            >
              <Download size={12} className={isExportingLogs ? 'animate-pulse' : ''} />
              <span>{isExportingLogs ? 'جاري التصدير...' : 'تصدير الكل CSV'}</span>
            </Button>
            <Button
              variant="outline"
              onClick={refetch}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <RefreshCw
                size={12}
                className={isLoadingAlerts || isLoadingCsp ? 'animate-spin' : ''}
              />
              <span>تحديث السجلات</span>
            </Button>
          </div>
        </div>

        {/* Security Pillars */}
        <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-[var(--app-border)] pt-3 md:grid-cols-4">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <ShieldCheck size={14} />
            <span>عزل RLS متعدد المستأجرين</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <Lock size={14} />
            <span>مصيدة الـ Honeypot نشطة</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <Activity size={14} />
            <span>حماية معدل الطلب (Rate Limit)</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <Terminal size={14} />
            <span>جدار تقارير المتصفح CSP</span>
          </div>
        </div>
      </div>

      {/* Sub-tabs & Filter Bar */}
      <div className="flex flex-col gap-2 border-b border-[var(--app-border)] pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveSubTab('honeypot');
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeSubTab === 'honeypot'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
            }`}
          >
            <ShieldAlert size={14} />
            <span>سجلات الأمان والتنبيهات ({securityAlertsTotal})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('csp');
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeSubTab === 'csp'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
            }`}
          >
            <AlertTriangle size={14} />
            <span>تقارير انتهاك سياسة المتصفح CSP ({cspTotal})</span>
          </button>
        </div>

        {activeSubTab === 'honeypot' && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <Filter size={12} className="text-[var(--app-text-secondary)]" />
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value as 'all' | 'unresolved' | 'resolved');
              }}
              className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 py-1 text-xs text-[var(--app-text)] focus:outline-none"
            >
              <option value="all">كافة التنبيهات</option>
              <option value="unresolved">النشطة (غير المعالجة)</option>
              <option value="resolved">المعالجة (المغلقة)</option>
            </select>
          </div>
        )}
      </div>

      {/* Tables */}
      {activeSubTab === 'honeypot' ? (
        <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] text-[10px] font-black uppercase text-[var(--app-text-secondary)]">
                  <th className="px-3.5 py-2.5">المستوى</th>
                  <th className="px-3.5 py-2.5">نوع التنبيه</th>
                  <th className="px-3.5 py-2.5 font-mono">عنوان IP المهاجم</th>
                  <th className="px-3.5 py-2.5">تفاصيل الهجوم</th>
                  <th className="px-3.5 py-2.5 font-mono">التوقيت</th>
                  <th className="px-3.5 py-2.5 text-center">حالة التنبيه</th>
                  <th className="px-3.5 py-2.5 text-left">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)]">
                {isLoadingAlerts ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-xs text-[var(--app-text-secondary)]"
                    >
                      جاري فحص سجلات الأمان...
                    </td>
                  </tr>
                ) : isErrorAlerts ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-xs font-bold text-rose-500">
                      <div className="flex items-center justify-center gap-2">
                        <AlertCircle size={16} />
                        <span>تعذر استرجاع سجلات الأمان: {alertsError || 'خطأ في الاتصال'}</span>
                      </div>
                    </td>
                  </tr>
                ) : securityAlerts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-xs font-bold text-emerald-600"
                    >
                      ✓ لا توجد سجلات مطابقة لمعيار العرض.
                    </td>
                  </tr>
                ) : (
                  securityAlerts.map(log => (
                    <tr
                      key={log.id}
                      className="hover:bg-[var(--app-surface-hover)]/60 transition-colors"
                    >
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
                              log.resolution_notes
                                ? `ملاحظات: ${log.resolution_notes}`
                                : 'تمت المعالجة'
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
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-emerald-600 hover:bg-emerald-500/10"
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t border-[var(--app-border)] bg-[var(--app-surface-hover)] px-3.5 py-2 text-xs">
            <span className="text-[10px] text-[var(--app-text-secondary)]">
              عرض {securityAlerts.length} من {securityAlertsTotal} تنبيه (صفحة {alertsPage} من{' '}
              {alertsTotalPages})
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                disabled={alertsPage <= 1 || isLoadingAlerts}
                onClick={() => {
                  setAlertsPage(p => Math.max(1, p - 1));
                }}
                className="flex items-center gap-1 px-2 py-1 text-[10px]"
              >
                <ChevronRight size={12} />
                <span>السابق</span>
              </Button>
              <span className="px-2 text-[10px] font-bold text-[var(--app-text)]">
                {alertsPage}
              </span>
              <Button
                variant="outline"
                disabled={alertsPage >= alertsTotalPages || isLoadingAlerts}
                onClick={() => {
                  setAlertsPage(p => p + 1);
                }}
                className="flex items-center gap-1 px-2 py-1 text-[10px]"
              >
                <span>التالي</span>
                <ChevronLeft size={12} />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] text-[10px] font-black uppercase text-[var(--app-text-secondary)]">
                  <th className="px-3.5 py-2.5">الصفحة المستهدفة</th>
                  <th className="px-3.5 py-2.5">المورد المحظور (Blocked URI)</th>
                  <th className="px-3.5 py-2.5">القاعدة المنتهكة</th>
                  <th className="px-3.5 py-2.5 font-mono">التوقيت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)]">
                {isLoadingCsp ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-10 text-center text-xs text-[var(--app-text-secondary)]"
                    >
                      جاري تحميل تقارير CSP...
                    </td>
                  </tr>
                ) : isErrorCsp ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-xs font-bold text-rose-500">
                      <div className="flex items-center justify-center gap-2">
                        <AlertCircle size={16} />
                        <span>تعذر تحميل تقارير الـ CSP: {cspError || 'خطأ في الاتصال'}</span>
                      </div>
                    </td>
                  </tr>
                ) : cspReports.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-10 text-center text-xs font-bold text-emerald-600"
                    >
                      ✓ لا توجد انتهاكات لسياسة أمان المحتوى (CSP).
                    </td>
                  </tr>
                ) : (
                  cspReports.map(report => (
                    <tr
                      key={report.id}
                      className="hover:bg-[var(--app-surface-hover)]/60 transition-colors"
                    >
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-[var(--app-text)]">
                        {report.document_uri || '—'}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-amber-600">
                        {report.blocked_uri || '—'}
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-[var(--app-text-secondary)]">
                        {report.violated_directive || '—'}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-[10px] text-[var(--app-text-secondary)]">
                        {report.received_at
                          ? new Date(report.received_at).toLocaleString('ar-SA')
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t border-[var(--app-border)] bg-[var(--app-surface-hover)] px-3.5 py-2 text-xs">
            <span className="text-[10px] text-[var(--app-text-secondary)]">
              عرض {cspReports.length} من {cspTotal} تقرير (صفحة {cspPage} من {cspTotalPages})
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                disabled={cspPage <= 1 || isLoadingCsp}
                onClick={() => {
                  setCspPage(p => Math.max(1, p - 1));
                }}
                className="flex items-center gap-1 px-2 py-1 text-[10px]"
              >
                <ChevronRight size={12} />
                <span>السابق</span>
              </Button>
              <span className="px-2 text-[10px] font-bold text-[var(--app-text)]">{cspPage}</span>
              <Button
                variant="outline"
                disabled={cspPage >= cspTotalPages || isLoadingCsp}
                onClick={() => {
                  setCspPage(p => p + 1);
                }}
                className="flex items-center gap-1 px-2 py-1 text-[10px]"
              >
                <span>التالي</span>
                <ChevronLeft size={12} />
              </Button>
            </div>
          </div>
        </div>
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
