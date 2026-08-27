import React, { useState } from 'react';
import TreasurySidebar from './TreasurySidebar';
import LedgerView from '../reports/LedgerView';
import TreasurySummaryStats from './TreasurySummaryStats';
import TreasuryActions from './TreasuryActions';
import EmptyState from '../../../../ui/base/EmptyState';
import { Wallet } from 'lucide-react';
import CreateBondModal from '../../../bonds/components/CreateBondModal';
import { useBondMutation } from '../../../bonds/hooks';
import { BondType } from '../../../bonds/types';

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
        <div className="flex flex-col md:flex-row gap-4 max-md:gap-3 items-start h-full">
            <aside className="w-full md:w-80 lg:w-96 flex-shrink-0 bg-[var(--app-surface)] h-full border-s border-[var(--app-border)]">
                <TreasurySidebar onSelectAccount={setSelectedAccountId} selectedAccountId={selectedAccountId} />
            </aside>
            <main className="flex-1 w-full p-4 overflow-y-auto">
                {selectedAccountId ? (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
                        {/* Summary Cards */}
                        <TreasurySummaryStats accountId={selectedAccountId} dateRange={dateRange} />

                        {/* Quick Actions */}
                        <div className="bg-[var(--app-surface)] p-4 border border-[var(--app-border)] shadow-sm">
                            <h3 className="text-base font-bold mb-4 text-[var(--app-text)]">إجراءات سريعة</h3>
                            <TreasuryActions onAction={handleAction} onPrint={handlePrint} />
                        </div>

                        {/* Transactions Table */}
                        <div className="bg-[var(--app-surface)] border border-[var(--app-border)] shadow-sm overflow-hidden">
                            <LedgerView dateRange={dateRange} accountId={selectedAccountId} />
                        </div>
                    </div>
                ) : (
                    <div className="mt-20 max-w-md mx-auto">
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
                onClose={() => setIsModalOpen(false)}
                type={activeAction}
                onSubmit={handleBondSubmit}
                isSubmitting={bondMutation.isPending}
            />
        </div>
    );
};

export default TreasuryView;
