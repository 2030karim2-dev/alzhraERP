import React from 'react';
import { PieChart as PieChartIcon, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import { cn } from '@/core/utils';

interface ABCAnalysisChartProps {
  data: Array<{ name: string; value: number; color: string }>;
}

/** معاملات الشكل النشط في رسم recharts Pie. */
interface ActiveShapeProps {
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  fill?: string;
}

const renderActiveShape = (props: ActiveShapeProps) => {
  const {
    cx = 0,
    cy = 0,
    innerRadius = 0,
    outerRadius = 0,
    startAngle = 0,
    endAngle = 0,
    fill = '#8884d8',
  } = props;
  return (
    <g>
      <filter id="abcGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={fill} floodOpacity="0.5" />
      </filter>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        filter="url(#abcGlow)"
        cornerRadius={8}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 15}
        fill={fill}
        cornerRadius={2}
      />
    </g>
  );
};

export const ABCAnalysisChart: React.FC<ABCAnalysisChartProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const getCategoryInfo = (name: string) => {
    switch (name) {
      case 'A':
        return {
          label: 'تصنيف A',
          icon: Target,
          desc: 'أصناف عالية القيمة (80%)',
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
          textColor: 'text-emerald-500',
        };
      case 'B':
        return {
          label: 'تصنيف B',
          icon: TrendingUp,
          desc: 'أصناف متوسطة القيمة (15%)',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          textColor: 'text-blue-500',
        };
      case 'C':
        return {
          label: 'تصنيف C',
          icon: AlertTriangle,
          desc: 'أصناف منخفضة القيمة (5%)',
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          textColor: 'text-amber-500',
        };
      default:
        return {
          label: name,
          icon: Target,
          desc: '',
          bg: 'bg-slate-50 dark:bg-slate-900/20',
          textColor: 'text-slate-500',
        };
    }
  };

  return (
    <div className="group flex h-full flex-col rounded-[2rem] border border-slate-100 bg-[var(--app-surface)] p-8 shadow-sm dark:border-slate-800 max-md:p-4">
      <div className="mb-8 flex items-center justify-between max-md:mb-3">
        <div>
          <h3 className="flex items-center text-base font-bold text-slate-800 dark:text-slate-100 max-md:gap-3">
            <div className="rounded-2xl bg-purple-500/10 max-md:rounded-xl max-md:p-2.5">
              <PieChartIcon size={20} className="text-purple-500" />
            </div>
            {/* التحليل الثلاثي (ABC Analysis) */}
            التحليل الثلاثي (ABC)
          </h3>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            تصنيف المنتجات حسب مساهمتها في الربح
          </p>
        </div>
      </div>

      <div
        className="relative flex h-[240px] w-full items-center justify-center overflow-hidden"
        style={{ minHeight: '240px' }}
      >
        {isMounted && (
          <ResponsiveContainer width="100%" height={240} minWidth={1} debounce={1} minHeight={1}>
            <PieChart>
              <defs>
                {data.map((entry, index) => (
                  <linearGradient
                    key={`abcGrad-${index}`}
                    id={`abcGrad-${index}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                    <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={95}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
                cornerRadius={8}
                activeShape={renderActiveShape as unknown as never}
                animationDuration={1500}
                animationBegin={200}
              >
                {data.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={`url(#abcGrad-${index})`} />
                ))}
              </Pie>
              <RechartsTooltip
                content={
                  (({
                    active,
                    payload,
                  }: {
                    active?: boolean;
                    payload?: Array<{ payload?: { name?: string; value?: number } }>;
                  }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const entry = payload[0].payload;
                    if (!entry?.name || entry.value === undefined) return null;
                    const info = getCategoryInfo(entry.name);
                    return (
                      <div className="rounded-3xl border border-slate-200/50 bg-white/90 shadow-2xl backdrop-blur-xl transition-all duration-300 dark:border-slate-700/50 dark:bg-slate-900/90 max-md:rounded-xl max-md:p-4">
                        <div className="mb-2 flex items-center max-md:gap-3">
                          <div className={cn('rounded-xl max-md:p-2', info.bg)}>
                            <info.icon size={16} className={info.textColor} />
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-slate-800 dark:text-white">
                              {info.label}
                            </span>
                            <span className="block text-[10px] font-bold text-slate-400">
                              {info.desc}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-8 border-t border-slate-100 pt-3 dark:border-slate-800 max-md:gap-3">
                          <span className="text-[10px] font-bold uppercase text-slate-400">
                            القيمة المقدرة
                          </span>
                          <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                            {Math.round((entry.value / total) * 100)}%
                          </span>
                        </div>
                      </div>
                    );
                  }) as unknown as never
                }
              />
            </PieChart>
          </ResponsiveContainer>
        )}

        {/* Center Stats */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            تحليل
          </span>
          <span className="font-mono text-2xl font-bold text-slate-800 dark:text-white max-md:text-lg">
            ABC
          </span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 max-md:mt-3 max-md:gap-3">
        {data.map((entry, _index) => {
          const info = getCategoryInfo(entry.name);
          const percentage = Math.round((entry.value / total) * 100);
          return (
            <div
              key={entry.name}
              className="flex items-center justify-between rounded-2xl border border-transparent bg-slate-50 transition-all duration-300 hover:border-slate-200 dark:bg-slate-800/40 dark:hover:border-slate-700 max-md:rounded-xl max-md:p-4"
            >
              <div className="flex items-center max-md:gap-4">
                <div className={cn('rounded-xl shadow-sm max-md:p-2.5', info.bg)}>
                  <info.icon size={18} className={info.textColor} />
                </div>
                <div>
                  <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    {info.label}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{info.desc}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="block font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                  {percentage}%
                </span>
                <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full shadow-[0_0_8px_rgba(var(--color),0.5)] transition-all delay-500 duration-1000"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: entry.color,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
