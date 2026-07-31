import React, { useMemo } from 'react';
import { TrendingDown, Calendar, Clock } from 'lucide-react';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import ProductExcelGrid from '../ProductExcelGrid';

interface Props {
    items: any[];
    daysThreshold: number;
}

const DeadStockTable: React.FC<Props> = ({ items, daysThreshold }) => {
    const { t } = useTranslation();

    const extraColumns = useMemo(() => [
        {
            header: 'آخر حركة بيع',
            accessor: (item: any) => (
                <div className="flex items-center gap-1.5 text-gray-500">
                    <Calendar size={12} />
                    <span className="text-[10px] font-bold">
                        {item.last_sale_date ? new Date(item.last_sale_date).toLocaleDateString('ar-SA') : 'لا يوجد مبيعات'}
                    </span>
                </div>
            ),
            width: 'w-32',
            sortKey: 'last_sale_date'
        },
        {
            header: 'أيام الركود',
            accessor: (item: any) => (
                <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-amber-500" />
                    <span className="px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-bold text-[10px]">
                        {item.days_since_last_sale ? `${item.days_since_last_sale} يوم` : '—'}
                    </span>
                </div>
            ),
            width: 'w-24',
            sortKey: 'days_since_last_sale'
        }
    ], []);

    if (!items || items.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-20">
                <TrendingDown size={48} className="mb-4 opacity-20" />
                <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">{t('excellent_no_dead_stock')}</h3>
                <p className="text-sm">{t('all_products_moving', { days: daysThreshold.toString() })}</p>
            </div>
        );
    }

    return (
        <ProductExcelGrid
            products={items}
            isLoading={false}
            hideActions={true}
            hideBulkActions={true}
            extraColumns={extraColumns}
            title="الأصناف الراكدة"
            subtitle={`يوجد ${items.length} صنف لم يتحرك منذ ${daysThreshold} يوم`}
            colorTheme="orange"
        />
    );
};

export default DeadStockTable;
