import React from 'react';
import type { PartyType } from '../types';
import { cn } from '../../../core/utils';
import { useTranslation } from '../../../lib/hooks/useTranslation';

interface PartyTypeSwitcherProps {
  partyType: PartyType;
  onSwitch: (type: PartyType) => void;
}

/**
 * Segmented control for party type — navigates between /clients and /suppliers
 * (URL is the single source of truth — docs/archive/plans/party-routes-tabs-cleanup.md).
 */
export const PartyTypeSwitcher: React.FC<PartyTypeSwitcherProps> = ({ partyType, onSwitch }) => {
  const { t } = useTranslation();
  return (
    <div
      className="flex items-center gap-1 px-2 pt-3 md:px-4"
      role="tablist"
      aria-label="العملاء والموردون"
    >
      {(['customer', 'supplier'] as PartyType[]).map(type => (
        <button
          key={type}
          type="button"
          role="tab"
          aria-selected={partyType === type}
          onClick={() => {
            onSwitch(type);
          }}
          className={cn(
            'rounded-lg px-4 py-1.5 text-xs font-bold transition-all',
            partyType === type
              ? type === 'customer'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          )}
        >
          {type === 'customer' ? t('customers') : t('suppliers')}
        </button>
      ))}
    </div>
  );
};

export default PartyTypeSwitcher;
