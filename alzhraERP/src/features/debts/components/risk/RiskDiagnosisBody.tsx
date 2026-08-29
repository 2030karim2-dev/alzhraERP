import React from 'react';
import { Sparkles, AlertTriangle, Lightbulb, CheckCircle } from 'lucide-react';
import type { DebtRiskAnalysis } from '../../services/debtAiService';

interface RiskDiagnosisBodyProps {
  analysis: DebtRiskAnalysis;
}

export const RiskDiagnosisBody: React.FC<RiskDiagnosisBodyProps> = ({ analysis }) => {
  return (
    <div className="space-y-4">
      {/* Diagnosis Summary */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
          <Sparkles size={14} className="text-purple-500" />
          تشخيص الذكاء الاصطناعي للحالة
        </h4>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {analysis.summary}
        </p>
      </div>

      {/* Key Risk Factors */}
      {analysis.keyFactors && analysis.keyFactors.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30">
          <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-600" />
            عوامل الخطر الرئيسية
          </h4>
          <ul className="space-y-1.5 text-xs text-amber-950 dark:text-amber-200">
            {analysis.keyFactors.map((f, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Collection Strategy */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/70 dark:border-blue-900/40">
        <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200 mb-1.5 flex items-center gap-1.5">
          <Lightbulb size={14} className="text-blue-600" />
          الاستراتيجية الموصى بها
        </h4>
        <p className="text-xs text-blue-900 dark:text-blue-300 leading-relaxed font-semibold">
          {analysis.recommendedStrategy}
        </p>
        {analysis.paymentPlanSuggestion && (
          <div className="mt-2 pt-2 border-t border-blue-200/50 dark:border-blue-800/40 text-[11px] text-blue-800 dark:text-blue-300">
            💡 <span className="font-bold">اقتراح الجدولة: </span>
            {analysis.paymentPlanSuggestion}
          </div>
        )}
      </div>

      {/* Immediate Suggested Actions */}
      {analysis.suggestedActions && analysis.suggestedActions.length > 0 && (
        <div className="p-4 rounded-2xl bg-[var(--app-surface)] border border-slate-200 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
            <CheckCircle size={14} className="text-emerald-500" />
            الإجراءات الفورية المقترحة
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {analysis.suggestedActions.map((act, i) => (
              <div
                key={i}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
              >
                <span className="w-5 h-5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 text-[10px] font-black flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span>{act}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
