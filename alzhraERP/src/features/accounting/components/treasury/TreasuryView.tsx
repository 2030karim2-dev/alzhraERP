import React, { useState, useEffect, useMemo } from 'react';
import TreasurySidebar from './TreasurySidebar';
import LedgerView from '../reports/LedgerView';
import TreasurySummaryStats from './TreasurySummaryStats';
import TreasuryActions from './TreasuryActions';
import EmptyState from '../../../../ui/base/EmptyState';
import { Wallet, Info, ArrowLeft } from 'lucide-react';
import CreateBondModal from '../../../bonds/components/CreateBondModal';
import FxRevaluationModal from './FxRevaluationModal';
import { useBondMutation } from '../../../bonds/hooks';
import { useAccounts } from '../../hooks/index';
import { useTreasuryMutations } from '../../hooks/useTreasury';
import type { BondType } from '../../../bonds/types';

interface Props {
  dateRange: { from: string; to: string };
}

const TreasuryView: React.FC<Props> = ({ dateRange }) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRevalueModalOpen, setIsRevalueModalOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<BondType>('receipt');

  const { data: accounts } = useAccounts();
  const bondMutation = useBondMutation();
  const { revalueCurrency, isRevaluing } = useTreasuryMutations();

  // Auto-select the first operational leaf cashbox (e.g. 101001) by default
  useEffect(() => {
    if (!selectedAccountId && accounts && accounts.length > 0) {
      const defaultCashbox =
        accounts.find(a => a.code === '101001') ||
        accounts.find(
          a =>
            a.code.startsWith('10') && a.allow_posting && !accounts.some(c => c.parent_id === a.id)
        );
      if (defaultCashbox) {
        setSelectedAccountId(defaultCashbox.id);
      }
    }
  }, [accounts, selectedAccountId]);

  const selectedAccount = useMemo(
    () => accounts?.find(a => a.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

  const childAccounts = useMemo(
    () => accounts?.filter(a => a.parent_id === selectedAccountId) || [],
    [accounts, selectedAccountId]
  );

  const isParentAccount =
    childAccounts.length > 0 || (selectedAccount ? !selectedAccount.allow_posting : false);

  const handleAction = (action: BondType) => {
    setActiveAction(action);
    setIsModalOpen(true);
  };

  const handleBondSubmit = async (data: any) => {
    try {
      await bondMutation.mutateAsync(data);
      setIsModalOpen(false);
    } catch (error) {
      // Error handled by hook toast
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex h-full flex-col items-start gap-4 max-md:gap-3 md:flex-row">
      <aside className="h-full w-full flex-shrink-0 border-s border-[var(--app-border)] bg-[var(--app-surface)] md:w-80 lg:w-96">
        <TreasurySidebar
          onSelectAccount={setSelectedAccountId}
          selectedAccountId={selectedAccountId}
        />
      </aside>
      <main className="w-full flex-1 overflow-y-auto p-4">
        {selectedAccountId ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-500">
            {/* Summary Cards */}
            <TreasurySummaryStats accountId={selectedAccountId} dateRange={dateRange} />

            {/* If parent header account: show informative banner and quick navigation chips */}
            {isParentAccount ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-start gap-3">
                  <Info size={18} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div className="flex-1 space-y-2">
                    <div>
                      <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">
                        حساب رئيسي تجميعي: {selectedAccount?.name} ({selectedAccount?.code})
                      </h4>
                      <p className="text-[11px] text-blue-700 dark:text-blue-300">
                        يعرض كشف الحساب أدناه إجمالي الحركات المجمّعة لكافة الصناديق التابعة له.
                        لإصدار سندات قبض أو صرف أو إجراء تحويلات، يرجى اختيار أحد الصناديق التشغيلية
                        أدناه:
                      </p>
                    </div>
                    {childAccounts.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {childAccounts.map(child => (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => {
                              setSelectedAccountId(child.id);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
                          >
                            <span>{child.name}</span>
                            <span className="text-[10px] opacity-70">({child.code})</span>
                            <ArrowLeft size={12} className="text-blue-500" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Quick Actions (only available for operational accounts) */
              <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
                <h3 className="mb-4 text-base font-bold text-[var(--app-text)]">إجراءات سريعة</h3>
                <TreasuryActions
                  onAction={handleAction}
                  onPrint={handlePrint}
                  showRevalue={
                    !!(selectedAccount?.currency_code && selectedAccount.currency_code !== 'SAR')
                  }
                  onRevalue={() => setIsRevalueModalOpen(true)}
                />
              </div>
            )}

            {/* Transactions Table */}
            <div className="overflow-hidden border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
              <LedgerView dateRange={dateRange} accountId={selectedAccountId} />
            </div>
          </div>
        ) : (
          <div className="mx-auto mt-20 max-w-md">
            <EmptyState
              icon={Wallet}
              title="مركز إدارة السيولة"
              description="اختر صندوقاً أو حساباً بنكياً من القائمة لعرض كشف حسابه التفصيلي وإدارة عملياته."
            />
          </div>
        )}
      </main>

      <CreateBondModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        type={activeAction}
        onSubmit={handleBondSubmit}
        isSubmitting={bondMutation.isPending}
        defaultAccountId={selectedAccountId}
      />

      <FxRevaluationModal
        isOpen={isRevalueModalOpen}
        onClose={() => setIsRevalueModalOpen(false)}
        account={selectedAccount || null}
        onSubmit={async params => {
          await revalueCurrency(params);
        }}
        isSubmitting={isRevaluing}
      />
    </div>
  );
};

export default TreasuryView;
