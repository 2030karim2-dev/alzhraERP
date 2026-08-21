import React, { useState } from 'react';
import {
  Sparkles,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  BellRing,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '../../../../core/utils';
import { formatCurrency } from '../../../../core/utils/currencyUtils';
import { useDebtDashboard } from '../hooks/useDebtQueries';
import AIDebtRiskModal from './AIDebtRiskModal';
import ReminderModal from './ReminderModal';
import type { FollowUpDashboardRow } from '../types';

export const AIDebtAdvisor: React.FC = () => {
  const { data: rows = [], isLoading } = useDebtDashboard();
  const [selectedRowForRisk, setSelectedRowForRisk] = useState<FollowUpDashboardRow | null>(null);
  const [selectedRowForReminder, setSelectedRowForReminder] = useState<FollowUpDashboardRow | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading || rows.length === 0) return null;

  // Filter top risky debtors: critical > overdue > highest balance
  const highRiskDebtors = rows
    .filter((r) => r.classification === 'critical' || r.has_broken_promise || r.days_overdue > 14)
    .slice(0, 4);

  if (highRiskDebtors.length === 0) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-blue-900/10 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-blue-950/40 rounded-3xl border border-purple-200/80 dark:border-purple-800/40 shadow-sm overflow-hidden animate-in fade-in duration-500">
        {/* Advisor Header */}
        <div className="p-4 md:p-5 flex items-center justify-between border-b border-purple-100 dark:border-purple-900/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-purple-500/20">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-slate-100">
                  مستشار التحصيل الذكي (AI Debt Advisor)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                  تحليل استباقي فوري
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                تم رصد ({highRiskDebtors.length}) عملاء ذوي أولوية قصوى للمتابعة والتحصيل الفوري اليوم
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {/* Advisor Body */}
        {isExpanded && (
          <div className="p-4 md:p-5 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {highRiskDebtors.map((debtor) => (
                <div
                  key={`${debtor.party_id}-${debtor.currency_code}`}
                  className="p-3.5 rounded-2xl border border-white/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 shadow-sm hover:border-purple-300 dark:hover:border-purple-700/60 transition-all flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-extrabold text-gray-900 dark:text-slate-100">
                        {debtor.party_name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md">
                          تأخير {debtor.days_overdue} يوم
                        </span>
                        {debtor.has_broken_promise && (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                            ⚠️ وعد مخلَف
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-xs font-black font-mono text-gray-900 dark:text-slate-100 block">
                        {formatCurrency(Number(debtor.outstanding_balance), debtor.currency_code)}
                      </span>
                      <span className="text-[9px] text-gray-400 block mt-0.5">
                        {debtor.invoice_count} فواتير
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedRowForRisk(debtor)}
                      className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <Sparkles size={12} />
                      تحليل المخاطر
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRowForReminder(debtor)}
                      className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 hover:bg-green-100 border border-green-200 dark:border-green-800/40 transition-colors flex items-center gap-1"
                    >
                      <BellRing size={11} />
                      تذكير واتساب
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Risk Modal */}
      <AIDebtRiskModal
        isOpen={Boolean(selectedRowForRisk)}
        onClose={() => setSelectedRowForRisk(null)}
        row={selectedRowForRisk}
        onOpenReminder={(r) => {
          setSelectedRowForRisk(null);
          setSelectedRowForReminder(r);
        }}
      />

      {/* Reminder Modal */}
      {selectedRowForReminder && (
        <ReminderModal
          isOpen={Boolean(selectedRowForReminder)}
          onClose={() => setSelectedRowForReminder(null)}
          row={selectedRowForReminder}
        />
      )}
    </>
  );
};

export default AIDebtAdvisor;
