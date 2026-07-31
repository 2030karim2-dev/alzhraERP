import React from 'react';
import { Copy, Send, Trash2, X } from 'lucide-react';

interface BulkActionsBarProps {
    selectedCount: number;
    onClear: () => void;
    onCopy: () => void;
    onSend: () => void;
    onDelete: () => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
    selectedCount,
    onClear,
    onCopy,
    onSend,
    onDelete
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className="absolute top-0 left-0 right-0 z-50 p-3 bg-white dark:bg-slate-900 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-blue-200 dark:border-blue-900/50 rounded-lg flex items-center justify-between mx-2 mt-2 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                    تم تحديد {selectedCount} منتج
                </span>
                <button
                    onClick={onClear}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                >
                    <X size={14} /> إلغاء التحديد
                </button>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={onCopy}
                    className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded flex items-center gap-1.5 transition-colors dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                >
                    <Copy size={14} /> نسخ للنص
                </button>
                <button
                    onClick={onSend}
                    className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded flex items-center gap-1.5 transition-colors dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                >
                    <Send size={14} /> مشاركة وتس
                </button>
                <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1"></div>
                <button
                    onClick={onDelete}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-sm flex items-center gap-1.5 transition-colors"
                >
                    <Trash2 size={14} /> حذف المحدد
                </button>
            </div>
        </div>
    );
};

export default BulkActionsBar;
