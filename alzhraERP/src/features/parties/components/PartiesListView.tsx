import React, { useState, useMemo } from 'react';
import { Filter, X } from 'lucide-react';
import type { Party, PartyType, PartyStats } from '../types';
import type { Column } from '../../../ui/common/ExcelTable';
import PartiesStats from './PartiesStats';
import ExcelTable from '../../../ui/common/ExcelTable';
import { cn } from '../../../core/utils';
import { useAccompanyingInfoStore } from '../../accompanying-info';

type FilterChip = 'all' | 'debtors' | 'creditors' | 'settled' | 'active' | 'blocked';

interface PartiesListViewProps {
  partyType: PartyType;
  parties?: Party[];
  isLoading: boolean;
  stats?: PartyStats;
  columns: Array<Column<Party>>;
  onEdit: (party: Party) => void;
}

export const PartiesListView: React.FC<PartiesListViewProps> = ({
  partyType,
  parties = [],
  isLoading,
  stats,
  columns,
  onEdit,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Extract unique categories from parties
  const categories = useMemo(() => {
    const set = new Set<string>();
    parties.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [parties]);

  // Filter parties by chip and category
  const filteredParties = useMemo(() => {
    return parties.filter(p => {
      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // Chip filter
      const bal = p.balance ?? 0;
      switch (activeFilter) {
        case 'debtors':
          return bal > 0;
        case 'creditors':
          return bal < 0;
        case 'settled':
          return bal === 0;
        case 'active':
          return (p.status ?? 'active') === 'active';
        case 'blocked':
          return p.status === 'blocked';
        case 'all':
        default:
          return true;
      }
    });
  }, [parties, activeFilter, selectedCategory]);

  // Counts for filter chips
  const counts = useMemo(() => {
    let debtors = 0;
    let creditors = 0;
    let settled = 0;
    let active = 0;
    let blocked = 0;

    parties.forEach(p => {
      const bal = p.balance ?? 0;
      if (bal > 0) debtors++;
      else if (bal < 0) creditors++;
      else settled++;

      if ((p.status ?? 'active') === 'active') active++;
      else if (p.status === 'blocked') blocked++;
    });

    return {
      all: parties.length,
      debtors,
      creditors,
      settled,
      active,
      blocked,
    };
  }, [parties]);

  const chips: Array<{ id: FilterChip; label: string; count: number; color?: string }> = [
    { id: 'all', label: 'الكل', count: counts.all },
    {
      id: 'debtors',
      label: partyType === 'customer' ? 'عليهم مديونية' : 'مدينون لنا',
      count: counts.debtors,
      color: 'emerald',
    },
    {
      id: 'creditors',
      label: partyType === 'customer' ? 'لهم أرصدة دائنة' : 'مستحق للمورد',
      count: counts.creditors,
      color: 'amber',
    },
    { id: 'settled', label: 'رصيد مسوّى', count: counts.settled },
    { id: 'active', label: 'نشط', count: counts.active },
    { id: 'blocked', label: 'محظور', count: counts.blocked, color: 'rose' },
  ];

  return (
    <div className="animate-in fade-in space-y-3 duration-500">
      <PartiesStats
        stats={
          stats ?? {
            totalCount: 0,
            totalBalance: 0,
            totalReceivable: 0,
            totalPayable: 0,
            activeCount: 0,
            blockedCount: 0,
          }
        }
        type={partyType}
      />

      {/* Filter Chips Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-1">
          {chips.map(chip => {
            const isSelected = activeFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  setActiveFilter(chip.id);
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                )}
              >
                <span>{chip.label}</span>
                <span
                  className={cn(
                    'py-0.2 rounded-full px-1.5 font-mono text-[10px]',
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                  )}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Category Filter & Reset */}
        <div className="flex items-center gap-2">
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Filter size={13} className="text-slate-400" />
              <select
                value={selectedCategory}
                onChange={e => {
                  setSelectedCategory(e.target.value);
                }}
                className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 outline-none transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">جميع الفئات</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(activeFilter !== 'all' || selectedCategory !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setActiveFilter('all');
                setSelectedCategory('all');
              }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              title="إلغاء التصفية"
            >
              <X size={12} />
              <span>إعادة ضبط</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-100 bg-[var(--app-surface)] shadow-sm dark:border-slate-800">
        <ExcelTable
          columns={columns}
          data={filteredParties}
          colorTheme={partyType === 'customer' ? 'blue' : 'indigo'}
          isRTL={true}
          showSearch={false}
          isLoading={isLoading}
          onRowClick={row => {
            const store = useAccompanyingInfoStore.getState();
            if (store.isOpen) {
              store.setTarget({
                type: partyType === 'supplier' ? 'supplier' : 'customer',
                id: row.id,
                title: row.name,
              });
            }
          }}
          onRowDoubleClick={row => {
            onEdit(row);
          }}
        />
      </div>
    </div>
  );
};

export default PartiesListView;
