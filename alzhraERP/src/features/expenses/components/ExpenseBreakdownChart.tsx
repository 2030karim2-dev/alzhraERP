
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';
import { ExpenseCategorySummary } from '../types';
import { formatCurrency } from '../../../core/utils';
import { useThemeStore } from '@/lib/themeStore';
import { cn } from '@/core/utils';

interface Props {
  data: ExpenseCategorySummary[];
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;


  return (
    <g>
      <text x={cx} y={cy} dy={-10} textAnchor="middle" fill={fill} fontSize={12} fontWeight="black" className="uppercase tracking-widest opacity-40">
        CATEGORY
      </text>
      <text x={cx} y={cy} dy={15} textAnchor="middle" fill={fill} fontSize={18} fontWeight="black" className="font-mono">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 14}
        fill={fill}
      />
    </g>
  );
};

const ExpenseBreakdownChart: React.FC<Props> = ({ data }) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

  return (
    <div className="h-[320px] w-full relative group">
      <div className="absolute top-0 right-0 text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
        Interactive Analysis
      </div>
      <ResponsiveContainer width="100%" height={320} minWidth={1} minHeight={1}>
        <PieChart>
          <defs>
            {data.map((entry, index) => (
              <linearGradient key={`pieGrad-${index}`} id={`pieGrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
              </linearGradient>
            ))}
          </defs>
          <Pie
            {...{
              activeIndex,
              activeShape: renderActiveShape,
              data: data,
              cx: "50%",
              cy: "50%",
              innerRadius: 70,
              outerRadius: 95,
              paddingAngle: 4,
              dataKey: "value",
              stroke: "none",
              onMouseEnter: onPieEnter,
              onMouseLeave: onPieLeave,
              animationBegin: 0,
              animationDuration: 1500
            } as any}
          >
            {data.map((_entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={`url(#pieGrad-${index})`}
                className="transition-all duration-500 cursor-pointer"
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }: any) => {
              if (active && payload && payload.length) {
                return (
                  <div className={cn(
                    "p-4 rounded-3xl border shadow-2xl backdrop-blur-xl transition-all duration-300",
                    isDark
                      ? "bg-slate-900/80 border-slate-700/50 shadow-black/50"
                      : "bg-white/90 border-slate-200/50 shadow-slate-200/50"
                  )}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].payload.color }} />
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {payload[0].payload.name}
                      </p>
                    </div>
                    <p className="text-xl font-bold font-mono tracking-tight" style={{ color: payload[0].payload.color }}>
                      {formatCurrency(payload[0].value)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                      نسبة الإنفاق: {((payload[0].value / data.reduce((acc, curr) => acc + curr.value, 0)) * 100).toFixed(1)}%
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ExpenseBreakdownChart;
