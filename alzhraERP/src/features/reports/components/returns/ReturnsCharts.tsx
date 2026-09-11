import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { Activity, BrainCircuit } from 'lucide-react';

const COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

interface Props {
  monthlyTrends: MonthlyTrendPoint[];
  reasonDistribution: ReasonDatum[];
}

/** نقطة شهرية في اتجاه المرتجعات. */
interface MonthlyTrendPoint {
  month: string;
  sales: number;
  purchase: number;
}

/** بند توزيع مسببات الارتجاع. */
interface ReasonDatum {
  name: string;
  value: number;
}

const ReturnsCharts: React.FC<Props> = ({ monthlyTrends, reasonDistribution }) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="text-base font-bold text-slate-800 dark:text-white">
              تحليل الاتجاه الزمني
            </h4>
            <p className="text-[10px] font-semibold text-slate-400">حركة التدفق الشهري</p>
          </div>
          <div className="rounded-lg bg-rose-500/10 p-2">
            <Activity size={16} className="text-rose-500" />
          </div>
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height={280} minWidth={1} minHeight={1}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
                opacity={0.6}
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '16px', fontSize: '11px', fontWeight: '700' }}
              />
              <Line
                type="monotone"
                dataKey="sales"
                name="مرتجع مبيعات"
                stroke="#f43f5e"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0, fill: '#f43f5e' }}
              />
              <Line
                type="monotone"
                dataKey="purchase"
                name="مرتجع مشتريات"
                stroke="#10b981"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0, fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="text-base font-bold text-slate-800 dark:text-white">
              توزيع مسببات الارتجاع
            </h4>
            <p className="text-[10px] font-semibold text-slate-400">مصفوفة أسباب الارتجاع</p>
          </div>
          <div className="rounded-lg bg-purple-500/10 p-2">
            <BrainCircuit size={16} className="text-purple-500" />
          </div>
        </div>
        {reasonDistribution.length > 0 ? (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height={280} minWidth={1} minHeight={1}>
              <RePieChart>
                <Pie
                  data={reasonDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                >
                  {reasonDistribution.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '10px', fontWeight: '700', paddingTop: '12px' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[280px] flex-col items-center justify-center text-slate-400">
            <p className="text-xs font-semibold">لا توجد بيانات أسباب مسجلة للفترة المحددة</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm sm:p-5 lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="text-base font-bold text-slate-800 dark:text-white">
              مقارنة الأداء الشهري
            </h4>
            <p className="text-[10px] font-semibold text-slate-400">
              المقارنة الشهرية لحركة المرتجعات
            </p>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height={300} minWidth={1} minHeight={1}>
            <BarChart data={monthlyTrends}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
                opacity={0.6}
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(51, 65, 85, 0.05)' }}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '16px', fontSize: '11px', fontWeight: '700' }}
              />
              <Bar
                dataKey="sales"
                name="مرتجع مبيعات"
                fill="#f43f5e"
                radius={[4, 4, 0, 0]}
                barSize={24}
                minPointSize={1}
              />
              <Bar
                dataKey="purchase"
                name="مرتجع مشتريات"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                barSize={24}
                minPointSize={1}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ReturnsCharts;
