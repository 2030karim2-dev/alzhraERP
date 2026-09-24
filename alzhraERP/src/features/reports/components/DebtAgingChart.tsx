/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/explicit-function-return-type, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing */
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { MobileCard } from './MobileComponents';
import { formatCurrency } from '../../../core/utils';
import { type AgingChartItem, AGING_COLORS } from '../types/debtAging';

interface DebtAgingChartProps {
  chartData: AgingChartItem[];
}

export const DebtAgingChart: React.FC<DebtAgingChartProps> = ({ chartData }) => {
  if (!chartData || !chartData.some(d => d.value > 0)) {
    return null;
  }

  return (
    <MobileCard padding="sm">
      <h4 className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-300">
        توزيع الديون حسب العمر
      </h4>
      <div className="h-[180px] w-full sm:h-[200px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              tick={{ fontSize: 10 }}
              tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
            />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
            <Tooltip
              formatter={value => [formatCurrency(Number(value) || 0), 'المبلغ']}
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} minPointSize={1}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={AGING_COLORS[i % AGING_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </MobileCard>
  );
};
