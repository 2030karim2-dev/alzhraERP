import React from 'react';
import { Package, ExternalLink, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { EntityCardMetadata } from '../../types';
import { formatCurrency } from '../../../../core/utils';

interface Props {
  metadata: EntityCardMetadata;
}

export const ProductCard: React.FC<Props> = ({ metadata }) => {
  const navigate = useNavigate();
  const details = metadata.details || {};

  const partNumber = (details.part_number as string) || metadata.title;
  const brand = details.brand as string;
  const price = Number(details.price || 0);
  const totalStock = Number(details.total_stock ?? details.quantity ?? 0);
  const branchStock = details.branch_stock as Record<string, number> | undefined;

  const handleOpenProduct = () => {
    navigate(`/inventory?search=${encodeURIComponent(partNumber)}`);
  };

  return (
    <div className="my-2 max-w-sm rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-sm transition-all hover:border-[var(--accent)]/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-2 border-b border-[var(--app-border)]/60 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Package size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-[var(--app-text)]">{partNumber}</span>
              {brand && (
                <span className="rounded bg-[var(--app-surface-hover)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--app-text-secondary)]">
                  {brand}
                </span>
              )}
            </div>
            <p className="line-clamp-1 text-xs text-[var(--app-text-secondary)]">{metadata.subtitle || metadata.title}</p>
          </div>
        </div>
        <button
          onClick={handleOpenProduct}
          title="عرض في المخزون"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--accent)]"
        >
          <ExternalLink size={14} />
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-[var(--app-bg)] p-2">
          <span className="text-[10px] text-[var(--app-text-secondary)]">المخزون الكلي</span>
          <div className="flex items-center gap-1 font-bold">
            <span className={totalStock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
              {totalStock} قطعة
            </span>
          </div>
        </div>

        <div className="rounded-lg bg-[var(--app-bg)] p-2">
          <span className="text-[10px] text-[var(--app-text-secondary)]">سعر البيع</span>
          <div className="font-bold text-[var(--app-text)]">
            {formatCurrency(price)}
          </div>
        </div>
      </div>

      {branchStock && Object.keys(branchStock).length > 0 && (
        <div className="mt-2 rounded-lg bg-[var(--app-bg)] p-2 text-[11px]">
          <div className="mb-1 flex items-center gap-1 font-semibold text-[var(--app-text-secondary)]">
            <Layers size={12} />
            <span>المخزون حسب الفروع:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(branchStock).map(([branch, qty]) => (
              <span key={branch} className="rounded bg-[var(--app-surface)] px-1.5 py-0.5 text-[10px] border border-[var(--app-border)]">
                {branch}: <strong className={qty > 0 ? 'text-emerald-600' : 'text-zinc-500'}>{qty}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
