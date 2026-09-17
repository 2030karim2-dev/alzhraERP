import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Loader2, Sparkles, Lightbulb } from 'lucide-react';
import { aiService } from '../../ai/service';
import { formatCurrency } from '../../../core/utils';

interface Props {
  monthlySales: Array<{ month: string; total: number }>;
}

const SalesForecastCard: React.FC<Props> = ({ monthlySales }) => {
  const [forecast, setForecast] = useState<{
    forecast: number;
    trend: string;
    tips: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generate = async () => {
    setIsLoading(true);
    try {
      const result = await aiService.generateSalesForecast(monthlySales);
      setForecast(result);
    } catch {
      /* ignore */
    }
    setIsLoading(false);
  };

  const TrendIcon =
    forecast?.trend === 'صاعد' ? TrendingUp : forecast?.trend === 'هابط' ? TrendingDown : Minus;
  const trendColor =
    forecast?.trend === 'صاعد'
      ? 'text-emerald-500'
      : forecast?.trend === 'هابط'
        ? 'text-rose-500'
        : 'text-yellow-500';

  return (
    <div className="rounded-2xl border bg-[var(--app-surface)] p-5 shadow-sm dark:border-slate-800 max-md:rounded-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-violet-100 p-2 dark:bg-violet-900/30">
            <Sparkles size={16} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">
              توقع المبيعات بالذكاء الاصطناعي
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              AI Sales Forecast
            </p>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={isLoading}
          className="rounded-xl bg-violet-600 px-3 py-1.5 text-[10px] font-bold text-white transition-all hover:bg-violet-500 disabled:bg-gray-300"
        >
          {isLoading ? <Loader2 size={12} className="animate-spin" /> : 'تحليل'}
        </button>
      </div>

      {forecast ? (
        <div className="space-y-3">
          <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4 dark:bg-slate-800/50 max-md:gap-3">
            <div
              className={`rounded-xl p-2.5 ${forecast.trend === 'صاعد' ? 'bg-emerald-100 dark:bg-emerald-900/30' : forecast.trend === 'هابط' ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}
            >
              <TrendIcon size={20} className={trendColor} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-400">التوقع للشهر القادم</p>
              <p dir="ltr" className="font-mono text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(forecast.forecast)}
              </p>
            </div>
            <span className={`mr-auto text-xs font-bold ${trendColor}`}>{forecast.trend} ↕</span>
          </div>

          {forecast.tips.length > 0 && (
            <div className="space-y-1.5">
              {forecast.tips.map((tip, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-400"
                >
                  <Lightbulb size={12} className="mt-0.5 flex-shrink-0 text-amber-500" />
                  <span className="font-medium">{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="py-4 text-center text-xs text-gray-400">
          اضغط "تحليل" لتوقع مبيعات الشهر القادم
        </p>
      )}
    </div>
  );
};

export default SalesForecastCard;
