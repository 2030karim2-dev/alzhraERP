
import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import { aiService } from '../../../ai/service';

interface Props {
    invoice: {
        number: string;
        total: number;
        itemCount: number;
        customerName: string;
        customerDebt: number;
        avgInvoiceTotal: number;
    };
}

const InvoiceHealthBadge: React.FC<Props> = ({ invoice }) => {
    const [result, setResult] = useState<{ riskLevel: 'low' | 'medium' | 'high'; alerts: string[] } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showAlerts, setShowAlerts] = useState(false);

    const analyze = async () => {
        setIsLoading(true);
        try {
            const data = await aiService.analyzeInvoiceSuspicion(invoice);
            setResult(data);
            if (data.alerts.length > 0) setShowAlerts(true);
        } catch { /* ignore */ }
        setIsLoading(false);
    };

    const colors = {
        low: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'سليمة ✅' },
        medium: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'تحتاج مراجعة ⚠️' },
        high: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-400', label: 'مشبوهة 🚨' },
    };

    if (!result) {
        return (
            <button
                onClick={analyze}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-all text-gray-500 dark:text-slate-400"
            >
                {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} />}
                فحص AI
            </button>
        );
    }

    const c = colors[result.riskLevel];
    const Icon = result.riskLevel === 'low' ? ShieldCheck : result.riskLevel === 'medium' ? Shield : ShieldAlert;

    return (
        <div className="relative">
            <button
                onClick={() => setShowAlerts(!showAlerts)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${c.bg} ${c.text}`}
            >
                <Icon size={12} />
                {c.label}
            </button>

            {showAlerts && result.alerts.length > 0 && (
                <div className="absolute top-full mt-2 left-0 right-0 min-w-[250px] z-50 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-xl p-3 space-y-1.5">
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">تنبيهات الفحص الذكي</p>
                    {result.alerts.map((alert, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-400">
                            <span className="text-amber-500 flex-shrink-0">⚡</span>
                            <span className="font-medium">{alert}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default InvoiceHealthBadge;
