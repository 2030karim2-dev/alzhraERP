import React from 'react';
import { X, ArrowRight } from 'lucide-react';
import { ReturnType } from '../../types';

interface Props {
    returnType: ReturnType;
    handleMouseDown: (e: React.MouseEvent) => void;
    onClose: () => void;
}

export const WizardDraggableHeader: React.FC<Props> = ({ returnType, handleMouseDown, onClose }) => {
    return (
        <div
            className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 cursor-grab active:cursor-grabbing select-none relative"
            onMouseDown={handleMouseDown}
        >
            <div className="flex items-center gap-4 no-drag relative z-10">
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors group"
                >
                    <ArrowRight className="text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300" size={20} />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter">
                        {returnType === 'sale' ? 'إنشاء مرتجع مبيعات' : 'إنشاء مرتجع مشتريات'}
                        <span className="px-2 py-1 text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 rounded-md truncate max-w-[150px]">
                            {returnType === 'sale' ? 'Sales Return' : 'Purchase Return'}
                        </span>
                    </h2>
                    <p className="text-sm font-medium text-slate-500">معالج الإرجاع الذكي لمعالجة البضائع المرتجعة</p>
                </div>
            </div>
            <button
                onClick={onClose}
                className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-colors no-drag relative z-10"
            >
                <X size={24} />
            </button>
        </div>
    );
};
