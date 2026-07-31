
import React, { useState } from 'react';
import { Sparkles, RefreshCw, Loader2, Brain, Share2 } from 'lucide-react';
import { generateAIContent } from '../../../features/ai/aiProvider';
import { useProfitAndLoss, useDebtReport, useCashFlow } from '../../../features/reports/hooks';
import { useProducts } from '../../../features/inventory/hooks/index';
import { formatCurrency } from '../../../core/utils';

const SmartDailySummary: React.FC = () => {
    const [summary, setSummary] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { data: pl } = useProfitAndLoss();
    const { data: debt } = useDebtReport();
    const { data: cashFlow } = useCashFlow();
    const { stats } = useProducts('');

    const generateSummary = async () => {
        setIsLoading(true);
        try {
            const context = [
                pl ? `الإيرادات: ${formatCurrency(pl.totalRevenues || 0)}, المصروفات: ${formatCurrency(pl.totalExpenses || 0)}, صافي الربح: ${formatCurrency(pl.netProfit || 0)}` : '',
                debt?.summary ? `ديون العملاء: ${formatCurrency(debt.summary.receivables || 0)}, التزامات الموردين: ${formatCurrency(debt.summary.payables || 0)}` : '',
                cashFlow ? `السيولة النقدية: ${formatCurrency(cashFlow.currentLiquidity || 0)}` : '',
                stats ? `عدد المنتجات: ${stats.count || 0}, قيمة المخزون: ${formatCurrency(stats.totalValue || 0)}, منخفض المخزون: ${stats.lowStockCount || 0}` : '',
            ].filter(Boolean).join('\n');

            const result = await generateAIContent(
                `أنشئ ملخصاً يومياً مختصراً (3-4 أسطر) لحالة الأعمال في الجعفري لقطع غيار السيارات بناءً على هذه البيانات:\n${context}\n\nالتاريخ: ${new Date().toLocaleDateString('ar-SA')}\n\nاكتب ملخصاً عملياً مع إيموجي واحد في بداية كل نقطة. لا تكتب JSON.`,
                'أنت محاسب ومحلل أعمال خبير في الجعفري لقطع غيار السيارات. قدم ملخصات مختصرة ومفيدة باللغة العربية.',
                { temperature: 0.5 }
            );

            setSummary(result);
        } catch (e: unknown) {
            const error = e as Error;
            setSummary('⚠️ تعذر إنشاء الملخص — تحقق من اتصال الذكاء الاصطناعي: ' + (error?.message || ''));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 rounded-2xl border border-slate-800/50 p-5 overflow-hidden group">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -ml-16 -mb-16" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg shadow-amber-500/20">
                            <Brain size={16} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-[var(--app-text)]">ملخص اليوم الذكي</h3>
                            <p className="text-[8px] font-bold text-[var(--app-text-secondary)] uppercase tracking-widest">AI Daily Brief</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {summary && (
                            <button
                                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, '_blank')}
                                className="p-2 text-[var(--app-text-secondary)] hover:text-emerald-400 hover:bg-white/10 rounded-xl transition-all"
                                title="إرسال عبر واتساب"
                            >
                                <Share2 size={14} />
                            </button>
                        )}
                        <button
                            onClick={generateSummary}
                            disabled={isLoading}
                            className="p-2 text-[var(--app-text-secondary)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] rounded-xl transition-all"
                            title="تحديث الملخص"
                        >
                            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        </button>
                    </div>
                </div>

                {summary ? (
                    <div className="text-[13px] text-[var(--app-text-secondary)] leading-relaxed whitespace-pre-wrap font-medium">
                        {summary}
                    </div>
                ) : (
                    <button
                        onClick={generateSummary}
                        disabled={isLoading}
                        className="w-full py-4 rounded-xl border border-dashed border-[var(--app-border)] text-[var(--app-text-secondary)] hover:text-[var(--app-text)] hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex items-center justify-center gap-2 text-xs font-bold"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                جاري التحليل بالذكاء الاصطناعي...
                            </>
                        ) : (
                            <>
                                <Sparkles size={14} />
                                اضغط لإنشاء ملخص اليوم
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default SmartDailySummary;
