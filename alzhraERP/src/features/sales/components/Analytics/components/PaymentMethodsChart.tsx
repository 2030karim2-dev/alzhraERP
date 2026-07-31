import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';
import { Wallet, CreditCard, Banknote, Landmark, HelpCircle } from 'lucide-react';
import { useI18nStore } from '@/lib/i18nStore';
import { cn } from '@/core/utils';


const GRADIENTS = [
    { start: '#3b82f6', end: '#2563eb' },
    { start: '#10b981', end: '#059669' },
    { start: '#f59e0b', end: '#d97706' },
    { start: '#ef4444', end: '#dc2626' },
    { start: '#8b5cf6', end: '#7c3aed' },
    { start: '#ec4899', end: '#db2777' },
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
    formatCurrency
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
        }, 500);

        return () => clearInterval(interval);
    }, []);

    const getMethodInfo = (method: string) => {
        switch (method) {
            case 'cash': return { label: t.cash, icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
            case 'credit': return { label: t.credit || 'Debt', icon: CreditCard, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' };
            case 'card': return { label: t.card, icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' };
            case 'bank_transfer': return { label: t.bank_transfer, icon: Landmark, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' };
            default: return { label: method, icon: HelpCircle, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/20' };
        }
    };

    const renderActiveShape = (props: any) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
        return (
            <g>
                <filter id="pieGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={fill} floodOpacity="0.5" />
                </filter>
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius + 8}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                    filter="url(#pieGlow)"
                    cornerRadius={6}
                />
            </g>
        );
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
            <h4 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                <Wallet size={18} className="text-purple-600" />
                {t.payment_methods}
            </h4>
            <div ref={containerRef} className="h-56 relative group w-full" dir="ltr">
                {isMounted && (
                    <ResponsiveContainer width="99%" height={224}>
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
                                innerRadius={70}
                                outerRadius={90}
                                paddingAngle={4}
                                dataKey="amount"
                                nameKey="method"
                                stroke="none"
                                cornerRadius={6}
                                activeShape={renderActiveShape}
                            >
                                {salesByPaymentMethod.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={`url(#pieGrad-${index % GRADIENTS.length})`} />
                                ))}
                            </Pie>
                            <Tooltip
                                content={({ active, payload }: any) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        const info = getMethodInfo(data.method);
                                        return (
                                            <div className="p-3 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl transition-all duration-300">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className={cn("p-1.5 rounded-lg", info.bg)}>
                                                        <info.icon size={12} className={info.color} />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-800 dark:text-white">{info.label}</span>
                                                </div>
                                                <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                                                    {formatCurrency(data.amount)}
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                                    {Math.round((data.amount / total) * 100)}% من الإجمالي
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

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.total || 'Total'}</span>
                    <span className="text-xl font-bold text-slate-800 dark:text-white font-mono">{formatCurrency(total)}</span>
                </div>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {salesByPaymentMethod.map((method, _index) => {
                    const percentage = total > 0 ? Math.round((method.amount / total) * 100) : 0;
                    const info = getMethodInfo(method.method);

                    return (
                        <div key={method.method} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                            <div className="flex items-center gap-2">
                                <div className={cn("p-2 rounded-xl", info.bg)}>
                                    <info.icon size={14} className={info.color} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">
                                        {info.label}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 mt-1">{percentage}%</span>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-slate-800 dark:text-white font-mono">
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
