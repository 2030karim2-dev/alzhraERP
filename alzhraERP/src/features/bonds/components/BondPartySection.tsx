import React from 'react';
import { Search, Landmark, Building, Wallet } from 'lucide-react';
import type { UseFormRegister } from 'react-hook-form';
import { cn } from '../../../core/utils';
import type { BondType, BondFormData } from '../types';
import type { Party } from '../../parties/types';

interface AccountOption {
  id: string;
  code: string;
  name: string;
}

interface BondPartySectionProps {
  type: BondType;
  register: UseFormRegister<BondFormData>;
  setValue: (field: 'counterparty_type', value: 'party' | 'account') => void;
  counterpartyType: string;
  partyQuery: string;
  setPartyQuery: (query: string) => void;
  showPartyDropdown: boolean;
  setShowPartyDropdown: (show: boolean) => void;
  parties: Party[];
  cashAccounts: AccountOption[];
  otherAccounts: AccountOption[];
  handlePartySelect: (party: Party) => void;
}

/** Shared styled select shell for account pickers. */
export const AccountSelector: React.FC<{
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
  [key: string]: unknown;
}> = ({ label, icon: Icon, children, ...props }) => (
  <div className="space-y-1.5">
    <label className="px-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
      {label}
    </label>
    <div className="relative">
      <select
        {...props}
        className="w-full appearance-none rounded-xl border-2 border-gray-100 bg-white p-3 pr-10 text-sm font-bold text-slate-800 outline-none focus:border-blue-500/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        {children}
      </select>
      <Icon className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
    </div>
  </div>
);

/** Display identifier for a party row in the search dropdown. */
const partyDisplayCode = (p: Party): string => {
  if (p.phone !== null && p.phone !== '') return p.phone;
  return p.tax_number !== '' ? p.tax_number : p.id.split('-')[0];
};

/** Counterparty tabs, party search dropdown and account selectors. */
// eslint-disable-next-line max-lines-per-function -- composes tabs + dropdown + two account selectors; splitting further would scatter the counterparty selection contract.
export const BondPartySection: React.FC<BondPartySectionProps> = ({
  type,
  register,
  setValue,
  counterpartyType,
  partyQuery,
  setPartyQuery,
  showPartyDropdown,
  setShowPartyDropdown,
  parties,
  cashAccounts,
  otherAccounts,
  handlePartySelect,
}) => {
  const isPartyMode = counterpartyType === 'party';

  return (
    <div className="space-y-4 rounded-2xl border border-gray-100 bg-[var(--app-surface)] p-4 shadow-sm dark:border-slate-800 sm:rounded-3xl sm:p-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-50 p-1 px-3 text-[10px] font-black uppercase tracking-tighter text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
            أطراف المعاملة والحسابات
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400">طريقة الدفع:</span>
          <select
            {...register('payment_method')}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="cash">نقداً</option>
            <option value="bank">حوالة بنكية / شيك</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <CounterpartyTabs
          disabled={type === 'transfer'}
          counterpartyType={counterpartyType}
          setValue={setValue}
        />

        {isPartyMode ? (
          <PartySearchDropdown
            type={type}
            partyQuery={partyQuery}
            setPartyQuery={setPartyQuery}
            showPartyDropdown={showPartyDropdown}
            setShowPartyDropdown={setShowPartyDropdown}
            parties={parties}
            handlePartySelect={handlePartySelect}
          />
        ) : (
          <AccountSelector
            label={type === 'transfer' ? 'الحساب المحول إليه (الهدف)' : 'الحساب المقابل في القيد'}
            icon={Landmark}
            {...register('counterparty_id', { required: true })}
          >
            <option value="">-- اختر الحساب {type === 'transfer' ? 'الهدف' : ''} --</option>
            {(type === 'transfer' ? cashAccounts : otherAccounts).map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.code} - {acc.name}
              </option>
            ))}
          </AccountSelector>
        )}
      </div>

      <AccountSelector
        label={type === 'transfer' ? 'الحساب المحول منه (المصدر)' : 'حساب الصندوق أو البنك'}
        icon={Wallet}
        {...register('cash_account_id', { required: true })}
      >
        <option value="">-- اختر الصندوق أو البنك {type === 'transfer' ? 'المصدر' : ''} --</option>
        {cashAccounts.map(acc => (
          <option key={acc.id} value={acc.id}>
            {acc.code} - {acc.name}
          </option>
        ))}
      </AccountSelector>
    </div>
  );
};

