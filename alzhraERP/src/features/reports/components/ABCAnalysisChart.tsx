import React from 'react';
import { PieChart as PieChartIcon, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Sector } from 'recharts';
import { cn } from '@/core/utils';

interface ABCAnalysisChartProps {
    data: { name: string; value: number; color: string }[];
}

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
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
            case 'A': return { label: 'تصنيف A', icon: Target, desc: 'أصناف عالية القيمة (80%)', bg: 'bg-emerald-50 dark:bg-emerald-900/20', textColor: 'text-emerald-500' };
            case 'B': return { label: 'تصنيف B', icon: TrendingUp, desc: 'أصناف متوسطة القيمة (15%)', bg: 'bg-blue-50 dark:bg-blue-900/20', textColor: 'text-blue-500' };
            case 'C': return { label: 'تصنيف C', icon: AlertTriangle, desc: 'أصناف منخفضة القيمة (5%)', bg: 'bg-amber-50 dark:bg-amber-900/20', textColor: 'text-amber-500' };
            default: return { label: name, icon: Target, desc: '', bg: 'bg-slate-50 dark:bg-slate-900/20', textColor: 'text-slate-500' };
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 h-full flex flex-col group">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-base font-bold flex items-center gap-3 text-slate-800 dark:text-slate-100">
                        <div className="p-2.5 bg-purple-500/10 rounded-2xl">
                            <PieChartIcon size={20} className="text-purple-500" />
                        </div>
                        {/* التحليل الثلاثي (ABC Analysis) */}
                        التحليل الثلاثي (ABC)
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">تصنيف المنتجات حسب مساهمتها في الربح</p>
                </div>
            </div>

            <div className="h-[240px] w-full flex items-center justify-center overflow-hidden relative" style={{ minHeight: '240px' }}>
                {isMounted && (
                    <ResponsiveContainer width="100%" height={240} minWidth={1} debounce={1} minHeight={1}>
                        <PieChart>
                            <defs>
                                {data.map((entry, index) => (
                                    <linearGradient key={`abcGrad-${index}`} id={`abcGrad-${index}`} x1="0" y1="0" x2="0" y2="1">
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
                                activeShape={renderActiveShape}
                                animationDuration={1500}
                                animationBegin={200}
                            >
                                {data.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={`url(#abcGrad-${index})`} />
                                ))}
                            </Pie>
                            <RechartsTooltip
                                content={({ active, payload }: any) => {
                                    if (active && payload && payload.length) {
                                        const entry = payload[0].payload;
                                        const info = getCategoryInfo(entry.name);
                                        return (
                                            <div className="p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl transition-all duration-300">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={cn("p-2 rounded-xl", info.bg)}>
                                                        <info.icon size={16} className={info.textColor} />
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-800 dark:text-white block">{info.label}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 block">{info.desc}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-8">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">القيمة المقدرة</span>
                                                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                                                        {Math.round((entry.value / total) * 100)}%
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}

                {/* Center Stats */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">تحليل</span>
                    <span className="text-2xl font-bold text-slate-800 dark:text-white font-mono">ABC</span>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3">
                {data.map((entry, _index) => {
                    const info = getCategoryInfo(entry.name);
                    const percentage = Math.round((entry.value / total) * 100);
                    return (
                        <div key={entry.name} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <div className={cn("p-2.5 rounded-xl shadow-sm", info.bg)}>
                                    <info.icon size={18} className={info.textColor} />
                                </div>
                                <div>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">{info.label}</span>
                                    <span className="text-[10px] font-bold text-slate-400">{info.desc}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono block">{percentage}%</span>
                                <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000 delay-500 shadow-[0_0_8px_rgba(var(--color),0.5)]"
                                        style={{
                                            width: `${percentage}%`,
                                            backgroundColor: entry.color
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
