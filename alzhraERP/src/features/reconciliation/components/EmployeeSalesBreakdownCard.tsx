import React from 'react';
import { Users, ShoppingBag, CreditCard, Banknote } from 'lucide-react';
import type { EmployeeSalesSummary } from '../types';

interface EmployeeSalesBreakdownCardProps {
  breakdown: EmployeeSalesSummary[];
  totalSales: number;
}

export const EmployeeSalesBreakdownCard: React.FC<EmployeeSalesBreakdownCardProps> = ({
  breakdown,
  totalSales,
}) => {
  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card-bg)] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between border-b border-[var(--app-border)] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--app-text)]">فرز مبيعات الموظفين لليوم</h3>
            <p className="text-[11px] text-[var(--app-text-secondary)]">
              بيان مساهمة كل موظف وفواتيره الصادرة لحفظ الحقوق والشفافية
            </p>
          </div>
        </div>
        <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">
          {breakdown.length} موظف
        </span>
      </div>

      {breakdown.length === 0 ? (
        <div className="py-6 text-center text-xs text-[var(--app-text-secondary)]">
          لا توجد مبيعات مسجلة في هذا التاريخ حتى الآن
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {breakdown.map((emp, index) => {
            const percentage =
              totalSales > 0 ? Math.round((emp.total_sales / totalSales) * 100) : 0;

            return (
              <div
                key={emp.user_id || index}
                className="flex flex-col justify-between rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-3 transition-colors hover:border-blue-300 dark:hover:border-blue-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
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
                      {emp.total_sales.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
                    </div>
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                      {percentage}% من المبيعات
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="my-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--app-card-bg)]">
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
                      {emp.cash_sales.toLocaleString('ar-SA')} ر.س
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[var(--app-text-secondary)]">
                    <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                    <span>شبكة:</span>
                    <span className="font-bold text-[var(--app-text)]">
                      {emp.card_sales.toLocaleString('ar-SA')} ر.س
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
