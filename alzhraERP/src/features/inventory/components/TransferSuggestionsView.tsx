import React from 'react';
import { useSmartTransferSuggestions } from '../hooks/useSmartTransferSuggestions';
import { useProducts } from '../hooks/useProducts';
import { useWarehouses } from '../hooks/useInventoryManagement';
import SmartSuggestionsSection from './transfers/SmartSuggestionsSection';
import TableSkeleton from '../../../ui/base/TableSkeleton';
import EmptyState from '../../../ui/base/EmptyState';
import { Sparkles } from 'lucide-react';

const TransferSuggestionsView: React.FC = () => {
    const { products, isLoading: isProductsLoading } = useProducts('');
    const { data: warehouses, isLoading: isWarehousesLoading } = useWarehouses();
    const { suggestions } = useSmartTransferSuggestions(products, warehouses);

    if (isProductsLoading || isWarehousesLoading) {
        return <TableSkeleton rows={4} cols={1} />;
    }

    if (!suggestions || suggestions.length === 0) {
        return (
            <EmptyState
                icon={Sparkles}
                title="لا توجد اقتراحات حالياً"
                description="المخزون متوازن بشكل جيد عبر مستودعاتك. سنقوم بالتنبيه عند الحاجة لتحويل الأصناف."
            />
        );
    }

    return (
        <div className="h-full flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-6 rounded-2xl">
                <div className="flex items-center gap-4 text-indigo-600 dark:text-indigo-400 mb-2">
                    <Sparkles className="animate-pulse" />
                    <h2 className="text-xl font-black">المساعد الذكي للمناقلات</h2>
                </div>
                <p className="text-sm text-indigo-800 dark:text-indigo-300 opacity-80">
                    بناءً على مستويات المخزون الحالية، التزمنا بتحسين توزيع البضائع بين الفروع والمستودعات لتقليل النقص وتحسين الكفاءة.
                </p>
            </div>

            <SmartSuggestionsSection 
                suggestions={suggestions} 
                onTransfer={() => {
                    // This would ideally open the transfer modal with pre-filled data
                    // For now, we follow the existing pattern in TransfersView
                }} 
            />
        </div>
    );
};

export default TransferSuggestionsView;
