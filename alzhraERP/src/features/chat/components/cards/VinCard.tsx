import React from 'react';
import { Car, ExternalLink, Calendar, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { EntityCardMetadata } from '../../types';

interface Props {
  metadata: EntityCardMetadata;
}

export const VinCard: React.FC<Props> = ({ metadata }) => {
  const navigate = useNavigate();
  const details = metadata.details || {};

  const vin = (details.vin as string) || metadata.title;
  const make = (details.make as string) || '';
  const model = (details.model as string) || '';
  const year = (details.year as string | number) || '';
  const engine = (details.engine as string) || '';

  const handleOpenVin = () => {
    navigate(`/vin?vin=${encodeURIComponent(vin)}`);
  };

  return (
    <div className="my-2 max-w-sm rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-sm transition-all hover:border-[var(--accent)]/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-2 border-b border-[var(--app-border)]/60 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Car size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[var(--app-text)]">{vin}</span>
            </div>
            <p className="text-xs font-semibold text-[var(--app-text)]">
              {make} {model} {year}
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenVin}
          title="فحص رقم الهيكل"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--accent)]"
        >
          <ExternalLink size={14} />
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
        {year && (
          <div className="flex items-center gap-1.5 rounded-lg bg-[var(--app-bg)] p-2">
            <Calendar size={13} className="text-[var(--app-text-secondary)]" />
            <div>
              <span className="block text-[10px] text-[var(--app-text-secondary)]">سنة الصنع</span>
              <strong className="text-[var(--app-text)]">{year}</strong>
            </div>
          </div>
        )}

        {engine && (
          <div className="flex items-center gap-1.5 rounded-lg bg-[var(--app-bg)] p-2">
            <Wrench size={13} className="text-[var(--app-text-secondary)]" />
            <div>
              <span className="block text-[10px] text-[var(--app-text-secondary)]">المحرك</span>
              <strong className="text-[var(--app-text)]">{engine}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
