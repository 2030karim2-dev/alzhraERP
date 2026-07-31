import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '../../../../core/utils';
import { SmartSuggestion } from '../../hooks/useSmartTransferSuggestions';

interface SmartSuggestionsSectionProps {
    suggestions: SmartSuggestion[];
    onTransfer: (suggestion: SmartSuggestion) => void;
}

const SmartSuggestionsSection: React.FC<SmartSuggestionsSectionProps> = ({ suggestions, onTransfer }) => {
    const priorityColors = {
        high: 'border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20',
        medium: 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20',
        low: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20'
    };

    if (suggestions.length === 0) return null;

    return (
        <div className="bg-indigo-50/30 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles size={12} className="text-indigo-600" />
                    <h3 className="text-[10px] font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">اقتراحات المناقلة</h3>
                </div>
                <span className="text-[8px] font-black bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase">
                    {suggestions.length} items
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {suggestions.map((s, i) => (
                    <div key={i} className={cn("rounded-lg border p-2 bg-white/50 dark:bg-slate-900/50", priorityColors[s.priority])}>
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                            <p className="text-[9px] font-black text-gray-800 dark:text-gray-100 truncate">{s.productName}</p>
                            <span className="text-[10px] font-black font-mono text-indigo-600 dark:text-indigo-400 leading-none">
                                {s.suggestedQty}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 mb-2">
                            <div className="flex-1 flex items-center gap-1 text-[8px] font-bold">
                                <span className="text-rose-500 truncate max-w-[40px]">{s.fromWarehouse}</span>
                                <ArrowRight size={8} className="text-gray-300" />
                                <span className="text-emerald-500 truncate max-w-[40px]">{s.toWarehouse}</span>
                            </div>
                            <button
                                onClick={() => onTransfer(s)}
                                className="px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-bold rounded flex items-center gap-1 transition-all active:scale-95"
                            >
                                نقل
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SmartSuggestionsSection;
