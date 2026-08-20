import React, { useState } from 'react';
import { MessageSquareWarning } from 'lucide-react';
import { useDebtMessageLog } from '../hooks/useDebtQueries';
import { MESSAGE_STATUS_META } from '../lib/constants';
import StatusBadge from '../components/StatusBadge';

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'الكل' },
  { value: 'sent', label: 'مرسلة' },
  { value: 'failed', label: 'رسائل فاشلة' },
  { value: 'cancelled', label: 'ملغاة' },
];

const OutboxPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const { data: messages, isLoading } = useDebtMessageLog(statusFilter || undefined);

  // The query already filters by status server-side; keep a null-safe alias.
  const filtered = messages ?? [];

  return (
    <div className="space-y-4 max-md:space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); }}
              className={`px-3 max-md:px-2 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === f.value
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] font-bold text-[var(--app-text-secondary)]">
          {(messages ?? []).filter((m) => m.status === 'failed').length} فاشلة
        </span>
      </div>

      {isLoading ? (
        <div className="p-16 max-md:p-8 text-center text-sm text-[var(--app-text-secondary)]">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="p-14 max-md:p-6 text-center text-sm text-[var(--app-text-secondary)] border-2 border-dashed border-[var(--app-border)] rounded-2xl">
          لا توجد رسائل في هذا التصنيف
        </div>
      ) : (
        <div className="overflow-x-auto bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] shadow-sm">
          <table className="w-full text-right">
            <thead>
              <tr className="text-[10px] font-bold text-[var(--app-text-secondary)] border-b border-[var(--app-border)] bg-[var(--app-surface-hover)]/50">
                <th className="px-4 max-md:px-2 py-3 max-md:py-2">العميل</th>
                <th className="px-4 max-md:px-2 py-3 max-md:py-2">الرسالة</th>
                <th className="px-4 max-md:px-2 py-3 max-md:py-2">القناة</th>
                <th className="px-4 max-md:px-2 py-3 max-md:py-2">الحالة</th>
                <th className="px-4 max-md:px-2 py-3 max-md:py-2">الوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {filtered.map((m) => {
                const meta = MESSAGE_STATUS_META[m.status] ?? MESSAGE_STATUS_META.sent;
                return (
                  <tr key={m.id} className="hover:bg-[var(--app-surface-hover)] transition-colors">
                    <td className="px-4 max-md:px-2 py-3 max-md:py-2">
                      <span className="text-xs font-bold text-[var(--app-text)]">
                        {m.parties?.name ?? '—'}
                      </span>
                      {m.recipient && (
                        <span className="block text-[10px] text-[var(--app-text-secondary)]" dir="ltr">
                          {m.recipient}
                        </span>
                      )}
                    </td>
                    <td className="px-4 max-md:px-2 py-3 max-md:py-2 max-w-md">
                      <p className="text-[11px] text-[var(--app-text-secondary)] line-clamp-2 leading-relaxed">
                        {m.message_text}
                      </p>
                      {m.status === 'failed' && m.error_info && (
                        <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                          <MessageSquareWarning size={11} /> {m.error_info}
                        </p>
                      )}
                    </td>
                    <td className="px-4 max-md:px-2 py-3 max-md:py-2">
                      <span className="text-[10px] font-bold text-[var(--app-text-secondary)] uppercase">
                        {m.channel}
                      </span>
                    </td>
                    <td className="px-4 max-md:px-2 py-3 max-md:py-2">
                      <StatusBadge {...meta} />
                    </td>
                    <td className="px-4 max-md:px-2 py-3 max-md:py-2">
                      <span className="text-[10px] font-mono text-[var(--app-text-secondary)]">
                        {new Date(m.created_at).toLocaleString('en-US')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OutboxPage;
