import React, { useState } from 'react';
import { ChevronDown, Calendar, CheckCircle2, Clock, User } from 'lucide-react';
import { formatCurrency, formatNumberDisplay } from '../../../../core/utils';
import Badge from '../../../../ui/base/Badge';

interface JournalEntryCardProps {
  entry: any; // Using detailed types would be better, but sticking to existing pattern for now
}

const JournalEntryCard: React.FC<JournalEntryCardProps> = ({ entry }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Calculate totals for verification
  const totalDebit = (entry.journal_entry_lines || []).reduce(
    (sum: number, line: any) => sum + (line.debit_amount || 0),
    0
  );
  const totalCredit = (entry.journal_entry_lines || []).reduce(
    (sum: number, line: any) => sum + (line.credit_amount || 0),
    0
  );
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div
      className={`border bg-[var(--app-surface)] transition-all duration-200 ${isExpanded ? 'border-blue-500 ring-1 ring-blue-500' : 'border-[var(--app-border)] hover:border-blue-300'}`}
    >
      {/* Header / Summary Row */}
      <div
        className="group flex cursor-pointer items-center justify-between p-3 max-md:p-3"
        onClick={toggleExpand}
      >
        <div className="flex flex-1 items-center gap-3 max-md:gap-2">
          {/* Icon & Entry Number */}
          <div className="flex h-12 w-12 flex-col items-center justify-center border border-blue-100 bg-blue-50 font-mono text-sm font-bold text-blue-600 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
            <span className="text-[10px] uppercase text-blue-400">QID</span>
            <span>{entry.entry_number}</span>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-1 max-md:gap-0.5">
            <h3 className="line-clamp-1 text-sm font-bold text-[var(--app-text)] transition-colors group-hover:text-blue-600">
              {entry.description || 'بدون وصف'}
            </h3>
            <div className="flex items-center gap-3 text-xs text-[var(--app-text-secondary)] max-md:gap-2">
              <span className="flex items-center gap-1 rounded-[var(--radius)] bg-[var(--app-surface-hover)] px-2 py-0.5 text-[11px]">
                <Calendar size={12} />
                <span dir="ltr">{entry.entry_date}</span>
              </span>
              <span className="flex items-center gap-1">
                <span
                  className={`h-2 w-2 rounded-full ${isBalanced ? 'bg-emerald-500' : 'bg-red-500'}`}
                ></span>
                {isBalanced ? 'متوازن' : 'غير متوازن'}
              </span>
              {entry.reference_type && (
                <span className="rounded-[var(--radius)] border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-700">
                  {entry.reference_type === 'manual' ? 'قيد يدوي' : entry.reference_type}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side Stats */}
        <div className="flex items-center gap-6 max-md:gap-3">
          <div className="hidden text-start sm:block">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-secondary)]">
              الإجمالي
            </div>
            <div className="font-mono text-base font-bold text-[var(--app-text)]">
              {formatCurrency(totalDebit)}{' '}
              <span className="text-xs text-[var(--app-text-secondary)]">ر.ي</span>
            </div>
          </div>

          <div className="flex items-center gap-2 max-md:gap-1">
            {entry.status === 'posted' ? (
              <Badge variant="success" className="gap-1 px-2.5">
                <CheckCircle2 size={12} /> مرحل
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1 px-2.5">
                <Clock size={12} /> مسودة
              </Badge>
            )}
            <div
              className={`rounded-full p-1.5 transition-colors hover:bg-[var(--app-surface-hover)] max-md:p-1 ${isExpanded ? 'rotate-180 bg-[var(--app-surface-hover)]' : ''}`}
            >
              <ChevronDown size={18} className="text-[var(--app-text-secondary)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="animate-in slide-in-from-top-2 border-t border-[var(--app-border)] bg-[var(--app-surface-hover)] p-3 duration-200 max-md:p-2">
          {/* Detailed Table */}
          <div className="overflow-hidden border border-[var(--app-border)]">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] font-bold text-[var(--app-text-secondary)]">
                <tr>
                  <th className="w-1/3 px-4 py-2">الحساب</th>
                  <th className="px-4 py-2">الشرح / البيان</th>
                  <th className="w-24 px-4 py-2 text-start text-emerald-600">مدين</th>
                  <th className="w-24 px-4 py-2 text-start text-red-600">دائن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)] bg-[var(--app-surface)]">
                {(entry.journal_entry_lines || []).map((line: any, idx: number) => (
                  <tr
                    key={line.id || idx}
                    className="transition-colors hover:bg-blue-50/50 dark:hover:bg-slate-900"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col">
                        <span className="font-bold text-[var(--app-text)]">
                          {line.account?.name_ar || line.account?.name || '---'}
                        </span>
                        <span className="font-mono text-xs text-[var(--app-text-secondary)]">
                          {line.account?.code || '---'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--app-text-secondary)]">
                      {line.description || '-'}
                    </td>
                    <td className="bg-emerald-50/30 px-4 py-2.5 text-start font-mono text-sm font-bold text-emerald-600">
                      {line.debit_amount > 0 ? formatNumberDisplay(line.debit_amount) : '-'}
                    </td>
                    <td className="bg-red-50/30 px-4 py-2.5 text-start font-mono text-sm font-bold text-red-600">
                      {line.credit_amount > 0 ? formatNumberDisplay(line.credit_amount) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-[var(--app-border)] bg-[var(--app-surface-hover)] font-bold">
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-2 text-start text-xs uppercase tracking-wider text-[var(--app-text-secondary)]"
                  >
                    الإجمالي
                  </td>
                  <td className="px-4 py-2 text-start font-mono text-emerald-700">
                    {formatNumberDisplay(totalDebit)}
                  </td>
                  <td className="px-4 py-2 text-start font-mono text-red-700">
                    {formatNumberDisplay(totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer Metadata */}
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--app-text-secondary)]">
            <div className="flex items-center gap-2 max-md:gap-1">
              <User size={12} />
              <span>تم الإنشاء بواسطة: {entry.created_by_profile?.full_name || 'System'}</span>
            </div>
            <div className="font-mono tracking-widest opacity-50">{entry.id}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalEntryCard;
