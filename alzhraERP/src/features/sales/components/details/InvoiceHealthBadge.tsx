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
  const [result, setResult] = useState<{
    riskLevel: 'low' | 'medium' | 'high';
    alerts: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  const analyze = async () => {
    setIsLoading(true);
    try {
      const data = await aiService.analyzeInvoiceSuspicion(invoice);
      setResult(data);
      if (data.alerts.length > 0) setShowAlerts(true);
    } catch {
      /* ignore */
    }
    setIsLoading(false);
  };

  const colors = {
    low: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      label: 'سليمة ✅',
    },
    medium: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
      label: 'تحتاج مراجعة ⚠️',
    },
    high: {
      bg: 'bg-rose-100 dark:bg-rose-900/30',
      text: 'text-rose-700 dark:text-rose-400',
      label: 'مشبوهة 🚨',
    },
  };

  if (!result) {
    return (
      <button
        onClick={analyze}
        disabled={isLoading}
        className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-gray-500 transition-all hover:bg-blue-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-blue-950/20"
      >
        {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} />}
        فحص AI
      </button>
    );
  }

  const c = colors[result.riskLevel];
  const Icon =
    result.riskLevel === 'low' ? ShieldCheck : result.riskLevel === 'medium' ? Shield : ShieldAlert;

  return (
    <div className="relative">
      <button
        onClick={() => {
          setShowAlerts(!showAlerts);
        }}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all ${c.bg} ${c.text}`}
      >
        <Icon size={12} />
        {c.label}
      </button>

      {showAlerts && result.alerts.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 min-w-[250px] space-y-1.5 rounded-xl border bg-[var(--app-surface)] p-3 shadow-xl dark:border-slate-800">
          <p className="mb-2 text-[10px] font-bold uppercase text-gray-400">تنبيهات الفحص الذكي</p>
          {result.alerts.map((alert, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-400"
            >
              <span className="flex-shrink-0 text-amber-500">⚡</span>
              <span className="font-medium">{alert}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvoiceHealthBadge;
