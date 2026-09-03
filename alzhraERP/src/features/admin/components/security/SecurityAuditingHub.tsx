import React, { useState } from 'react';
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
  X,
} from 'lucide-react';
import { useSecurityLogs, useSecurityMutations } from '../../hooks/useAdminData';
import type { SecurityAlertLog } from '../../types';
import Button from '../../../../ui/base/Button';

export const SecurityAuditingHub: React.FC = () => {
  const {
    honeypotLogs,
    isLoadingHoneypot,
    isErrorHoneypot,
    honeypotError,
    cspReports,
    isLoadingCsp,
    isErrorCsp,
    cspError,
    refetch,
  } = useSecurityLogs();

  const { resolveAlert, isResolvingAlert } = useSecurityMutations();

  const [activeSubTab, setActiveSubTab] = useState<'honeypot' | 'csp'>('honeypot');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [selectedAlertToResolve, setSelectedAlertToResolve] = useState<SecurityAlertLog | null>(
    null
  );
  const [resolutionNotes, setResolutionNotes] = useState('');

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

  const filteredHoneypotLogs = honeypotLogs.filter(log => {
    if (statusFilter === 'unresolved') return !log.resolved_at;
    if (statusFilter === 'resolved') return !!log.resolved_at;
    return true;
  });

  const handleConfirmResolve = async () => {
    if (!selectedAlertToResolve) return;
    try {
      const trimmedNotes = resolutionNotes.trim();
      await resolveAlert({
        alertId: selectedAlertToResolve.id,
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      });
      setSelectedAlertToResolve(null);
      setResolutionNotes('');
    } catch {
      // Error handled by mutation hook toast
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
                مركز الأمان ومصيدة الاختراق (Security & Honeypot Hub)
              </h2>
            </div>
            <p className="mt-0.5 text-[10px] text-[var(--app-text-secondary)]">
              رصد استباقي للهجمات السيبرانية ومحاولات استغلال الثغرات عبر جداول الفخاخ (Honeypot
              Trap Tables) وتنبيهات أمان المنصة.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={refetch}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
          >
            <RefreshCw
              size={12}
              className={isLoadingHoneypot || isLoadingCsp ? 'animate-spin' : ''}
            />
            <span>تحديث السجلات</span>
          </Button>
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
            onClick={() => setActiveSubTab('honeypot')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeSubTab === 'honeypot'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
            }`}
          >
            <ShieldAlert size={14} />
            <span>تنبيهات مصيدة الـ Honeypot ({honeypotLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('csp')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeSubTab === 'csp'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
            }`}
          >
            <AlertTriangle size={14} />
            <span>تقارير انتهاك سياسة المتصفح CSP ({cspReports.length})</span>
          </button>
        </div>

        {activeSubTab === 'honeypot' && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <Filter size={12} className="text-[var(--app-text-secondary)]" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'all' | 'unresolved' | 'resolved')}
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
                {isLoadingHoneypot ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-xs text-[var(--app-text-secondary)]"
                    >
                      جاري فحص سجلات الأمان...
                    </td>
                  </tr>
                ) : isErrorHoneypot ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-xs font-bold text-rose-500">
                      <div className="flex items-center justify-center gap-2">
                        <AlertCircle size={16} />
                        <span>تعذر استرجاع سجلات الأمان: {honeypotError || 'خطأ في الاتصال'}</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredHoneypotLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-xs font-bold text-emerald-600"
                    >
                      ✓ لا توجد سجلات مطابقة لمعيار العرض.
                    </td>
                  </tr>
                ) : (
                  filteredHoneypotLogs.map(log => (
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
                              setResolutionNotes('');
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
        </div>
      )}

      {/* Resolve Alert Modal */}
      {selectedAlertToResolve && (
        <div className="backdrop-blur-xs animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 duration-200">
          <div className="animate-in zoom-in-95 w-full max-w-md overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl duration-200">
            <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] px-5 py-3.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <h3 className="text-xs font-black text-[var(--app-text)]">
                  تأكيد معالجة التنبيه الأمني #{selectedAlertToResolve.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAlertToResolve(null)}
                className="rounded-lg p-1 text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)]"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3 p-5 text-xs">
              <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[var(--app-text)]">
                    {selectedAlertToResolve.alert_type}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--app-text-secondary)]">
                    IP: {selectedAlertToResolve.source_ip || 'غير معروف'}
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold text-[var(--app-text-secondary)]">
                  ملاحظات وإجراءات المعالجة (اختياري):
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  placeholder="مثال: تم حظر عنوان IP على مستوى جدار الحماية، وتبين أن المحاولة مجرد فحص عشوائي..."
                  className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-2.5 text-xs text-[var(--app-text)] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedAlertToResolve(null)}
                  disabled={isResolvingAlert}
                  className="px-3 py-1.5 text-xs"
                >
                  إلغاء
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmResolve}
                  disabled={isResolvingAlert}
                  className="px-4 py-1.5 text-xs font-bold"
                >
                  {isResolvingAlert ? 'جاري المعالجة...' : 'تأكيد المعالجة'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
