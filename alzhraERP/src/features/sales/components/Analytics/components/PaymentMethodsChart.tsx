/* eslint-disable max-lines-per-function, complexity, @typescript-eslint/explicit-function-return-type, @typescript-eslint/restrict-template-expressions, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-deprecated */
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';
import { Wallet, CreditCard, Banknote, Landmark, HelpCircle } from 'lucide-react';
import { useI18nStore } from '@/lib/i18nStore';
import { cn } from '@/core/utils';

const GRADIENTS = [
  { start: '#3b82f6', end: '#1d4ed8' },
  { start: '#10b981', end: '#047857' },
  { start: '#8b5cf6', end: '#6d28d9' },
  { start: '#f59e0b', end: '#b45309' },
  { start: '#ef4444', end: '#b91c1c' },
  { start: '#06b6d4', end: '#0e7490' },
];

interface PaymentMethod {
  method: string;
  amount: number;
}

interface PaymentMethodsChartProps {
  salesByPaymentMethod: PaymentMethod[];
  formatCurrency: (value: number) => string;
}

export const PaymentMethodsChart: React.FC<PaymentMethodsChartProps> = ({
  salesByPaymentMethod,
  formatCurrency,
}) => {
  const { dictionary: t } = useI18nStore();
  const total = salesByPaymentMethod.reduce((sum, p) => sum + p.amount, 0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    const checkDimensions = () => {
      if (containerRef.current && containerRef.current.offsetWidth > 0) {
        setIsMounted(true);
        return true;
      }
      return false;
    };

    if (checkDimensions()) return;
    const interval = setInterval(() => {
      if (checkDimensions()) clearInterval(interval);
    }, 400);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const getMethodInfo = (method: string) => {
    switch (method) {
      case 'cash':
        return {
          label: t.cash || 'نقداً',
          icon: Banknote,
          color: 'text-emerald-500',
          bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        };
      case 'credit':
        return {
          label: t.credit || 'آجل',
          icon: CreditCard,
          color: 'text-rose-500',
          bg: 'bg-rose-50 dark:bg-rose-950/40',
        };
      case 'card':
      case 'mada':
      case 'visa':
        return {
          label: t.card || 'بطاقة بنكية',
          icon: CreditCard,
          color: 'text-blue-500',
          bg: 'bg-blue-50 dark:bg-blue-950/40',
        };
      case 'bank_transfer':
        return {
          label: t.bank_transfer || 'تحويل بنكي',
          icon: Landmark,
          color: 'text-purple-500',
          bg: 'bg-purple-50 dark:bg-purple-950/40',
        };
      default:
        return {
          label: method === 'unknown' ? 'أخرى' : method,
          icon: HelpCircle,
          color: 'text-slate-500',
          bg: 'bg-slate-50 dark:bg-slate-800/40',
        };
    }
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={Number(outerRadius) + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          cornerRadius={4}
        />
      </g>
    );
  };

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/80">
      <div>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
            <Wallet size={16} />
          </div>
          <h4 className="text-base font-black tracking-tight text-slate-800 dark:text-white">
            {t.payment_methods}
          </h4>
        </div>
        <p className="mt-0.5 text-xs text-slate-400">توزيع قنوات التحصيل والسيولة</p>
      </div>

      {/* Donut Chart Container */}
      <div ref={containerRef} className="relative my-2 h-56 w-full" dir="ltr">
        {isMounted && total > 0 ? (
          <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
            <PieChart>
              <defs>
                {GRADIENTS.map((g, i) => (
                  <linearGradient key={`grad-${i}`} id={`pieGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={g.start} />
                    <stop offset="100%" stopColor={g.end} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={salesByPaymentMethod}
                cx="50%"
                cy="50%"
                innerRadius={68}
                outerRadius={86}
                paddingAngle={3}
                dataKey="amount"
                nameKey="method"
                stroke="none"
                cornerRadius={4}
                activeShape={renderActiveShape}
              >
                {salesByPaymentMethod.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={`url(#pieGrad-${index % GRADIENTS.length})`} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }: any) => {
                  if (active && payload?.length) {
                    const data = payload[0].payload;
                    const info = getMethodInfo(String(data.method));
                    return (
                      <div className="rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                        <div className="mb-1 flex items-center gap-2">
                          <div className={cn('rounded-lg p-1', info.bg)}>
                            <info.icon size={12} className={info.color} />
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-white">
                            {info.label}
                          </span>
                        </div>
                        <div className="font-mono text-sm font-black text-slate-900 dark:text-slate-100">
                          {formatCurrency(Number(data.amount))}
                        </div>
                        <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                          {total > 0 ? Math.round((data.amount / total) * 100) : 0}% من إجمالي
                          المدفوعات
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            لا توجد مدفوعات مسجلة لهذه الفترة
          </div>
        )}

        {/* Center Donut Hub */}
        {total > 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              إجمالي المحصل
            </span>
            <span className="font-mono text-base font-black tracking-tight text-slate-900 dark:text-white">
              {formatCurrency(total)}
            </span>
          </div>
        )}
      </div>

      {/* Methods List */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {salesByPaymentMethod.map(method => {
          const percentage = total > 0 ? Math.round((method.amount / total) * 100) : 0;
          const info = getMethodInfo(method.method);

          return (
            <div
              key={method.method}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 transition-all hover:border-slate-200 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <div className={cn('rounded-lg p-1.5', info.bg)}>
                  <info.icon size={13} className={info.color} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {info.label}
                  </p>
                  <p className="font-mono text-[10px] font-semibold text-slate-400">
                    {percentage}%
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                {formatCurrency(method.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentMethodsChart;
