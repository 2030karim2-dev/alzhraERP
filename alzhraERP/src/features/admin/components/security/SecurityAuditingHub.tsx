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
} from 'lucide-react';
import { useSecurityLogs } from '../../hooks/useAdminData';
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

  const [activeSubTab, setActiveSubTab] = useState<'honeypot' | 'csp'>('honeypot');

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

      {/* Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--app-border)] pb-2">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)]">
                {isLoadingHoneypot ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-xs text-[var(--app-text-secondary)]"
                    >
                      جاري فحص سجلات الأمان...
                    </td>
                  </tr>
                ) : isErrorHoneypot ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-xs font-bold text-rose-500">
                      <div className="flex items-center justify-center gap-2">
                        <AlertCircle size={16} />
                        <span>تعذر استرجاع سجلات الأمان: {honeypotError || 'خطأ في الاتصال'}</span>
                      </div>
                    </td>
                  </tr>
                ) : honeypotLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-xs font-bold text-emerald-600"
                    >
                      ✓ لا توجد محاولات هجوم أو اختراق مسجلة حالياً. النظام آمن تماماً ومصيدة الـ
                      Honeypot تراقب بهدوء.
                    </td>
                  </tr>
                ) : (
                  honeypotLogs.map(log => (
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
    </div>
  );
};
