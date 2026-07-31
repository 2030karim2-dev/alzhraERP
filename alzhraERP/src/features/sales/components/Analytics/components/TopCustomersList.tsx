import React from 'react';
import { Users } from 'lucide-react';
import { useI18nStore } from '@/lib/i18nStore';

interface TopCustomer {
    customerId: string;
    customerName: string;
    totalAmount: number;
    invoiceCount?: number;
}

interface TopCustomersListProps {
    topCustomers: TopCustomer[];
    isLoading: boolean;
    formatCurrency: (value: number) => string;
}

export const TopCustomersList: React.FC<TopCustomersListProps> = ({
    topCustomers,
    isLoading,
    formatCurrency
}) => {
    const { dictionary: t } = useI18nStore();

    const getRankStyle = (index: number) => {
        switch (index) {
            case 0:
                return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            case 1:
                return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
            case 2:
                return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
            default:
                return 'bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500';
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
            <h4 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                <Users size={18} className="text-blue-600" />
                {t.top_customers}
            </h4>
            <div className="space-y-3">
                {isLoading ? (
                    <div className="animate-pulse space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                        ))}
                    </div>
                ) : topCustomers.length > 0 ? (
                    topCustomers.slice(0, 5).map((customer, index) => (
                        <div
                            key={customer.customerId || `cust-${index}`}
                            className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${getRankStyle(index)}`}>
                                    #{index + 1}
                                </span>
                                <div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        {customer.customerName}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {customer.invoiceCount || 0} {t.invoices_count}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-slate-800 dark:text-white">
                                    {formatCurrency(customer.totalAmount)}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8">
                        <Users size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-400">{t.no_data_available}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopCustomersList;
