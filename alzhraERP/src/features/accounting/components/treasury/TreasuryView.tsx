import React, { useState } from 'react';
import TreasurySidebar from './TreasurySidebar';
import LedgerView from '../reports/LedgerView';
import TreasurySummaryStats from './TreasurySummaryStats';
import TreasuryActions from './TreasuryActions';
import EmptyState from '../../../../ui/base/EmptyState';
import { Wallet } from 'lucide-react';
import CreateBondModal from '../../../bonds/components/CreateBondModal';
import { useBondMutation } from '../../../bonds/hooks';
import type { BondType } from '../../../bonds/types';

interface Props {
  dateRange: { from: string; to: string };
}

const TreasuryView: React.FC<Props> = ({ dateRange }) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<BondType>('receipt');

  const bondMutation = useBondMutation();

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

            {/* Quick Actions */}
            <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
              <h3 className="mb-4 text-base font-bold text-[var(--app-text)]">إجراءات سريعة</h3>
              <TreasuryActions onAction={handleAction} onPrint={handlePrint} />
            </div>

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
      />
    </div>
  );
};

export default TreasuryView;
