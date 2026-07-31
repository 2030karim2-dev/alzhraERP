import React from 'react';
import { Lightbulb,  AlertTriangle, Target, CheckCircle, Info } from 'lucide-react';
import { cn } from '../../../core/utils';

interface Insight {
    id: string;
    type: 'success' | 'warning' | 'info' | 'target';
    message: string;
    detail?: string;
}

interface QuickInsightsProps {
    insights?: Insight[];
    className?: string;
}

const QuickInsights: React.FC<QuickInsightsProps> = ({
    insights,
    className
}) => {
    const hasInsights = insights && insights.length > 0;

    const getIcon = (type: Insight['type']) => {
        switch (type) {
            case 'success':
                return <CheckCircle size={14} className="text-emerald-500" />;
            case 'warning':
                return <AlertTriangle size={14} className="text-amber-500" />;
            case 'info':
                return <Info size={14} className="text-blue-500" />;
            case 'target':
                return <Target size={14} className="text-purple-500" />;
        }
    };

    const getBgClass = (type: Insight['type']) => {
        switch (type) {
            case 'success':
                return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800';
            case 'warning':
                return 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800';
            case 'info':
                return 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800';
            case 'target':
                return 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800';
        }
    };

    return (
        <div className={cn(
            "bg-[var(--app-surface)] border border-[var(--app-border)] p-5 rounded-2xl",
            className
        )}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <Lightbulb size={16} className="text-amber-500" />
                </div>
                <h3 className="text-sm font-bold text-[var(--app-text)]">
                    رؤى ذكية
                </h3>
            </div>

            {/* Insights List */}
            {!hasInsights ? (
                <div className="text-center py-6">
                    <Lightbulb size={24} className="mx-auto text-[var(--app-text-secondary)] mb-2" />
                    <p className="text-xs font-bold text-[var(--app-text-secondary)]">لا توجد رؤى</p>
                    <p className="text-[10px] text-[var(--app-text-secondary)] mt-1">أضف بيانات لمشاهدة التحليلات</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {insights.map((insight) => (
                        <div
                            key={insight.id}
                            className={cn(
                                "flex items-start gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01]",
                                getBgClass(insight.type)
                            )}
                        >
                            <div className="flex-shrink-0 mt-0.5">
                                {getIcon(insight.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[var(--app-text)] leading-relaxed">
                                    {insight.message}
                                </p>
                                {insight.detail && (
                                    <p className="text-[10px] font-medium text-[var(--app-text-secondary)] mt-0.5">
                                        {insight.detail}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer - Only show if there are insights */}
            {hasInsights && (
                <div className="mt-4 pt-3 border-t border-[var(--app-border)]">
                    <p className="text-[9px] text-[var(--app-text-secondary)] text-center font-medium">
                        آخر تحديث: الآن
                    </p>
                </div>
            )}
        </div>
    );
};

export default QuickInsights;
