import React, { useState } from 'react';
import { MessageSquare, Handshake } from 'lucide-react';
import { formatCurrency } from '../../../core/utils/currencyUtils';
import { CLASSIFICATION_META, REMINDER_STATUS_META } from '../lib/constants';
import StatusBadge from './StatusBadge';
import ReminderModal from './ReminderModal';
import PromiseFormModal from './PromiseFormModal';
import type { FollowUpDashboardRow } from '../types';

interface FollowUpTableProps {
  rows: FollowUpDashboardRow[];
}

const FollowUpTable: React.FC<FollowUpTableProps> = ({ rows }) => {
  const [reminderRow, setReminderRow] = useState<FollowUpDashboardRow | null>(null);
  const [promiseRow, setPromiseRow] = useState<FollowUpDashboardRow | null>(null);

  if (rows.length === 0) {
    return (
      <div className="p-14 max-md:p-6 text-center text-sm text-[var(--app-text-secondary)] border-2 border-dashed border-[var(--app-border)] rounded-2xl">
        لا توجد سجلات في هذا التصنيف
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] shadow-sm">
        <table className="w-full text-right">
          <thead>
            <tr className="text-[10px] font-bold text-[var(--app-text-secondary)] border-b border-[var(--app-border)] bg-[var(--app-surface-hover)]/50">
              <th className="px-4 max-md:px-2 py-3 max-md:py-2">العميل</th>
              <th className="px-4 max-md:px-2 py-3 max-md:py-2">التصنيف</th>
              <th className="px-4 max-md:px-2 py-3 max-md:py-2 text-left">الرصيد</th>
              <th className="px-4 max-md:px-2 py-3 max-md:py-2">أقدم استحقاق</th>
              <th className="px-4 max-md:px-2 py-3 max-md:py-2">أيام التأخير</th>
              <th className="px-4 max-md:px-2 py-3 max-md:py-2">حالة التذكير</th>
              <th className="px-4 max-md:px-2 py-3 max-md:py-2">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--app-border)]">
            {rows.map((row) => {
              const classification = CLASSIFICATION_META[row.classification] ?? CLASSIFICATION_META.current;
              const reminder = REMINDER_STATUS_META[row.reminder_status] ?? REMINDER_STATUS_META.needs_reminder;
              return (
                <tr key={`${row.party_id}-${row.currency_code}`} className="hover:bg-[var(--app-surface-hover)] transition-colors">
                  <td className="px-4 max-md:px-2 py-3 max-md:py-2">
                    <p className="text-xs font-bold text-[var(--app-text)] whitespace-nowrap">
                      {row.party_name}
                    </p>
                    {row.party_phone && (
                      <p className="text-[10px] text-[var(--app-text-secondary)]" dir="ltr">
                        {row.party_phone}
                      </p>
                    )}
                  </td>
                  <td className="px-4 max-md:px-2 py-3 max-md:py-2">
                    <StatusBadge {...classification} />
                  </td>
                  <td className="px-4 max-md:px-2 py-3 max-md:py-2">
                    <span className="text-xs font-bold font-mono text-[var(--app-text)]" dir="ltr">
                      {formatCurrency(Number(row.outstanding_balance), row.currency_code)}
                    </span>
                    {row.has_broken_promise && (
                      <span className="block text-[9px] font-bold text-rose-500 mt-0.5">
                        ⚠️ وعد مخلَف
                      </span>
                    )}
                  </td>
                  <td className="px-4 max-md:px-2 py-3 max-md:py-2">
                    {row.oldest_due_date ? (
                      <span className="text-xs text-[var(--app-text-secondary)] font-mono" dir="ltr">
                        {row.oldest_due_date}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--app-text-secondary)]">—</span>
                    )}
                  </td>
                  <td className="px-4 max-md:px-2 py-3 max-md:py-2">
                    {row.days_overdue > 0 ? (
                      <span className="text-xs font-extrabold text-orange-600">
                        {row.days_overdue} يوم
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--app-text-secondary)]">—</span>
                    )}
                  </td>
                  <td className="px-4 max-md:px-2 py-3 max-md:py-2">
                    <StatusBadge {...reminder} />
                  </td>
                  <td className="px-4 max-md:px-2 py-3 max-md:py-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { setReminderRow(row); }}
                        title="تذكير عبر واتساب"
                        className="p-2 max-md:p-1.5 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white transition-all"
                      >
                        <MessageSquare size={14} />
                      </button>
                      <button
                        onClick={() => { setPromiseRow(row); }}
                        title="وعد سداد"
                        className="p-2 max-md:p-1.5 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white transition-all"
                      >
                        <Handshake size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {reminderRow && (
        <ReminderModal isOpen onClose={() => { setReminderRow(null); }} row={reminderRow} />
      )}

      {promiseRow && (
        <PromiseFormModal
          isOpen
          onClose={() => { setPromiseRow(null); }}
          partyId={promiseRow.party_id}
          partyName={promiseRow.party_name}
        />
      )}
    </>
  );
};

export default FollowUpTable;
