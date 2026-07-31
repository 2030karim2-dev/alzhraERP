import React, { useState, useRef } from 'react';
import { Plus, Eye, RotateCcw, FileText } from 'lucide-react';
import { usePurchaseReturns, usePurchaseReturnsStats } from '../../hooks/usePurchaseReturns';
import Button from '../../../../ui/base/Button';
import { exportToPDF } from '../../../../core/utils/pdfExporter';
import { AdvancedReturnModal } from '../../../returns/components/AdvancedReturnModal';
import { useReturnsListView } from '../../../returns/hooks/useReturnsListView';
import { ReturnsStatsHeader } from '../../../returns/components/view/ReturnsStatsHeader';
import { ReturnsFilterControls } from '../../../returns/components/view/ReturnsFilterControls';

// Status labels
const STATUS_LABELS: Record<string, string> = {
    'draft': 'مسودة',
    'posted': 'معتمد',
    'paid': 'مدفوع',
};

interface PurchaseReturnsViewProps {
    searchTerm: string;
    onViewDetails: (id: string) => void;
}

const PurchaseReturnsView: React.FC<PurchaseReturnsViewProps> = ({ searchTerm: propSearchTerm, onViewDetails }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const { data: returns, isLoading, refetch } = usePurchaseReturns();
    const { data: stats } = usePurchaseReturnsStats();

    const {
        localSearchTerm, setLocalSearchTerm,
        showFilters, setShowFilters,
        filters, setFilters,
        sortField, setSortField,
        sortDirection, setSortDirection,
        processedReturns,
        totalAmount,
        handleExportExcel,
        clearFilters,
        hasActiveFilters
    } = useReturnsListView(returns, 'purchase');

    // Sync initial search term
    React.useEffect(() => {
        if (propSearchTerm) {
            setLocalSearchTerm(propSearchTerm);
        }
    }, [propSearchTerm, setLocalSearchTerm]);

    // Handle print
    const handlePrint = async () => {
        if (!printRef.current) return;
        try {
            await exportToPDF(printRef.current, `مرتجعات_المشتريات_${new Date().toISOString().split('T')[0]}`);
        } catch (error) {
            console.error('Print error:', error);
        }
    };

    return (
        <div className="space-y-3 animate-in fade-in duration-300 pt-2" ref={printRef}>
            {/* Stats Cards */}
            <ReturnsStatsHeader 
                returnCount={stats?.returnCount || 0}
                totalReturns={stats?.totalReturns || 0}
                avgReturn={stats?.returnCount ? ((stats?.totalReturns || 0) / stats.returnCount) : 0}
                pendingCount={stats?.returnCount || 0}
                type="purchase"
            />

            {/* Search and Filter Bar */}
            <ReturnsFilterControls
                localSearchTerm={localSearchTerm}
                setLocalSearchTerm={setLocalSearchTerm}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                filters={filters}
                setFilters={setFilters}
                sortField={sortField}
                setSortField={setSortField}
                sortDirection={sortDirection}
                setSortDirection={setSortDirection}
                hasActiveFilters={hasActiveFilters}
                clearFilters={clearFilters}
                handleExportExcel={handleExportExcel}
                handlePrint={handlePrint}
                refetch={refetch}
                isLoading={isLoading}
                hasData={processedReturns.length > 0}
                type="purchase"
            />

            {/* Add Return Button */}
            <div className="flex justify-end">
                <Button
                    onClick={() => setIsModalOpen(true)}
                    variant="danger"
                    size="sm"
                    leftIcon={<Plus size={14} />}
                >
                    مرتجع مشتريات جديد
                </Button>
            </div>

            {/* Returns List */}
            {isLoading ? (
                <div className="animate-pulse">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 bg-gray-100 dark:bg-slate-800 rounded mb-3" />
                    ))}
                </div>
            ) : processedReturns.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <RotateCcw size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="font-medium">لا توجد مرتجعات مشتريات</p>
                    <p className="text-sm text-gray-400 mt-1">قم بإنشاء مرتجع جديد للبدء</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {processedReturns.map((returnItem: any) => (
                        <div
                            key={returnItem.id}
                            onClick={() => onViewDetails(returnItem.id)}
                            className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-600 transition-colors cursor-pointer"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                        <RotateCcw size={20} className="text-red-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            مرتجع #{returnItem.invoice_number}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            المورد: {returnItem.party?.name || 'غير محدد'}
                                        </p>
                                        {returnItem.reference_invoice && (
                                            <p className="text-xs text-blue-600">
                                                فاتورة أصلية: {returnItem.reference_invoice_id}
                                            </p>
                                        )}
                                        {returnItem.notes && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                {returnItem.notes}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="text-left">
                                    <p className="font-bold text-red-600">-{Number(returnItem.total_amount || 0).toFixed(2)}</p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(returnItem.issue_date || returnItem.created_at).toLocaleDateString('ar-SA')}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText size={14} className="text-gray-400" />
                                    <span className="text-sm text-gray-600 dark:text-slate-300">
                                        {returnItem.invoice_items?.length || 0} أصناف
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${returnItem.status === 'posted' || returnItem.status === 'paid'
                                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                                        }`}>
                                        {STATUS_LABELS[returnItem.status] || returnItem.status}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onViewDetails(returnItem.id);
                                        }}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                    >
                                        <Eye size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Total Summary */}
            {processedReturns.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-red-800 dark:text-red-300">إجمالي المرتجعات المعروضة:</span>
                        <span className="font-bold text-xl text-red-600 dark:text-red-400">
                            {totalAmount.toFixed(2)}
                        </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        عدد النتائج: {processedReturns.length} من {returns?.length || 0}
                    </div>
                </div>
            )}

            {/* Advanced Return Modal */}
            <AdvancedReturnModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                returnType="purchase"
                partyName="مورد"
                onSuccess={() => {
                    setIsModalOpen(false);
                    refetch();
                }}
            />
        </div>
    );
};

export default PurchaseReturnsView;
