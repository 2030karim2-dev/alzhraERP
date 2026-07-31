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
        <div className="flex flex-col md:flex-row gap-4 items-start h-full">
            <aside className="w-full md:w-80 lg:w-96 flex-shrink-0 bg-white dark:bg-slate-900 h-full border-l dark:border-slate-800">
                <TreasurySidebar onSelectAccount={setSelectedAccountId} selectedAccountId={selectedAccountId} />
            </aside>
            <main className="flex-1 w-full p-4 overflow-y-auto">
                {selectedAccountId ? (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
                        {/* Summary Cards */}
                        <TreasurySummaryStats accountId={selectedAccountId} dateRange={dateRange} />

                        {/* Quick Actions */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
                            <h3 className="text-lg font-bold mb-4">إجراءات سريعة</h3>
                            <TreasuryActions onAction={handleAction} onPrint={handlePrint} />
                        </div>

                        {/* Transactions Table */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
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
