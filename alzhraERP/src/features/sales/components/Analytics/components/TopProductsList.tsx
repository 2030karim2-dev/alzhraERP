import React from 'react';
import { Package } from 'lucide-react';
import { useI18nStore } from '@/lib/i18nStore';

interface TopProduct {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
}

interface TopProductsListProps {
    topProducts: TopProduct[];
    totalSales: number;
    isLoading: boolean;
    formatCurrency: (value: number) => string;
    formatNumber: (value: number) => string;
}

export const TopProductsList: React.FC<TopProductsListProps> = ({
    topProducts,
    totalSales,
    isLoading,
    formatCurrency,
    formatNumber
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
                <Package size={18} className="text-emerald-600" />
                {t.top_products}
            </h4>
            <div className="space-y-3">
                {isLoading ? (
                    <div className="animate-pulse space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                        ))}
                    </div>
                ) : topProducts.length > 0 ? (
                    topProducts.slice(0, 5).map((product, index) => (
                        <div
                            key={product.productId || `prod-${index}`}
                            className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${getRankStyle(index)}`}>
                                    #{index + 1}
                                </span>
                                <div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        {product.productName}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {formatNumber(product.quantity)} {t.sales}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-slate-800 dark:text-white">
                                    {formatCurrency(product.revenue)}
                                </p>
                                <p className="text-xs text-emerald-500">
                                    +{Math.round(product.revenue / (totalSales || 1) * 100)}%
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8">
                        <Package size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-400">{t.no_data_available}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopProductsList;
