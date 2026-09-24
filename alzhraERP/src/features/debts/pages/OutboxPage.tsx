import React, { useState } from 'react';
import { MessageSquareWarning, Copy, Send } from 'lucide-react';
import { useDebtMessageLog, useDebtFailedMessagesCount } from '../hooks/useDebtQueries';
import { MESSAGE_STATUS_META } from '../lib/constants';
import { buildWhatsAppLink } from '../lib/whatsapp';
import StatusBadge from '../components/StatusBadge';
import MobileCardList, { MobileCardRow } from '../../../ui/base/MobileCardList';

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'الكل' },
  { value: 'sent', label: 'مرسلة' },
  { value: 'failed', label: 'رسائل فاشلة' },
  { value: 'cancelled', label: 'ملغاة' },
];

/** إعادة إرسال رسالة عبر واتساب — window.open متزامن بعد بناء رابط wa.me. */
const openWhatsAppResend = (recipient: string, text: string): void => {
  window.open(buildWhatsAppLink(recipient, text), '_blank', 'noopener,noreferrer');
};

/** نسخ نص الرسالة إلى الحافظة (لا يُعطّل تفاعل الواجهة عند رفض الإذن). */
const copyMessageText = (text: string): void => {
  void navigator.clipboard.writeText(text);
};

const OutboxPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const { data: messages, isLoading } = useDebtMessageLog(statusFilter || undefined);
  // العدّ من الخادم (HEAD count) — لا يُشتق من الصفحة المحمّلة (حد 200) ولا من الفلتر الحالي.
  const { data: failedCount = 0 } = useDebtFailedMessagesCount();

  // The query already filters by status server-side; keep a null-safe alias.
  const filtered = messages ?? [];

  return (
    <div className="space-y-4 max-md:space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => {
                setStatusFilter(f.value);
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all max-md:px-2 ${
                statusFilter === f.value
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span
          className="text-[10px] font-bold text-[var(--app-text-secondary)]"
          title="إجمالي الرسائل الفاشلة في سجل المنشأة (لا يتأثر بفلتر الحالة المعروض)"
        >
          {failedCount} فاشلة
        </span>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-sm text-[var(--app-text-secondary)] max-md:p-8">
          جاري التحميل...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[var(--app-border)] p-14 text-center text-sm text-[var(--app-text-secondary)] max-md:p-6">
          لا توجد رسائل في هذا التصنيف
        </div>
      ) : (
        <div className="hidden overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm md:block">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-[var(--app-surface-hover)]/50 border-b border-[var(--app-border)] text-[10px] font-bold text-[var(--app-text-secondary)]">
                <th className="px-4 py-3 max-md:px-2 max-md:py-2">العميل</th>
                <th className="px-4 py-3 max-md:px-2 max-md:py-2">الرسالة</th>
                <th className="px-4 py-3 max-md:px-2 max-md:py-2">القناة</th>
                <th className="px-4 py-3 max-md:px-2 max-md:py-2">الحالة</th>
                <th className="px-4 py-3 max-md:px-2 max-md:py-2">الوقت</th>
                <th className="px-4 py-3 text-center max-md:px-2 max-md:py-2">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {filtered.map(m => {
                const meta = MESSAGE_STATUS_META[m.status] ?? MESSAGE_STATUS_META.sent;
                return (
                  <tr key={m.id} className="transition-colors hover:bg-[var(--app-surface-hover)]">
                    <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                      <span className="text-xs font-bold text-[var(--app-text)]">
                        {m.parties?.name ?? '—'}
                      </span>
                      {m.recipient !== null && m.recipient !== '' && (
                        <span
                          className="block font-mono text-[10px] text-[var(--app-text-secondary)]"
                          dir="ltr"
                        >
                          {m.recipient}
                        </span>
                      )}
                    </td>
                    <td className="max-w-md px-4 py-3 max-md:px-2 max-md:py-2">
                      <p className="line-clamp-2 whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--app-text-secondary)]">
                        {m.message_text}
                      </p>
                      {m.status === 'failed' && m.error_info !== null && m.error_info !== '' && (
                        <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-rose-500">
                          <MessageSquareWarning size={11} /> {m.error_info}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                      <span className="text-[10px] font-bold uppercase text-[var(--app-text-secondary)]">
                        {m.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                      <StatusBadge {...meta} />
                    </td>
                    <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                      <span className="font-mono text-[10px] text-[var(--app-text-secondary)]">
                        {new Date(m.created_at).toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-md:px-2 max-md:py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            copyMessageText(m.message_text);
                          }}
                          title="نسخ نص الرسالة"
                          className="rounded-lg bg-gray-100 p-1.5 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300"
                        >
                          <Copy size={13} />
                        </button>
                        {m.recipient !== null && m.recipient !== '' && (
                          <button
                            type="button"
                            onClick={() => {
                              openWhatsAppResend(m.recipient ?? '', m.message_text);
                            }}
                            title="إعادة إرسال عبر واتساب"
                            className="rounded-lg bg-green-50 p-1.5 text-green-600 transition-colors hover:bg-green-600 hover:text-white dark:bg-green-950/30"
                          >
                            <Send size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Cards — بديل الجدول على الهاتف (مكوّن موحّد) */}
      <MobileCardList>
        {filtered.map(m => {
          const meta = MESSAGE_STATUS_META[m.status] ?? MESSAGE_STATUS_META.sent;
          return (
            <MobileCardRow
              key={m.id}
              id={m.id}
              title={m.parties?.name ?? '—'}
              subtitle={m.recipient ?? undefined}
              badge={<StatusBadge {...meta} />}
              badgeSecondary={
                <span className="text-[10px] font-bold uppercase text-[var(--app-text-secondary)]">
                  {m.channel}
                </span>
              }
              body={
                <>
                  <p className="line-clamp-3 whitespace-pre-wrap">{m.message_text}</p>
                  {m.status === 'failed' && m.error_info !== null && m.error_info !== '' && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-rose-500">
                      <MessageSquareWarning size={11} /> {m.error_info}
                    </p>
                  )}
                </>
              }
              meta={
                <span className="font-mono text-[10px] text-[var(--app-text-secondary)]">
                  {new Date(m.created_at).toLocaleString('en-US')}
                </span>
              }
              actions={
                <>
                  <span className="flex-1" />
                  <button
                    type="button"
                    onClick={() => {
                      copyMessageText(m.message_text);
                    }}
                    title="نسخ نص الرسالة"
                    className="rounded-lg bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-gray-200 active:scale-90 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <Copy size={14} />
                  </button>
                  {m.recipient !== null && m.recipient !== '' && (
                    <button
                      type="button"
                      onClick={() => {
                        openWhatsAppResend(m.recipient ?? '', m.message_text);
                      }}
                      title="إعادة إرسال عبر واتساب"
                      className="rounded-lg bg-green-50 p-2 text-green-600 transition-colors hover:bg-green-600 hover:text-white active:scale-90 dark:bg-green-950/30"
                    >
                      <Send size={14} />
                    </button>
                  )}
                </>
              }
            />
          );
        })}
      </MobileCardList>
    </div>
  );
};

export default OutboxPage;
