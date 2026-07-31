
import React, { useState } from 'react';
import { AlertTriangle, X, ArrowLeft } from 'lucide-react';
import { cn } from '../../core/utils';

const AlertsSection: React.FC = () => {
    const [isVisible, setIsVisible] = useState(true);
    const criticalAlert = {
        id: 3,
        msg: 'تجاوز حد الائتمان المسموح به',
        source: 'العميل "شركة النور"',
        priority: 'critical'
    };

    if (!isVisible) return null;

    return (
        <div className={cn(
            "p-3 rounded-2xl border-2 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2",
            "bg-rose-50/50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30"
        )}>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/20 animate-pulse">
                    <AlertTriangle size={16} />
                </div>
                <div>
                    <p className="text-[9px] font-bold text-rose-800 dark:text-rose-300">
                        {criticalAlert.source} - <span className="opacity-70">{criticalAlert.msg}</span>
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button className="hidden sm:flex items-center gap-1 text-[9px] font-semibold text-rose-600 hover:underline">
                    اتخاذ إجراء <ArrowLeft size={10} />
                </button>
                <button
                    onClick={() => setIsVisible(false)}
                    className="p-1.5 text-rose-300 hover:text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

export default AlertsSection;
