
import React from 'react';
// Fix: Corrected import path to point to the barrel file.
import { useAccounts } from '../../hooks/index';
import { Wallet, Landmark, Users, Building, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';
import { useCurrencies } from '../../../settings/hooks';

const KeyAccountBalances: React.FC = () => {
  const { data: accounts, isLoading } = useAccounts();
  const { rates } = useCurrencies();

  // تحويل رصيد الحساب للعملة الأساسية (SAR)
  const toBaseCurrency = (balance: number, currencyCode?: string): number => {
    if (!currencyCode || currencyCode === 'SAR') return balance;
    // جلب آخر سعر صرف لهذه العملة
    const history = (rates.data as any[])?.filter((r: any) => r.currency_code === currencyCode) || [];
    const rate = history.length > 0 ? Number(history[0].rate_to_base) : 1;
    return balance * rate;
  };

  const keyAccounts = [
    { code: '1010', label: 'الصناديق', icon: Wallet, color: 'text-emerald-500' },
    { code: '1020', label: 'البنوك', icon: Landmark, color: 'text-blue-500' },
    { code: '1100', label: 'ذمم العملاء', icon: Users, color: 'text-amber-500' },
    { code: '2010', label: 'ذمم الموردين', icon: Building, color: 'text-rose-500' },
  ];

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-none border border-gray-100 dark:border-slate-800 p-4 shadow-sm h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-none border border-gray-100 dark:border-slate-800 p-3 shadow-sm">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">أرصدة رئيسية</h3>
      <div className="space-y-1">
        {keyAccounts.map(ka => {
          const account = accounts?.find(a => a.code === ka.code);
          // تجميع أرصدة الحسابات الفرعية مع الحساب الأب
          const children = accounts?.filter(a => a.parent_id === account?.id) || [];
          let totalBalance = toBaseCurrency(account?.balance || 0, account?.currency_code);
          children.forEach(child => {
            totalBalance += toBaseCurrency(child.balance || 0, child.currency_code);
          });
          return (
            <div key={ka.code} className="flex justify-between items-center p-2 hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
              <div className="flex items-center gap-2">
                <ka.icon size={14} className={ka.color} />
                <span className="text-[10px] font-bold text-gray-700 dark:text-slate-200">{ka.label}</span>
              </div>
              <span dir="ltr" className={`text-[11px] font-bold font-mono ${totalBalance < 0 ? 'text-rose-600' : 'text-gray-800 dark:text-slate-100'}`}>
                {formatCurrency(totalBalance)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KeyAccountBalances;