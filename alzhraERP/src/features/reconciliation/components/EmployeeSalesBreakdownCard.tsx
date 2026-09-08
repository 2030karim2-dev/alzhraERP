import React, { useState } from 'react';
import { Users, ShoppingBag, CreditCard, Banknote, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '../../../core/utils';
import type { EmployeeSalesSummary } from '../types';

interface EmployeeSalesBreakdownCardProps {
  breakdown: EmployeeSalesSummary[];
  totalSales: number;
  currency?: string | undefined;
  defaultExpanded?: boolean | undefined;
}

export const EmployeeSalesBreakdownCard: React.FC<EmployeeSalesBreakdownCardProps> = ({
  breakdown,
  totalSales,
  currency = 'SAR',
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card-bg)] shadow-sm transition-all">
      {/* Header Bar - Clickable to toggle accordion */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="hover:bg-[var(--app-hover)]/50 flex w-full items-center justify-between rounded-xl p-3.5 text-right transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-[var(--app-text)]">
                فرز مبيعات الموظفين لليوم
              </h3>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                {breakdown.length} موظف
              </span>
            </div>
            <p className="text-[11px] text-[var(--app-text-secondary)]">
              بيان مساهمة وفواتير كل كاشير وموظف مبيعات لحفظ الحقوق والشفافية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--app-text-secondary)]">
          <span className="hidden font-semibold sm:inline">
            {isExpanded ? 'طي التفاصيل' : 'عرض التفاصيل'}
          </span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="border-t border-[var(--app-border)] p-4">
          {breakdown.length === 0 ? (
            <div className="py-6 text-center text-xs text-[var(--app-text-secondary)]">
              لا توجد مبيعات مسجلة في هذا التاريخ حتى الآن
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {breakdown.map((emp, index) => {
                const percentage =
                  totalSales > 0 ? Math.round((emp.total_sales / totalSales) * 100) : 0;

                return (
                  <div
                    key={emp.user_id || index}
                    className="flex flex-col justify-between rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-3 transition-colors hover:border-blue-500/30"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-card-bg)] text-xs font-black text-blue-600 dark:text-blue-400">
                          {emp.employee_name.slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[var(--app-text)]">
                            {emp.employee_name}
                          </h4>
                          <div className="flex items-center gap-1 text-[11px] text-[var(--app-text-secondary)]">
                            <ShoppingBag className="h-3 w-3" />
                            <span>{emp.invoice_count} فاتورة</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-left">
                        <div className="text-xs font-black text-[var(--app-text)]">
                          {formatCurrency(emp.total_sales, currency)}
                        </div>
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                          {percentage}% من المبيعات
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="my-2 h-1.5 w-full overflow-hidden rounded-full border border-[var(--app-border)] bg-[var(--app-card-bg)]">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {/* Cash vs Card breakdown */}
                    <div className="grid grid-cols-2 gap-2 border-t border-[var(--app-border)] pt-2 text-[11px]">
                      <div className="flex items-center gap-1 text-[var(--app-text-secondary)]">
                        <Banknote className="h-3.5 w-3.5 text-emerald-500" />
                        <span>كاش:</span>
                        <span className="font-bold text-[var(--app-text)]">
                          {formatCurrency(emp.cash_sales, currency)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[var(--app-text-secondary)]">
                        <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                        <span>شبكة:</span>
                        <span className="font-bold text-[var(--app-text)]">
                          {formatCurrency(emp.card_sales, currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
