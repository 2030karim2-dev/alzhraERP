
import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Loader2, Sparkles, Lightbulb } from 'lucide-react';
import { aiService } from '../../ai/service';
import { formatCurrency } from '../../../core/utils';

interface Props {
    monthlySales: { month: string; total: number }[];
}

const SalesForecastCard: React.FC<Props> = ({ monthlySales }) => {
    const [forecast, setForecast] = useState<{ forecast: number; trend: string; tips: string[] } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const generate = async () => {
        setIsLoading(true);
        try {
            const result = await aiService.generateSalesForecast(monthlySales);
            setForecast(result);
        } catch { /* ignore */ }
        setIsLoading(false);
    };

    const TrendIcon = forecast?.trend === 'صاعد' ? TrendingUp : forecast?.trend === 'هابط' ? TrendingDown : Minus;
    const trendColor = forecast?.trend === 'صاعد' ? 'text-emerald-500' : forecast?.trend === 'هابط' ? 'text-rose-500' : 'text-yellow-500';

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
                        <Sparkles size={16} className="text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-white">توقع المبيعات بالذكاء الاصطناعي</h3>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">AI Sales Forecast</p>
                    </div>
                </div>
                <button
                    onClick={generate}
                    disabled={isLoading}
                    className="px-3 py-1.5 text-[10px] font-bold bg-violet-600 hover:bg-violet-500 disabled:bg-gray-300 text-white rounded-xl transition-all"
                >
                    {isLoading ? <Loader2 size={12} className="animate-spin" /> : 'تحليل'}
                </button>
            </div>

            {forecast ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl">
                        <div className={`p-2.5 rounded-xl ${forecast.trend === 'صاعد' ? 'bg-emerald-100 dark:bg-emerald-900/30' : forecast.trend === 'هابط' ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                            <TrendIcon size={20} className={trendColor} />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">التوقع للشهر القادم</p>
                            <p dir="ltr" className="text-xl font-bold font-mono text-gray-900 dark:text-white">{formatCurrency(forecast.forecast)}</p>
                        </div>
                        <span className={`mr-auto text-xs font-bold ${trendColor}`}>{forecast.trend} ↕</span>
                    </div>

                    {forecast.tips.length > 0 && (
                        <div className="space-y-1.5">
                            {forecast.tips.map((tip, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-400">
                                    <Lightbulb size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                    <span className="font-medium">{tip}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-xs text-gray-400 text-center py-4">اضغط "تحليل" لتوقع مبيعات الشهر القادم</p>
            )}
        </div>
    );
};

export default SalesForecastCard;
