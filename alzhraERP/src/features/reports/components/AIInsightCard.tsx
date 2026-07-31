import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, ArrowUpRight, TrendingUp, Zap, Sparkles } from 'lucide-react';
import { cn } from '../../../core/utils';

export interface AIInsight {
    id: string;
    type: 'critical' | 'warning' | 'success' | 'info';
    title: string;
    message: string;
    action?: string;
    impact: 'high' | 'medium' | 'low';
}

interface AIInsightCardProps {
    insight: AIInsight;
}

const AIInsightCard: React.FC<AIInsightCardProps> = ({ insight }) => {
    const colors = {
        critical: {
            bg: 'bg-rose-500/10 dark:bg-rose-500/20',
            border: 'border-rose-200 dark:border-rose-500/30',
            text: 'text-rose-600 dark:text-rose-400',
            icon: AlertCircle,
            glow: 'shadow-rose-500/10'
        },
        warning: {
            bg: 'bg-amber-500/10 dark:bg-amber-500/20',
            border: 'border-amber-200 dark:border-amber-500/30',
            text: 'text-amber-600 dark:text-amber-400',
            icon: AlertTriangle,
            glow: 'shadow-amber-500/10'
        },
        success: {
            bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
            border: 'border-emerald-200 dark:border-emerald-500/30',
            text: 'text-emerald-600 dark:text-emerald-400',
            icon: CheckCircle2,
            glow: 'shadow-emerald-500/10'
        },
        info: {
            bg: 'bg-blue-500/10 dark:bg-blue-500/20',
            border: 'border-blue-200 dark:border-blue-500/30',
            text: 'text-blue-600 dark:text-blue-400',
            icon: Info,
            glow: 'shadow-blue-500/10'
        }
    };

    const config = colors[insight.type];
    const Icon = config.icon;

    return (
        <div className={cn(
            "group relative glass-panel bento-item p-6 flex flex-col justify-between min-h-[180px] border transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl",
            config.bg, config.border, config.glow
        )}>
            {/* Background Accent Gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-current opacity-[0.03] rounded-full -mr-16 -mt-16 blur-3xl transition-all duration-700 group-hover:scale-150" />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={cn("p-2.5 rounded-xl shadow-lg", config.text, "bg-white/40 dark:bg-slate-900/40")}>
                        <Icon size={18} />
                    </div>
                    {insight.impact === 'high' && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-900/90 dark:bg-white/10 backdrop-blur-md shadow-xl border border-white/10">
                            <Zap size={10} className="text-amber-400 fill-amber-400 animate-pulse" />
                            <span className="text-[8px] font-black text-white uppercase tracking-tighter">High Priority</span>
                        </div>
                    )}
                </div>

                <h4 className={cn("text-sm font-black mb-2 tracking-tight flex items-center gap-2", config.text)}>
                    <Sparkles size={12} className="opacity-50" />
                    {insight.title}
                </h4>
                <p className="text-[11px] leading-relaxed font-bold text-slate-600 dark:text-slate-300">
                    {insight.message}
                </p>
            </div>

            <div className="pt-4 flex items-center justify-between mt-auto">
                {insight.action && (
                    <button className={cn(
                        "flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-transparent hover:border-current transition-all",
                        config.text
                    )}>
                        {insight.action}
                        <ArrowUpRight size={10} />
                    </button>
                )}
                <div className="flex items-center gap-2 text-slate-400">
                    <TrendingUp size={12} className="opacity-30" />
                </div>
            </div>
        </div>
    );
};

export default AIInsightCard;
