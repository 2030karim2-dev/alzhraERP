import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';
import { useThemeStore } from '../../lib/themeStore';

interface CategoriesChartProps {
  data: { name: string; value: number }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} fontSize={16} fontWeight="bold">
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
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 12}
        fill={fill}
      />
    </g>
  );
};

const CategoriesChart: React.FC<CategoriesChartProps> = ({ data }) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
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
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const onPieEnter = (_: any, _index: number) => {
    // setActiveIndex(index);
  };

  return (
    <div 
      ref={containerRef}
      className="h-[300px] min-h-[300px] w-full relative group overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent dark:from-slate-800/20 rounded-3xl pointer-events-none" />
      {isMounted ? (
        <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
          <PieChart>
            <defs>
              {COLORS.map((color, index) => (
                <linearGradient key={`gradient-${index}`} id={`pieGradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={1} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                </linearGradient>
              ))}
              <filter id="shadowPie" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity={isDark ? 0.4 : 0.15} />
              </filter>
            </defs>
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
                borderRadius: '16px',
                color: isDark ? '#f8fafc' : '#0f172a',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                fontWeight: 'bold',
                padding: '12px 16px'
              }}
              itemStyle={{ color: isDark ? '#cbd5e1' : '#475569', fontWeight: 'bold' }}
              formatter={(value: any) => [new Intl.NumberFormat('en-US').format(value || 0), 'القيمة']}
            />
            <Pie
              activeShape={renderActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={6}
              dataKey="value"
              onMouseEnter={onPieEnter}
              stroke="none"
              filter="url(#shadowPie)"
            >
              {data.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#pieGradient-${index % COLORS.length})`}
                  className="transition-all duration-300 hover:opacity-90 cursor-pointer outline-none"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="w-full h-full bg-slate-50/50 dark:bg-slate-800/10 animate-pulse rounded-3xl flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border-8 border-slate-200 dark:border-slate-700 border-t-blue-500 animate-spin opacity-20" />
        </div>
      )}
    </div>
  );
};

export default CategoriesChart;
