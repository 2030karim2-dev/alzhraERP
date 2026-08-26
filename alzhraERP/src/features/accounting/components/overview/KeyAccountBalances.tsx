
import React from 'react';
// Fix: Corrected import path to point to the barrel file.
import { useAccounts } from '../../hooks/index';
import { Wallet, Landmark, Users, Building, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';
import { useCurrencies } from '../../../settings/hooks';
import type { Account } from '../../types/models';
import Card from '../../../../ui/base/Card';

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
      <Card variant="ledger" className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--app-text-secondary)]" />
      </Card>
    );
  }

  /**
   * إيجاد الحساب الأب لمجموعة "أرصدة رئيسية" بشكل مرن:
   * 1) مطابقة دقيقة بالكود (مخطط حسابات افتراضي)،
   * 2) ثم مطابقة بادئة الكود (مثال: كل حسابات 10xx تعتبر أصولاً متفرعة عن الصناديق/البنوك)،
   * 3) ثم مطابقة النوع المحاسبي + كلمة مفتاحية من الاسم لخطط الحسابات المختلفة.
   * يعيد null عندما لا يوجد حساب مطابق — ويُعرض "—" بدل صفر مضلل.
   */
  const findRootAccount = (ka: { code: string; label: string }): Account | null => {
    if (!accounts || accounts.length === 0) return null;

    const exact = accounts.find(a => a.code === ka.code);
    if (exact) return exact;

    const prefix = ka.code.slice(0, 2);
    const byPrefix = accounts.find(a => a.code.startsWith(prefix) && (a.parent_id === null || a.parent_id === undefined));
    if (byPrefix) return byPrefix;

    const keywords = {
      'الصناديق': ['صندوق', 'نقد', 'cash'],
      'البنوك': ['بنك', 'bank'],
      'ذمم العملاء': ['عميل', 'ذمم', 'customer', 'receivable'],
      'ذمم الموردين': ['مورد', 'ذمم', 'supplier', 'payable'],
    }[ka.label] || [];

    const byType = accounts.find(a => {
      if (!a.name && !a.name_ar) return false;
      const haystack = `${a.name || ''} ${a.name_ar || ''}`.toLowerCase();
      return keywords.some(k => haystack.includes(k.toLowerCase()));
    });
    return byType || null;
  };

  /** حساب الرصيد المجمّع (الحساب الأب + فروعه المباشرة) مع تحويل العملة. */
  const computeBalance = (root: Account): number => {
    const children = accounts?.filter(a => a.parent_id === root.id) || [];
    return children.reduce(
      (sum, child) => sum + toBaseCurrency(child.balance || 0, child.currency_code),
      toBaseCurrency(root.balance || 0, root.currency_code)
    );
  };

  return (
    <Card variant="ledger">
      <h3 className="text-[10px] font-bold text-[var(--app-text-secondary)] uppercase tracking-widest mb-3 px-1">أرصدة رئيسية</h3>
      <div className="space-y-1">
        {keyAccounts.map(ka => {
          const root = findRootAccount(ka);
          const hasAccount = root !== null;
          const totalBalance = hasAccount ? computeBalance(root) : null;
          return (
            <div key={ka.code} className="flex justify-between items-center p-2 hover:bg-[var(--app-surface-hover)] transition-colors">
              <div className="flex items-center gap-2">
                <ka.icon size={14} className={ka.color} />
                <span className="text-[11px] font-bold text-[var(--app-text)]">{ka.label}</span>
              </div>
              <span dir="ltr" className={`text-[11px] font-bold font-mono ${(totalBalance ?? 0) < 0 ? 'text-rose-600' : 'text-[var(--app-text)]'}`}>
                {hasAccount ? formatCurrency(totalBalance ?? 0) : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default KeyAccountBalances;