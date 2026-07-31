import React from 'react';
import type { SuspendedOrder } from '../store';

interface SuspendedOrdersModalProps {
    orders: SuspendedOrder[];
    onClose: () => void;
    onResume: (orderId: string) => void;
    onRemove: (orderId: string) => void;
}

export const SuspendedOrdersModal: React.FC<SuspendedOrdersModalProps> = ({
    orders, onClose, onResume, onRemove
}) => {
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in duration-200 rounded-2xl overflow-hidden max-h-[80vh]">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/30">
                    <h3 className="font-black text-sm md:text-base text-slate-800 dark:text-white">الطلبـات المعلقـة ({orders.length})</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        إغلاق
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {orders.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                            <p className="text-xs md:text-sm font-bold">لا توجد أي طلبات معلقة حالياً.</p>
                        </div>
                    ) : (
                        orders.map((order) => (
                            <div key={order.id} className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/10 hover:border-blue-500/50 transition-all">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                                            {order.id}
                                        </span>
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            {order.customer?.name || 'عميل نقدي'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500">
                                        الوقت: {order.time} • عدد المواد: {order.items.length}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onResume(order.id)}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-blue-500/15"
                                    >
                                        استعادة
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onRemove(order.id)}
                                        className="px-3 py-1.5 border border-rose-250 hover:bg-rose-50 hover:text-rose-600 dark:border-rose-900/30 dark:hover:bg-rose-950/20 text-rose-500 rounded-xl text-xs font-bold transition-all active:scale-95"
                                    >
                                        حذف
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default SuspendedOrdersModal;