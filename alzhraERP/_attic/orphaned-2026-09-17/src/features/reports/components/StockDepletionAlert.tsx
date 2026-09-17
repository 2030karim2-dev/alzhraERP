import React, { useState } from 'react';
import { Timer, Loader2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { aiService } from '../../ai/service';

interface Props {
  products: Array<{ name: string; currentStock: number; avgDailySales: number }>;
}

const StockDepletionAlert: React.FC<Props> = ({ products }) => {
  const [result, setResult] = useState<{
    items: Array<{ name: string; daysLeft: number; urgency: string }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const analyze = async () => {
    if (products.length === 0) return;
    setIsLoading(true);
    try {
      const data = await aiService.predictStockDepletion(products);
      setResult(data);
    } catch {
      /* ignore */
    }
    setIsLoading(false);
  };

  const urgencyConfig: Record<string, { color: string; icon: typeof AlertTriangle; bg: string }> = {
    حرج: { color: 'text-rose-600', icon: AlertTriangle, bg: 'bg-rose-100 dark:bg-rose-900/30' },
    تحذير: { color: 'text-amber-600', icon: Clock, bg: 'bg-amber-100 dark:bg-amber-900/30' },
    آمن: {
      color: 'text-emerald-600',
      icon: CheckCircle,
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
  };

  return (
    <div className="rounded-2xl border bg-[var(--app-surface)] p-5 shadow-sm dark:border-slate-800 max-md:rounded-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-orange-100 p-2 dark:bg-orange-900/30">
            <Timer size={16} className="text-orange-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">
              التنبؤ بنفاد المخزون
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Stock Depletion AI
            </p>
          </div>
        </div>
        <button
          onClick={analyze}
          disabled={isLoading || products.length === 0}
          className="rounded-xl bg-orange-600 px-3 py-1.5 text-[10px] font-bold text-white transition-all hover:bg-orange-500 disabled:bg-gray-300"
        >
          {isLoading ? <Loader2 size={12} className="animate-spin" /> : '🔮 تنبؤ'}
        </button>
      </div>

      {result ? (
        <div className="max-h-[200px] space-y-2 overflow-y-auto">
          {result.items
            .sort((a, b) => a.daysLeft - b.daysLeft)
            .map((item, i) => {
              const config = urgencyConfig[item.urgency] || urgencyConfig['آمن'];
              const Icon = config.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl bg-gray-50 p-2.5 text-xs dark:bg-slate-800/50"
                >
                  <div className={`rounded-lg p-1 ${config.bg}`}>
                    <Icon size={12} className={config.color} />
                  </div>
                  <span className="flex-1 truncate font-bold text-gray-800 dark:text-white">
                    {item.name}
                  </span>
                  <span className={`font-mono font-bold ${config.color}`}>
                    {item.daysLeft > 365 ? '∞' : `${item.daysLeft} يوم`}
                  </span>
                </div>
              );
            })}
        </div>
      ) : (
        <p className="py-3 text-center text-xs text-gray-400">
          اضغط "تنبؤ" لتحليل متى ينفد كل منتج
        </p>
      )}
    </div>
  );
};

export default StockDepletionAlert;
