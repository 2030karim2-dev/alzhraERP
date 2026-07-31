
import React, { useState } from 'react';
import { ShoppingCart, Loader2,  ChevronDown, ChevronUp, Package } from 'lucide-react';
import { aiService } from '../../ai/service';

interface Props {
    lowStockItems: { name: string; current: number; minStock: number; avgMonthlyUsage: number }[];
}

const SmartPurchaseAlert: React.FC<Props> = ({ lowStockItems }) => {
    const [result, setResult] = useState<{ items: { name: string; suggestedQty: number; priority: string }[]; summary: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const generate = async () => {
        if (lowStockItems.length === 0) return;
        setIsLoading(true);
        try {
            const data = await aiService.generateSmartPurchaseOrders(lowStockItems);
            setResult(data);
            setIsExpanded(true);
        } catch { /* ignore */ }
        setIsLoading(false);
    };

    if (lowStockItems.length === 0) return null;

    const priorityColors: Record<string, string> = {
        'عاجل': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
        'متوسط': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        'منخفض': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };

    return (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 rounded-2xl border border-amber-200/50 dark:border-amber-800/30 p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-500/20">
                        <ShoppingCart size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[var(--app-text)]">اقتراح شراء ذكي</h3>
                        <p className="text-[9px] font-bold text-amber-600/60">{lowStockItems.length} منتج منخفض المخزون</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={generate}
                        disabled={isLoading}
                        className="px-3 py-1.5 text-[10px] font-bold bg-amber-600 hover:bg-amber-500 disabled:bg-gray-300 text-white rounded-xl transition-all"
                    >
                        {isLoading ? <Loader2 size={12} className="animate-spin" /> : '🤖 تحليل'}
                    </button>
                    {result && (
                        <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 text-gray-400">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    )}
                </div>
            </div>

            {result && isExpanded && (
                <div className="mt-3 space-y-2">
                    <p className="text-xs text-[var(--app-text)] font-medium">{result.summary}</p>
                    <div className="space-y-1.5">
                        {result.items?.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 bg-[var(--app-surface-hover)] rounded-xl p-2.5 text-xs">
                                <Package size={12} className="text-[var(--app-text-secondary)] flex-shrink-0" />
                                <span className="font-bold text-[var(--app-text)] flex-1">{item.name}</span>
                                <span className="font-bold font-mono text-[var(--app-text)]">{item.suggestedQty} وحدة</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${priorityColors[item.priority] || priorityColors['منخفض']}`}>
                                    {item.priority}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartPurchaseAlert;
