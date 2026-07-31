import React, { useState, useEffect, useRef } from 'react';
import { Heart, TrendingUp, Shield, Zap, Activity } from 'lucide-react';
import { cn } from '../../../core/utils';

interface FinancialHealthProps {
    stats?: {
        sales: string;
        purchases?: string;
        expenses: string;
        debts: string;
    };
    cashFlow?: {
        inflow: number;
        outflow: number;
        net: number;
    };
    targets?: {
        salesProgress?: number;
        collectionRate?: number;
    };
    className?: string;
}

const useCountUp = (end: number, duration: number = 1500) => {
    const [count, setCount] = useState(0);
    const prevEnd = useRef(0);
    useEffect(() => {
        if (end === prevEnd.current) return;
        prevEnd.current = end;
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(end * eased));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [end, duration]);
    return count;
};

const FinancialHealthScore: React.FC<FinancialHealthProps> = ({
    stats, cashFlow, targets, className
}) => {
    const parseValue = (str?: string) => {
        if (!str) return 0;
        return parseFloat(str.replace(/[^0-9.-]/g, '')) || 0;
    };

    const sales = parseValue(stats?.sales);
    const expenses = parseValue(stats?.expenses);
    const debts = parseValue(stats?.debts);

    const profitMargin = sales > 0 ? Math.max(-100, Math.min(100, ((sales - expenses) / sales) * 100)) : 0;
    const profitScore = Math.max(0, Math.min(30, (profitMargin > 0 ? profitMargin * 0.3 : 0)));
    const collectionScore = Math.min(25, (targets?.collectionRate || 0) * 0.25);

    // Cash Health based on net cash flow (inflow vs outflow)
    const totalFlow = (cashFlow?.inflow || 0) + (cashFlow?.outflow || 0);
    const cashHealthRaw = totalFlow > 0 ? ((cashFlow?.inflow || 0) / totalFlow) * 100 : 0;
    const cashScore = Math.min(25, cashHealthRaw * 0.25);

    const debtRatio = sales > 0 ? Math.max(0, 100 - (debts / sales) * 100) : 0;
    const debtScore = Math.min(20, debtRatio * 0.2);

    const totalComponentsScore = profitScore + collectionScore + cashScore + debtScore;
    let healthScore = Math.min(100, Math.round(totalComponentsScore));
    
    // Strict zero-state: If there are no sales and no expenses, or if all component scores are zero
    if ((sales === 0 && expenses === 0 && totalFlow === 0) || totalComponentsScore === 0) {
        healthScore = 0;
    }

    const animatedScore = useCountUp(healthScore, 2000);

    const getScoreColor = () => {
        if (healthScore === 0) return { main: '#94a3b8', glow: 'rgba(148, 163, 184, 0.4)', label: 'نشاط جديد' };
        if (healthScore >= 75) return { main: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', label: 'ممتاز' };
        if (healthScore >= 50) return { main: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)', label: 'جيد' };
        if (healthScore >= 25) return { main: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', label: 'متوسط' };
        return { main: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)', label: 'ضعيف' };
    };

    const scoreColor = getScoreColor();
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

    const factors = [
        { label: 'الربح', score: profitScore, max: 30, icon: TrendingUp, color: 'text-emerald-400' },
        { label: 'التحصيل', score: collectionScore, max: 25, icon: Shield, color: 'text-blue-400' },
        { label: 'السيولة', score: cashScore, max: 25, icon: Zap, color: 'text-violet-400' },
        { label: 'الديون', score: debtScore, max: 20, icon: Activity, color: 'text-amber-400' },
    ];

    return (
        <div className={cn(
            "relative bg-[var(--app-surface)]/90 backdrop-blur-2xl border border-[var(--app-border)] rounded-2xl p-4 overflow-hidden",
            className
        )}>
            <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 30% 50%, ${scoreColor.glow} 0%, transparent 70%)` }}
            />

            <div className="relative z-10 flex items-center gap-4">
                {/* Compact SVG Gauge */}
                <div className="relative flex-shrink-0">
                    <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
                        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                        {Array.from({ length: 16 }).map((_, i) => {
                            const angle = (i / 16) * 360;
                            const rad = (angle * Math.PI) / 180;
                            return (
                                <line key={i}
                                    x1={60 + (radius - 12) * Math.cos(rad)} y1={60 + (radius - 12) * Math.sin(rad)}
                                    x2={60 + (radius - 9) * Math.cos(rad)} y2={60 + (radius - 9) * Math.sin(rad)}
                                    stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round"
                                />
                            );
                        })}
                        <circle cx="60" cy="60" r={radius} fill="none"
                            stroke={scoreColor.main} strokeWidth="8" strokeLinecap="round"
                            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                            style={{
                                transition: 'stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1)',
                                filter: `drop-shadow(0 0 6px ${scoreColor.glow})`
                            }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Heart size={12} style={{ color: scoreColor.main, filter: `drop-shadow(0 0 4px ${scoreColor.glow})` }} />
                        <span className="text-2xl font-bold font-mono tracking-tighter text-[var(--app-text)]" style={{ textShadow: `0 0 16px ${scoreColor.glow}` }}>
                            {animatedScore}
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: scoreColor.main }}>
                            {scoreColor.label}
                        </span>
                    </div>
                </div>

                {/* Factor Breakdown — compact */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-3">
                        <Heart size={12} className="text-rose-400" />
                        <h3 className="text-xs font-bold text-[var(--app-text)]">صحة النشاط المالي</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                        {factors.map((f) => (
                            <div key={f.label} className="bg-white/5 border border-white/5 rounded-lg p-2 hover:bg-white/10 transition-all duration-300">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1">
                                        <f.icon size={10} className={f.color} />
                                        <span className="text-[9px] font-bold text-[var(--app-text-secondary)]">{f.label}</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-[var(--app-text)] font-mono">{Math.round(f.score)}<span className="text-[var(--app-text-secondary)]">/{f.max}</span></span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${(f.score / f.max) * 100}%`, background: scoreColor.main }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialHealthScore;
