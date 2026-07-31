import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { useThemeStore } from '../../../../lib/themeStore';
import { reportService } from '../../services/reportService';
import { useAuthStore } from '../../../auth/store';
import { Loader2, TrendingUp } from 'lucide-react';
import { cn, formatCurrency } from '@/core/utils';
import { useBranchFilter } from '../../../branches/hooks/useBranchFilter';

const FinancialPerformanceChart: React.FC = () => {
  const { theme } = useThemeStore();
  const { user } = useAuthStore();
  const { branchId } = useBranchFilter();
  const isDark = theme === 'dark';

  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const fetchData = async () => {
      if (!user?.company_id) return;
      try {
        const currentYear = new Date().getFullYear();
        const result = await reportService.getMonthlyPerformance(user.company_id, currentYear, branchId);
        setData(result);
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.company_id, branchId]);

  if (isLoading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <p className="text-[10px] font-bold uppercase tracking-widest animate-pulse">جاري تحليل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="h-72 w-full relative group p-2">
      <div className="absolute top-0 right-0 p-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-xl">
          <TrendingUp size={12} className="text-emerald-500" />
          <span className="text-[10px] font-bold uppercase text-emerald-500 tracking-tighter">Performance Optimized</span>
        </div>
      </div>

      {isMounted && (
        <ResponsiveContainer width="100%" height={288} minWidth={1} debounce={1} minHeight={1}>
          <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
              </linearGradient>
              <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                <stop offset="100%" stopColor="#e11d48" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'black' }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            />
            <Tooltip
              cursor={{ fill: isDark ? '#ffffff05' : '#00000005' }}
              content={({ active, payload }: any) => {
                if (active && payload && payload.length) {
                  return (
                    <div className={cn(
                      "p-4 rounded-3xl border shadow-2xl backdrop-blur-xl transition-all duration-300",
                      isDark
                        ? "bg-slate-900/80 border-slate-700/50 shadow-black/50"
                        : "bg-white/90 border-slate-200/50 shadow-slate-200/50"
                    )}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-[0.2em] border-b border-slate-200/10 pb-2">{payload[0].payload.name}</p>
                      <div className="space-y-3">
                        {payload.map((entry: any, index: number) => (
                          <div key={index} className="flex items-center justify-between gap-8">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span className="text-[11px] font-bold text-slate-500 uppercase">{entry.name}</span>
                            </div>
                            <span className="text-sm font-bold font-mono tracking-tighter" style={{ color: entry.color }}>{formatCurrency(entry.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: "10px", fontWeight: "black", textTransform: "uppercase", letterSpacing: "0.1em", paddingTop: "20px" }}
            />
            <Bar
              dataKey="revenues"
              name="الإيرادات"
              fill="url(#gradRevenue)"
              radius={[10, 10, 0, 0]}
              barSize={12}
              animationDuration={2000}
              minPointSize={1}
            />
            <Bar
              dataKey="expenses"
              name="المصروفات"
              fill="url(#gradExpense)"
              radius={[10, 10, 0, 0]}
              barSize={12}
              animationDuration={2000}
              minPointSize={1}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default FinancialPerformanceChart;