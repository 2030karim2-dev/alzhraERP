import React from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, Package, Loader2 } from 'lucide-react';
import type { VinAIInsight } from '../services/vinAIService';
import { useTranslation } from '../../../lib/hooks/useTranslation';

interface VinAIInsightsProps {
  insight: VinAIInsight | null;
  isLoading: boolean;
  error: string | null;
}

const VinAIInsights: React.FC<VinAIInsightsProps> = ({ insight, isLoading, error }) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800/50 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-indigo-500 animate-pulse" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400">
            DeepSeek AI {t('vin_analyzing')}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-indigo-500">
          <Loader2 size={12} className="animate-spin" />
          <span>{t('vin_ai_analyzing_market')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={14} className="text-rose-500" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400">
            DeepSeek AI
          </h3>
        </div>
        <p className="text-[9px] text-rose-600 dark:text-rose-400">{error}</p>
      </div>
    );
  }

  if (!insight) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800/50 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-white" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white">
            DeepSeek AI · {t('vin_market_intelligence')}
          </h3>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Summary */}
        <div className="bg-white/70 dark:bg-slate-900/50 rounded-lg p-2.5 border border-indigo-100 dark:border-indigo-800/30">
          <div className="flex items-center gap-1.5 mb-1">
            <Lightbulb size={11} className="text-amber-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              {t('vin_ai_summary')}
            </span>
          </div>
          <p className="text-[9px] text-slate-700 dark:text-slate-300 leading-relaxed">{insight.summary}</p>
        </div>

        {/* Market Analysis + Procurement Advice */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="bg-white/70 dark:bg-slate-900/50 rounded-lg p-2.5 border border-indigo-100 dark:border-indigo-800/30">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={11} className="text-emerald-500" />
              <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                {t('vin_ai_market')}
              </span>
            </div>
            <p className="text-[9px] text-slate-700 dark:text-slate-300 leading-relaxed">{insight.marketAnalysis}</p>
          </div>
          <div className="bg-white/70 dark:bg-slate-900/50 rounded-lg p-2.5 border border-indigo-100 dark:border-indigo-800/30">
            <div className="flex items-center gap-1.5 mb-1">
              <Package size={11} className="text-blue-500" />
              <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                {t('vin_ai_procurement')}
              </span>
            </div>
            <p className="text-[9px] text-slate-700 dark:text-slate-300 leading-relaxed">{insight.procurementAdvice}</p>
          </div>
        </div>

        {/* Popular Parts */}
        {insight.popularParts.length > 0 && (
          <div className="bg-white/70 dark:bg-slate-900/50 rounded-lg p-2.5 border border-indigo-100 dark:border-indigo-800/30">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles size={11} className="text-orange-500" />
              <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                🔥 {t('vin_ai_popular_parts')}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {insight.popularParts.map((part, i) => (
                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-[8px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                  {part}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Risk Factors + Recommended Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {insight.riskFactors.length > 0 && (
            <div className="bg-white/70 dark:bg-slate-900/50 rounded-lg p-2.5 border border-rose-100 dark:border-rose-800/30">
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle size={11} className="text-rose-500" />
                <span className="text-[8px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">
                  ⚠️ {t('vin_ai_risks')}
                </span>
              </div>
              <ul className="space-y-1">
                {insight.riskFactors.map((risk, i) => (
                  <li key={i} className="text-[9px] text-slate-600 dark:text-slate-400 flex items-start gap-1">
                    <span className="text-rose-400 mt-0.5 shrink-0">•</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {insight.recommendedActions.length > 0 && (
            <div className="bg-white/70 dark:bg-slate-900/50 rounded-lg p-2.5 border border-emerald-100 dark:border-emerald-800/30">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lightbulb size={11} className="text-emerald-500" />
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  ✅ {t('vin_ai_actions')}
                </span>
              </div>
              <ul className="space-y-1">
                {insight.recommendedActions.map((action, i) => (
                  <li key={i} className="text-[9px] text-slate-600 dark:text-slate-400 flex items-start gap-1">
                    <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VinAIInsights;