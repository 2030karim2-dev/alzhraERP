
import React, { useState } from 'react';
import { Timer, Loader2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { aiService } from '../../ai/service';

interface Props {
    products: { name: string; currentStock: number; avgDailySales: number }[];
}

const StockDepletionAlert: React.FC<Props> = ({ products }) => {
    const [result, setResult] = useState<{ items: { name: string; daysLeft: number; urgency: string }[] } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const analyze = async () => {
        if (products.length === 0) return;
        setIsLoading(true);
        try {
            const data = await aiService.predictStockDepletion(products);
            setResult(data);
        } catch { /* ignore */ }
        setIsLoading(false);
    };

    const urgencyConfig: Record<string, { color: string; icon: typeof AlertTriangle; bg: string }> = {
        'حرج': { color: 'text-rose-600', icon: AlertTriangle, bg: 'bg-rose-100 dark:bg-rose-900/30' },
        'تحذير': { color: 'text-amber-600', icon: Clock, bg: 'bg-amber-100 dark:bg-amber-900/30' },
        'آمن': { color: 'text-emerald-600', icon: CheckCircle, bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                        <Timer size={16} className="text-orange-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-white">التنبؤ بنفاد المخزون</h3>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Stock Depletion AI</p>
                    </div>
                </div>
                <button
                    onClick={analyze}
                    disabled={isLoading || products.length === 0}
                    className="px-3 py-1.5 text-[10px] font-bold bg-orange-600 hover:bg-orange-500 disabled:bg-gray-300 text-white rounded-xl transition-all"
                >
                    {isLoading ? <Loader2 size={12} className="animate-spin" /> : '🔮 تنبؤ'}
                </button>
            </div>

            {result ? (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {result.items.sort((a, b) => a.daysLeft - b.daysLeft).map((item, i) => {
                        const config = urgencyConfig[item.urgency] || urgencyConfig['آمن'];
                        const Icon = config.icon;
                        return (
                            <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800/50 rounded-xl p-2.5 text-xs">
                                <div className={`p-1 rounded-lg ${config.bg}`}>
                                    <Icon size={12} className={config.color} />
                                </div>
                                <span className="font-bold text-gray-800 dark:text-white flex-1 truncate">{item.name}</span>
                                <span className={`font-bold font-mono ${config.color}`}>
                                    {item.daysLeft > 365 ? '∞' : `${item.daysLeft} يوم`}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-xs text-gray-400 text-center py-3">اضغط "تنبؤ" لتحليل متى ينفد كل منتج</p>
            )}
        </div>
    );
};

export default StockDepletionAlert;
