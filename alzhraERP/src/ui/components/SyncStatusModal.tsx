import React, { useState, useEffect } from 'react';
import {
    X,
    RefreshCcw,
    CheckCircle2,
    AlertCircle,
    Trash2,
    Wifi,
    History,
    CloudOff
} from 'lucide-react';
import { syncStore } from '../../core/lib/sync-store';

interface SyncStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SyncStatusModal: React.FC<SyncStatusModalProps> = ({ isOpen, onClose }) => {
    const [pending, setPending] = useState<any[]>([]);

    const loadPending = async () => {
        try {
            const data = await syncStore.getPending();
            setPending(data);
        } catch (error) {
            console.error('Failed to load pending mutations:', error);
        }
    };

    useEffect(() => {
        if (!isOpen) return undefined;

        loadPending();
        // Poll for changes while open
        const interval = setInterval(loadPending, 3000);
        return () => clearInterval(interval);
    }, [isOpen]);

    const handleRemove = async (id: string) => {
        await syncStore.dequeue(id);
        loadPending();
    };

    const getLabel = (mutationKey: any[]) => {
        const [feature, action] = mutationKey;
        const labels: Record<string, string> = {
            'products:save': 'حفظ منتج',
            'sales:create': 'إنشاء فاتورة مبيعات',
            'expenses:create': 'تسجيل مصروف',
            'purchases:create': 'فاتورة مشتريات',
            'purchases:payment': 'سند صرف مورد',
            'accounting:create_account': 'إنشاء حساب محاسبي',
        };
        return labels[`${feature}:${action}`] || `${feature} ${action}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <History size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">مركز المزامنة</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">إدارة العمليات المعلقة في وضع عدم الاتصال</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {pending.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 size={32} className="text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">جميع البيانات متزامنة</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">لا توجد عمليات معلقة حالياً</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    العمليات المعلقة ({pending.length})
                                </span>
                                <button
                                    onClick={loadPending}
                                    className="text-xs flex items-center gap-1 text-blue-600 hover:underline"
                                >
                                    <RefreshCcw size={12} /> تحديث القائمة
                                </button>
                            </div>

                            {pending.map((item) => (
                                <div
                                    key={item.id}
                                    className="group flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-800/50 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${item.retryCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {item.retryCount > 0 ? <AlertCircle size={18} /> : <CloudOff size={18} />}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                                {getLabel(item.mutationKey)}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-slate-500 font-mono">
                                                    ID: {item.id.substring(0, 8)}
                                                </span>
                                                {item.retryCount > 0 && (
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                                                        فشل المحاولة: {item.retryCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleRemove(item.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all md:opacity-0 group-hover:opacity-100"
                                            title="حذف العملية"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Wifi size={14} className="text-emerald-500" />
                        <span>سيتم المزامنة تلقائياً عند استقرار الاتصال</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SyncStatusModal;
