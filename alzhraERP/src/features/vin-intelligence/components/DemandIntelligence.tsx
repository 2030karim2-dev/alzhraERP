import React from 'react';
import { TrendingUp, Zap } from 'lucide-react';
import type { DemandInsight } from '../types';
import { useTranslation } from '../../../lib/hooks/useTranslation';

const DemandIntelligence: React.FC<{ insights: DemandInsight[] }> = ({ insights }) => {
  const { t } = useTranslation();
  if (!insights.length) return null;
  return (
    <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl shadow-sm p-3">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)] mb-2 flex items-center gap-1.5">
        <TrendingUp size={12} className="text-orange-500" /> {t('vin_demand_intel')}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full"><thead><tr className="bg-[var(--app-bg)] border-b border-[var(--app-border)]">
          <th className="px-3 py-1.5 text-left text-[8px] font-black uppercase tracking-widest text-[var(--app-text-secondary)]">Part</th>
          <th className="px-3 py-1.5 text-center text-[8px] font-black uppercase tracking-widest text-[var(--app-text-secondary)] w-20">Demand</th>
          <th className="px-3 py-1.5 text-center text-[8px] font-black uppercase tracking-widest text-[var(--app-text-secondary)] w-16">Sales</th>
          <th className="px-3 py-1.5 text-center text-[8px] font-black uppercase tracking-widest text-[var(--app-text-secondary)] w-20">Matches</th>
        </tr></thead><tbody>
          {insights.map(d => (
            <tr key={d.partId} className="border-b border-[var(--app-border)] hover:bg-[var(--app-surface-hover)]">
              <td className="px-3 py-1.5"><span className="font-bold text-[10px] text-[var(--app-text)]">{d.partName}</span></td>
              <td className="px-3 py-1.5 text-center">
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-widest ${
                  d.demandLevel === 'HIGH' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' :
                  d.demandLevel === 'MEDIUM' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {d.isFastMoving && <Zap size={8} />}
                  {d.demandLevel}
                </span>
              </td>
              <td className="px-3 py-1.5 text-center"><span className="font-bold font-mono text-[10px] text-[var(--app-text)]">{d.salesCount.toLocaleString()}</span></td>
              <td className="px-3 py-1.5 text-center"><span className="font-bold font-mono text-[10px] text-blue-600">{d.vehicleMatches.toLocaleString()}</span></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
};

export default DemandIntelligence;
