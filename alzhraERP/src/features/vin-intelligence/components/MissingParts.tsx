import React from 'react';
import { AlertTriangle, ShoppingCart } from 'lucide-react';
import type { VehicleCorePart } from '../types';
import { useTranslation } from '../../../lib/hooks/useTranslation';

const MissingParts: React.FC<{ parts: VehicleCorePart[] }> = ({ parts }) => {
  const { t } = useTranslation();
  if (!parts.length) return null;
  return (
    <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl shadow-sm p-3">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)] mb-2 flex items-center gap-1.5">
        <AlertTriangle size={12} className="text-rose-500" /> {t('vin_missing_parts')}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full"><thead><tr className="bg-[var(--app-bg)] border-b border-[var(--app-border)]">
          <th className="px-3 py-1.5 text-left text-[8px] font-black uppercase tracking-widest text-[var(--app-text-secondary)]">{t('vin_part_col')}</th>
          <th className="px-3 py-1.5 text-left text-[8px] font-black uppercase tracking-widest text-[var(--app-text-secondary)] w-28">{t('vin_oem_col')}</th>
          <th className="px-3 py-1.5 text-center text-[8px] font-black uppercase tracking-widest text-[var(--app-text-secondary)] w-20">{t('vin_stock_col')}</th>
          <th className="px-3 py-1.5 text-center text-[8px] font-black uppercase tracking-widest text-[var(--app-text-secondary)] w-28">{t('vin_action_col')}</th>
        </tr></thead><tbody>
          {parts.slice(0, 10).map(p => (
            <tr key={p.id} className="border-b border-[var(--app-border)] hover:bg-[var(--app-surface-hover)]">
              <td className="px-3 py-1.5"><span className="font-bold text-[10px] text-[var(--app-text)]">{p.canonicalPartName}</span></td>
              <td className="px-3 py-1.5"><span className="font-mono font-bold text-[9px] text-indigo-600">{p.oemNumbers[0] || '—'}</span></td>
              <td className="px-3 py-1.5 text-center"><span className="font-bold text-[10px] text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded">0</span></td>
              <td className="px-3 py-1.5 text-center">
                <button className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-[var(--app-text-secondary)] rounded text-[8px] font-bold uppercase tracking-widest opacity-50 cursor-not-allowed" disabled title={t('vin_coming_backend')}>
                  <ShoppingCart size={10} /> {t('vin_add_to_purchase')}
                </button>
              </td>
            </tr>
          ))}
        </tbody></table>
      </div>
      {parts.length > 10 && <p className="text-[9px] text-[var(--app-text-secondary)] mt-2 text-center">{t('vin_more_missing', { count: parts.length - 10 })}</p>}
    </div>
  );
};

export default MissingParts;
