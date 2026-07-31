import React from 'react';
import { History, Maximize2, Minimize2, X } from 'lucide-react';
import { cn, formatNumberDisplay } from '../../../../core/utils';

interface AuditLogHeaderProps {
    selectedProduct: any;
    log: any[] | undefined;
    isMaximized: boolean;
    setIsMaximized: (maximized: boolean) => void;
    onBack?: () => void;
}

const AuditLogHeader: React.FC<AuditLogHeaderProps> = ({
    selectedProduct,
    log,
    isMaximized,
    setIsMaximized,
    onBack
}) => {
    return (
        <div className={cn(
            "p-5 border-b dark:border-slate-800 flex items-center justify-between transition-all",
            isMaximized ? "bg-slate-50 dark:bg-slate-800/50 py-8 px-10" : "bg-gray-50/50 dark:bg-slate-900/50"
        )}>
            <div className="flex items-center gap-4">
                {onBack && !isMaximized && (
                    <button 
                        onClick={onBack}
                        className="p-2.5 bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 shadow-sm text-gray-500 hover:text-blue-500 transition-all active:scale-90"
                        title="رجوع للقائمة"
                    >
                        <X size={18} />
                    </button>
                )}
                <div className={cn(
                    "p-3 bg-blue-600/10 text-blue-600 rounded-2xl",
                    isMaximized && "p-4"
                )}>
                    <History size={isMaximized ? 24 : 18} />
                </div>
                <div>
                    <h3 className={cn(
                        "text-sm font-black text-gray-900 dark:text-white",
                        isMaximized && "text-xl"
                    )}>
                        {isMaximized ? `تدقيق حركة الصنف: ${selectedProduct.name}` : 'سجل العمليات (Excel Style)'}
                    </h3>
                    <p className={cn(
                        "text-[10px] text-gray-500 font-medium tracking-tight",
                        isMaximized && "text-xs mt-1"
                    )}>
                        تدقيق كامل لكل العمليات المخزنية بحسب التسلسل الزمني
                    </p>
                </div>
            </div>
            
            <div className="flex items-center gap-6">
                <div className="hidden md:flex items-center gap-6">
                    <div className="text-right">
                        <p className={cn("font-black text-gray-900 dark:text-white font-mono leading-none", isMaximized ? "text-2xl" : "text-xs")}>
                            {formatNumberDisplay(selectedProduct.stock_quantity)}
                        </p>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">الرصيد الكلي الحالي</p>
                    </div>
                    <div className="h-8 w-px bg-gray-200 dark:bg-slate-800" />
                    <div className="text-right">
                        <p className={cn("font-black text-gray-900 dark:text-white font-mono leading-none", isMaximized ? "text-2xl" : "text-xs")}>
                            {log?.length || 0}
                        </p>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">إجمالي العمليات</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsMaximized(!isMaximized)}
                        className="p-3 bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 shadow-sm text-gray-500 hover:text-blue-500 transition-all active:scale-90"
                        title={isMaximized ? "تصغير" : "تكبير"}
                    >
                        {isMaximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                    
                    {isMaximized && (
                        <button 
                            onClick={() => setIsMaximized(false)}
                            className="p-3 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-500/20 transition-all active:scale-90"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuditLogHeader;
