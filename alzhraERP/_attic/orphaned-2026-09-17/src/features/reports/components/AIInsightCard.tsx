import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowUpRight,
  TrendingUp,
  Zap,
  Sparkles,
} from 'lucide-react';
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
      glow: 'shadow-rose-500/10',
    },
    warning: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      border: 'border-amber-200 dark:border-amber-500/30',
      text: 'text-amber-600 dark:text-amber-400',
      icon: AlertTriangle,
      glow: 'shadow-amber-500/10',
    },
    success: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      border: 'border-emerald-200 dark:border-emerald-500/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      icon: CheckCircle2,
      glow: 'shadow-emerald-500/10',
    },
    info: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      border: 'border-blue-200 dark:border-blue-500/30',
      text: 'text-blue-600 dark:text-blue-400',
      icon: Info,
      glow: 'shadow-blue-500/10',
    },
  };

  const config = colors[insight.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'glass-panel bento-item group relative flex min-h-[180px] flex-col justify-between border p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl max-md:p-3',
        config.bg,
        config.border,
        config.glow
      )}
    >
      {/* Background Accent Gradient */}
      <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-current opacity-[0.03] blur-3xl transition-all duration-700 group-hover:scale-150" />

      <div className="relative z-10">
        <div className="mb-4 flex items-start justify-between">
          <div
            className={cn(
              'rounded-xl shadow-lg max-md:p-2.5',
              config.text,
              'bg-white/40 dark:bg-slate-900/40'
            )}
          >
            <Icon size={18} />
          </div>
          {insight.impact === 'high' && (
            <div className="flex items-center rounded-full border border-white/10 bg-slate-900/90 px-2 py-1 shadow-xl backdrop-blur-md dark:bg-white/10 max-md:gap-1.5">
              <Zap size={10} className="animate-pulse fill-amber-400 text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-tighter text-white">
                High Priority
              </span>
            </div>
          )}
        </div>

        <h4
          className={cn(
            'mb-2 flex items-center text-sm font-black tracking-tight max-md:gap-2',
            config.text
          )}
        >
          <Sparkles size={12} className="opacity-50" />
          {insight.title}
        </h4>
        <p className="text-[11px] font-bold leading-relaxed text-slate-600 dark:text-slate-300">
          {insight.message}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between pt-4">
        {insight.action && (
          <button
            className={cn(
              'flex items-center rounded-lg border border-transparent bg-white/50 px-3 py-2 text-[10px] font-black uppercase tracking-widest backdrop-blur-lg transition-all hover:border-current dark:bg-slate-900/50 max-md:gap-2',
              config.text
            )}
          >
            {insight.action}
            <ArrowUpRight size={10} />
          </button>
        )}
        <div className="flex items-center text-slate-400 max-md:gap-2">
          <TrendingUp size={12} className="opacity-30" />
        </div>
      </div>
    </div>
  );
};

export default AIInsightCard;
