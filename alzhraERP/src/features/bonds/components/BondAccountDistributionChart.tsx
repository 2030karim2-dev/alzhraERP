import React, { useState } from 'react';
import { Wallet } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';
import { cn, formatCurrency } from '../../../core/utils';

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'];

interface BondAccountDistributionChartProps {
    data: { name: string; amount: number; count: number }[];
    isDark: boolean;
}

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
    return (
        <g>
            <text x={cx} y={cy} dy={-10} textAnchor="middle" fill={fill} fontSize={12} fontWeight="black" className="uppercase tracking-[0.2em] opacity-40">
                ACCOUNT
            </text>
            <text x={cx} y={cy} dy={15} textAnchor="middle" fill={fill} fontSize={16} fontWeight="black">
                {payload.name}
            </text>
            <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} />
            <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 10} outerRadius={outerRadius + 14} fill={fill} />
        </g>
    );
};

const BondAccountDistributionChart: React.FC<BondAccountDistributionChartProps> = ({ data, isDark }) => {
    const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-purple-500/10 rounded-2xl">
                    <Wallet size={18} className="text-purple-500" />
                </div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">توزيع النقدية حسب الحسابات</h4>
            </div>
            <div className="h-[200px] mb-8">
                <ResponsiveContainer width="100%" height={200} minWidth={100} minHeight={200}>
                    <PieChart>
                        <Pie
                            {...({ activeIndex } as any)}
                            activeShape={renderActiveShape}
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={8}
                            dataKey="amount"
                            nameKey="name"
                            onMouseEnter={(_: any, index: number) => setActiveIndex(index)}
                            onMouseLeave={() => setActiveIndex(undefined)}
                            animationDuration={1500}
                        >
                            {data.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="outline-none" />
                            ))}
                        </Pie>
                        <Tooltip
                            content={({ active, payload }: any) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className={cn(
                                            "p-4 rounded-3xl border shadow-2xl backdrop-blur-xl",
                                            isDark ? "bg-slate-900/80 border-slate-700/50" : "bg-white/90 border-slate-200/50"
                                        )}>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{payload[0].name}</p>
                                            <p className="text-lg font-bold font-mono tracking-tighter" style={{ color: payload[0].payload.fill }}>{formatCurrency(payload[0].value)}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {data.slice(0, 4).map((acc, index) => (
                    <div key={acc.name} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-purple-500/30 transition-all duration-300">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(167,139,250,0.5)]" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase truncate">{acc.name}</span>
                        </div>
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100 font-mono tracking-tighter" dir="ltr">{formatCurrency(acc.amount)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BondAccountDistributionChart;
