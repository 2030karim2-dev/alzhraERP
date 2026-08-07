import React from 'react';
import { Package, MapPin, CheckCircle2 } from 'lucide-react';
import type { InventoryMatch } from '../types';
import { formatCurrency } from '@/core/utils';
import { useTranslation } from '../../../lib/hooks/useTranslation';

const InventoryMatches: React.FC<{ matches: InventoryMatch[] }> = ({ matches }) => {
  const { t } = useTranslation();
  if (!matches.length) return null;
  return (
    <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl shadow-sm p-3">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)] mb-2 flex items-center gap-1.5">
        <Package size={12} className="text-blue-500" /> {t('vin_matching_inventory')}
      </h3>
      <div className="space-y-1.5">
        {matches.map((m, i) => (
          <div key={i} className="bg-[var(--app-bg)] border border-[var(--app-border)] rounded-lg p-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
            <div><span className="text-[8px] text-[var(--app-text-secondary)] uppercase tracking-widest">{t('vin_oem_col')}</span><p className="font-mono font-bold text-indigo-600">{m.sku}</p></div>
            <div><span className="text-[8px] text-[var(--app-text-secondary)] uppercase tracking-widest">{t('vin_product_col')}</span><p className="font-bold text-[var(--app-text)] truncate">{m.productNameAr || m.productName}</p></div>
            <div><span className="text-[8px] text-[var(--app-text-secondary)] uppercase tracking-widest">{t('vin_location_col')}</span><p className="font-bold flex items-center gap-1"><MapPin size={10} />{m.warehouse} / {m.location}</p></div>
            <div className="flex items-center gap-3">
              <div><span className="text-[8px] text-[var(--app-text-secondary)] uppercase tracking-widest">{t('vin_qty_col')}</span><p className="font-bold text-emerald-600 text-sm">{m.quantity}</p></div>
              {m.price && <div><span className="text-[8px] text-[var(--app-text-secondary)] uppercase tracking-widest">{t('vin_price_col')}</span><p className="font-bold text-blue-600">{formatCurrency(m.price)}</p></div>}
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InventoryMatches;
