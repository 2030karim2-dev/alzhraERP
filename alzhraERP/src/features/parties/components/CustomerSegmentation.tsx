import React from 'react';
import { useParties } from '../hooks';
import { Users, UserCheck, Crown } from 'lucide-react';

interface CustomerSegmentationProps {
    companyId?: string;
}

export const CustomerSegmentation: React.FC<CustomerSegmentationProps> = () => {
    const { data: customers, isLoading } = useParties('customer');

    if (isLoading) {
        return <div className="h-28 animate-pulse bg-[var(--app-surface)] rounded-2xl max-md:rounded-xl" />;
    }

    const totalCustomers = customers?.length || 0;
    const activeCustomers = customers?.filter(c => (c.balance || 0) > 0).length || 0;
    const vipCustomers = customers?.filter(c => (c.balance || 0) > 10000).length || 0;

    return (
        <div className="bg-[var(--app-surface)]/80 backdrop-blur-xl border border-[var(--app-border)] rounded-2xl max-md:rounded-xl p-4 max-md:p-3 relative overflow-hidden group hover:border-[var(--accent)]/30 transition-all duration-300">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
                    <Users size={16} />
                </div>
                <h3 className="text-xs font-bold text-[var(--app-text)]">تصنيف العملاء</h3>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
                <div className="text-center p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <div className="text-lg font-bold font-mono text-blue-500 leading-tight">{totalCustomers}</div>
                    <div className="text-[9px] font-bold text-[var(--app-text-secondary)] mt-1 flex items-center justify-center gap-1">
                        <Users size={10} />
                        إجمالي
                    </div>
                </div>
                <div className="text-center p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <div className="text-lg font-bold font-mono text-emerald-500 leading-tight">{activeCustomers}</div>
                    <div className="text-[9px] font-bold text-[var(--app-text-secondary)] mt-1 flex items-center justify-center gap-1">
                        <UserCheck size={10} />
                        نشطون
                    </div>
                </div>
                <div className="text-center p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <div className="text-lg font-bold font-mono text-purple-500 leading-tight">{vipCustomers}</div>
                    <div className="text-[9px] font-bold text-[var(--app-text-secondary)] mt-1 flex items-center justify-center gap-1">
                        <Crown size={10} />
                        VIP
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerSegmentation;
