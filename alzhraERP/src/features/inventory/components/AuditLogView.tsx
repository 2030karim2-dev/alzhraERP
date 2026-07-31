import React, { useState } from 'react';
import { useItemMovement, useProducts } from '../hooks/index';
import { Info } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '../../../core/utils';
import AuditLogHeader from './audit/AuditLogHeader';
import AuditLogTable from './audit/AuditLogTable';
import ProductExcelGrid from './ProductExcelGrid';

const AuditLogView: React.FC = () => {
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [searchQuery] = useState('');
    const [isMaximized, setIsMaximized] = useState(false);

    const { products, isLoading: isProductsLoading } = useProducts(searchQuery, { enabled: !selectedProduct });
    const { data: log, isLoading: isLogLoading } = useItemMovement(selectedProduct?.id || null);

    const content = (
        <div className={cn(
            "flex flex-col animate-in fade-in duration-500 max-w-none mx-auto transition-all h-full",
            isMaximized 
                ? "fixed inset-0 z-[999] bg-white dark:bg-slate-900 overflow-hidden" 
                : "gap-6"
        )}>
            <div className={cn(
                "flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900 transition-all",
                isMaximized 
                    ? "h-full" 
                    : "rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden"
            )}>
                {selectedProduct ? (
                    <>
                        <AuditLogHeader
                            selectedProduct={selectedProduct}
                            log={log}
                            isMaximized={isMaximized}
                            setIsMaximized={setIsMaximized}
                            onBack={() => setSelectedProduct(null)}
                        />

                        <div className="flex-1 overflow-auto custom-scrollbar relative">
                            {isLogLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <div className="w-8 h-8 border-2 border-blue-500/10 border-t-blue-500 rounded-full animate-spin" />
                                    <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">جاري تجهيز البيانات التدقيقية...</p>
                                </div>
                            ) : !log || log.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <Info size={40} className="mb-3 opacity-10" />
                                    <p className="text-xs font-bold">لا توجد حركات مسجلة لهذا الصنف</p>
                                </div>
                            ) : (
                                <AuditLogTable log={log} />
                            )}
                        </div>

                        <div className={cn(
                            "p-3 px-8 bg-gray-50 dark:bg-slate-800 border-t dark:border-slate-700 flex justify-between items-center text-[10px] font-black text-gray-400 transition-all",
                            isMaximized && "py-6"
                        )}>
                            <div className="flex gap-6">
                                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" /> واردات (مشتريات/مردود)</span>
                                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" /> صادرات (مبيعات/هالك)</span>
                            </div>
                            <span className="opacity-60 italic">* كافة الكميات معالجة ومربوطة بالرصيد التراكمي في الوقت الفعلي</span>
                        </div>
                    </>
                ) : (
                    <ProductExcelGrid 
                        products={(products as any) || []}
                        isLoading={isProductsLoading}
                        onRowClick={(p: any) => setSelectedProduct(p)}
                        hideActions={true}
                        hideBulkActions={true}
                        title="سجل الحركات"
                        subtitle="اختر صنفاً لعرض تفاصيل حركته المخزنية"
                        colorTheme="indigo"
                    />
                )}
            </div>
        </div>
    );

    if (isMaximized) {
        return createPortal(content, document.body);
    }

    return content;
};

export default AuditLogView;

