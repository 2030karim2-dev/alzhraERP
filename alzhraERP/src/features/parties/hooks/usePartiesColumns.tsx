import { useMemo } from 'react';
import { Edit, Trash2, History, Globe } from 'lucide-react';
import type { Party, PartyType } from '../types';
import type { Column } from '../../../ui/common/ExcelTable';
import Avatar from '../../../ui/base/Avatar';
import { formatCurrency, cn } from '../../../core/utils';
import { useTranslation } from '../../../lib/hooks/useTranslation';

interface UsePartiesColumnsProps {
  partyType: PartyType;
  onEdit: (party: Party) => void;
  onDelete: (partyId: string) => void;
  onOpenTimeline: (party: Party) => void;
  onOpenPortal: (party: Party) => void;
}

export function usePartiesColumns({
  partyType,
  onEdit,
  onDelete,
  onOpenTimeline,
  onOpenPortal,
}: UsePartiesColumnsProps): Array<Column<Party>> {
  const { t } = useTranslation();

  return useMemo(
    () => [
      {
        header: t('name'),
        accessor: (row: Party) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.name} size="sm" />
            <div className="flex translate-y-[1px] flex-col items-start">
              <span className="font-bold leading-tight text-gray-900 dark:text-white">
                {row.name}
              </span>
              {row.email && (
                <span className="text-[10px] font-medium text-gray-400">{row.email}</span>
              )}
            </div>
          </div>
        ),
        accessorKey: 'name',
        sortKey: 'name',
        align: 'right',
      },
      {
        header: t('phone'),
        accessor: (row: Party) => (
          <span dir="ltr" className="font-mono text-xs text-slate-500">
            {row.phone || '---'}
          </span>
        ),
        accessorKey: 'phone',
        width: '140px',
        align: 'center',
      },
      {
        header: t('category'),
        accessor: (row: Party) => (
          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {row.category || t('general')}
          </span>
        ),
        accessorKey: 'category',
        width: '100px',
        align: 'center',
      },
      {
        header: t('status'),
        accessor: (row: Party) => (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
              row.status === 'active'
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30'
            )}
          >
            {row.status === 'active' ? t('active') : t('blocked')}
          </span>
        ),
        accessorKey: 'status',
        width: '80px',
        align: 'center',
      },
      {
        header: t('balance'),
        accessor: (row: Party) => {
          const currencies = row.balances_by_currency?.filter(c => c.balance !== 0) || [];
          if (currencies.length > 0) {
            return (
              <div className="flex flex-col items-center gap-1">
                {currencies.map(c => (
                  <span
                    key={c.currency}
                    dir="ltr"
                    className={cn(
                      'rounded-md px-2 py-0.5 font-mono text-xs font-bold tracking-tighter',
                      c.balance > 0
                        ? 'border border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'border border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/40 dark:text-rose-400'
                    )}
                  >
                    {formatCurrency(c.balance, c.currency)}
                  </span>
                ))}
              </div>
            );
          }
          const val = Number(row.balance);
          return (
            <span
              dir="ltr"
              className={cn(
                'font-mono text-sm font-bold tracking-tighter',
                val === 0 ? 'text-gray-400' : val > 0 ? 'text-emerald-600' : 'text-rose-600'
              )}
            >
              {formatCurrency(val)}
            </span>
          );
        },
        accessorKey: 'balance',
        sortKey: 'balance',
        width: '140px',
        align: 'center',
      },
      {
        header: t('actions'),
        accessor: (row: Party) => (
          <div className="flex items-center justify-center gap-1">
            {partyType === 'supplier' && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onOpenPortal(row);
                }}
                className="rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                title="رابط بوابة المورد"
              >
                <Globe size={14} />
              </button>
            )}
            {partyType === 'customer' && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onOpenTimeline(row);
                }}
                className="rounded-lg p-1.5 text-purple-600 transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/20"
                title="تاريخ العميل"
              >
                <History size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onEdit(row);
              }}
              className="rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20"
              title={t('edit')}
            >
              <Edit size={14} />
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                if (window.confirm(t('confirm_delete'))) onDelete(row.id);
              }}
              className="rounded-lg p-1.5 text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20"
              title={t('delete')}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
        width: '120px',
        align: 'center',
      },
    ],
    [t, partyType, onEdit, onDelete, onOpenTimeline, onOpenPortal]
  );
}

export default usePartiesColumns;
