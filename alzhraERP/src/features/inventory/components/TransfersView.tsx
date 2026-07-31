import React, { useState, useMemo } from 'react';
import { ArrowLeftRight, Plus, Maximize2, Sparkles, History as HistoryIcon, LayoutDashboard } from 'lucide-react';
import NewTransferModal from './NewTransferModal';
import { useTransfers, useWarehouses } from '../hooks/useInventoryManagement';
import TableSkeleton from '../../../ui/base/TableSkeleton';
import FullscreenContainer from '../../../ui/base/FullscreenContainer';
import { cn } from '../../../core/utils';
import TransferStats from './transfers/TransferStats';
import TransferHistoryView from './TransferHistoryView';
import TransferSuggestionsView from './TransferSuggestionsView';

type SubTab = 'overview' | 'history' | 'suggestions';

const TransfersView: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { data: transfers, isLoading: isTransfersLoading } = useTransfers();
    const { data: warehouses } = useWarehouses();
    const [isMaximized, setIsMaximized] = useState(false);

    const stats = useMemo(() => {
        const transfersArray = Array.isArray(transfers) ? transfers : [];
        return {
            total: transfersArray.length,
            thisMonth: transfersArray.filter((t: any) => {
                const d = new Date(t.created_at);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length,
            totalItems: transfersArray.reduce((s: number, t: any) => s + (Number(t.item_count) || 0), 0),
            warehouseCount: warehouses?.length || 0
        };
    }, [transfers, warehouses]);

    if (isTransfersLoading) return <TableSkeleton rows={5} cols={6} />;

    return (
        <FullscreenContainer isMaximized={isMaximized} onToggleMaximize={() => { setIsMaximized(false); }}>
            <div className={cn(
                "space-y-4 flex flex-col h-full",
                isMaximized && "bg-[var(--app-bg)] p-4 md:p-8"
            )}>
                <TransferStats stats={stats} />

                {/* Internal Sub-Navigation */}
                <div className="flex bg-gray-100/50 dark:bg-slate-900/50 p-1 rounded-xl w-fit shrink-0 backdrop-blur-sm border border-gray-200/50 dark:border-slate-800/50">
                    {[
                        { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
                        { id: 'history', label: 'سجل المناقلات', icon: HistoryIcon },
                        { id: 'suggestions', label: 'اقتراحات النقل', icon: Sparkles },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id as SubTab)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black transition-all duration-300",
                                activeSubTab === tab.id
                                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm shadow-blue-500/10"
                                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            )}
                        >
                            <tab.icon size={12} strokeWidth={activeSubTab === tab.id ? 2.5 : 2} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-hidden">
                    {activeSubTab === 'overview' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-8 rounded-2xl flex flex-col items-center justify-center text-center gap-6 shadow-sm">
                                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner">
                                    <ArrowLeftRight size={32} />
                                </div>
                                <div className="max-w-md">
                                    <h3 className="text-xl font-black mb-2">إدارة مناقلات المخزون</h3>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                                        هنا يمكنك البدء بعملية نقل بضاعة جديدة بين مستودعاتك وفروعك. تصفح التبويبات أعلاه لمشاهدة السجل الكامل أو الحصول على اقتراحات ذكية.
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <button
                                        onClick={() => { setIsModalOpen(true); }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl text-xs font-black active:scale-95 flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 transition-all"
                                    >
                                        <Plus size={16} strokeWidth={3} />
                                        <span>إنشاء مناقلة جديدة الآن</span>
                                    </button>
                                    
                                    {!isMaximized && (
                                        <button
                                            onClick={() => { setIsMaximized(true); }}
                                            className="bg-white dark:bg-slate-800 text-gray-400 border border-gray-100 dark:border-slate-800 px-6 py-2.5 rounded-xl text-xs font-black active:scale-95 flex items-center justify-center gap-2.5 shadow-sm transition-all"
                                        >
                                            <Maximize2 size={16} />
                                            <span>ملئ الشاشة</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button 
                                    onClick={() => setActiveSubTab('suggestions')}
                                    className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 p-4 rounded-xl flex items-center gap-4 text-right hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-all group"
                                >
                                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <Sparkles size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-[11px] font-black text-amber-900 dark:text-amber-100 italic">اقتراحات ذكية</h4>
                                        <p className="text-[10px] text-amber-800/70 dark:text-amber-300/70 line-clamp-1">موازنة المخزون آلياً بين الفروع</p>
                                    </div>
                                </button>
                                <button 
                                    onClick={() => setActiveSubTab('history')}
                                    className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 p-4 rounded-xl flex items-center gap-4 text-right hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-all group"
                                >
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <HistoryIcon size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-[11px] font-black text-blue-900 dark:text-blue-100 italic">السجل الكامل</h4>
                                        <p className="text-[10px] text-blue-800/70 dark:text-blue-300/70 line-clamp-1">تدقيق العمليات السابقة والمكتملة</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'history' && (
                        <div className="h-full animate-in fade-in slide-in-from-left-4 duration-500">
                            <TransferHistoryView />
                        </div>
                    )}

                    {activeSubTab === 'suggestions' && (
                        <div className="h-full animate-in fade-in slide-in-from-right-4 duration-500">
                            <TransferSuggestionsView />
                        </div>
                    )}
                </div>

                <NewTransferModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); }} />
            </div>
        </FullscreenContainer>
    );
};

export default TransfersView;