interface CounterpartyTabsProps {
  disabled: boolean;
  counterpartyType: string;
  setValue: (field: 'counterparty_type', value: 'party' | 'account') => void;
}

const CounterpartyTabs: React.FC<CounterpartyTabsProps> = ({
  disabled,
  counterpartyType,
  setValue,
}) => (
  <div
    className={cn(
      'flex h-11 rounded-2xl border bg-slate-50 p-1.5 dark:border-slate-800 dark:bg-slate-950',
      disabled && 'pointer-events-none opacity-50'
    )}
  >
    <button
      type="button"
      onClick={() => {
        setValue('counterparty_type', 'party');
      }}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-xl text-[11px] font-black transition-all',
        counterpartyType === 'party'
          ? 'bg-white text-blue-600 shadow-md dark:bg-slate-700'
          : 'text-gray-400 hover:text-gray-500'
      )}
    >
      <Building size={14} /> جهة (عميل / مورد)
    </button>
    <button
      type="button"
      onClick={() => {
        setValue('counterparty_type', 'account');
      }}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-xl text-[11px] font-black transition-all',
        counterpartyType === 'account'
          ? 'bg-white text-blue-600 shadow-md dark:bg-slate-700'
          : 'text-gray-400 hover:text-gray-500'
      )}
    >
      <Landmark size={14} /> حساب عام من الدليل
    </button>
  </div>
);

interface PartySearchDropdownProps {
  type: BondType;
  partyQuery: string;
  setPartyQuery: (query: string) => void;
  showPartyDropdown: boolean;
  setShowPartyDropdown: (show: boolean) => void;
  parties: Party[];
  handlePartySelect: (party: Party) => void;
}

// eslint-disable-next-line max-lines-per-function -- search input + dropdown list is one cohesive widget.
const PartySearchDropdown: React.FC<PartySearchDropdownProps> = ({
  type,
  partyQuery,
  setPartyQuery,
  showPartyDropdown,
  setShowPartyDropdown,
  parties,
  handlePartySelect,
}) => {
  const showDropdown = showPartyDropdown && partyQuery.length > 0 && parties.length > 0;

  return (
    <div className="group relative">
      <input
        type="text"
        value={partyQuery}
        onChange={e => {
          setPartyQuery(e.target.value);
          setShowPartyDropdown(true);
        }}
        onFocus={() => {
          if (parties.length > 0) setShowPartyDropdown(true);
        }}
        placeholder={
          type === 'receipt'
            ? 'ابحث بالاسم أو الهاتف عن العميل...'
            : 'ابحث بالاسم أو الهاتف عن المورد...'
        }
        className="w-full rounded-2xl border-2 border-transparent bg-slate-50 p-3.5 pl-12 text-sm font-bold text-slate-800 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500/30 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-500/20"
      />
      <Search
        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500"
        size={18}
      />
      {showDropdown && (
        <div className="animate-in fade-in zoom-in-95 absolute z-30 mt-2 max-h-56 w-full overflow-auto rounded-2xl border bg-white shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-800">
          {parties.map(p => (
            <button
              type="button"
              key={p.id}
              onClick={() => {
                handlePartySelect(p);
              }}
              className="flex w-full cursor-pointer items-center justify-between border-b p-3.5 text-right transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-700/50"
            >
              <div className="flex flex-col">
                <span className="text-sm font-black text-gray-800 dark:text-slate-100">
                  {p.name}
                </span>
                <span className="font-mono text-[10px] font-bold text-gray-400">
                  {partyDisplayCode(p)}
                </span>
              </div>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-sm',
                  p.type === 'customer'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                )}
              >
                {p.type === 'customer' ? 'عميل' : 'مورد'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BondPartySection;
