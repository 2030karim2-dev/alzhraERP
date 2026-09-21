/* eslint-disable complexity, max-lines-per-function */
import React from 'react';
import type { PartyType } from '../types';
import { cn } from '../../../core/utils';
import { useTranslation } from '../../../lib/hooks/useTranslation';

interface PartyTypeSwitcherProps {
  partyType: PartyType;
  onSwitch: (type: PartyType) => void;
  customerCount?: number | undefined;
  supplierCount?: number | undefined;
  employeeCount?: number | undefined;
}

/**
 * Segmented control for party type — navigates between /clients, /suppliers, and /employees
 * (URL is the single source of truth — docs/archive/plans/party-routes-tabs-cleanup.md).
 */
export const PartyTypeSwitcher: React.FC<PartyTypeSwitcherProps> = ({
  partyType,
  onSwitch,
  customerCount,
  supplierCount,
  employeeCount,
}) => {
  const { t } = useTranslation();
  return (
    <div
      className="flex items-center gap-1.5 px-2 pt-3 md:px-4"
      role="tablist"
      aria-label="العملاء والموردون والموظفون"
    >
      {(['customer', 'supplier', 'employee'] as PartyType[]).map(type => {
        const isSelected = partyType === type;
        const count =
          type === 'customer' ? customerCount : type === 'supplier' ? supplierCount : employeeCount;
        return (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => {
              onSwitch(type);
            }}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-bold transition-all',
              isSelected
                ? type === 'customer'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                  : type === 'employee'
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/20'
                    : 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                : 'border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            )}
          >
            <span>
              {type === 'customer'
                ? t('customers')
                : type === 'supplier'
                  ? t('suppliers')
                  : 'الموظفون'}
            </span>
            {count !== undefined && count > 0 && (
              <span
                className={cn(
                  'py-0.2 rounded-full px-1.5 font-mono text-[10px]',
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default PartyTypeSwitcher;
