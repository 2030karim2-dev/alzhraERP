import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '../../../../core/utils';
import {
  AUTO_PARTS_CATALOGS,
  openCatalogSearch,
  openCatalogVinSearch,
} from '../../constants/catalogs';

export interface CatalogLauncherBadgesProps {
  vin?: string | null | undefined;
  searchQuery: string;
  onSelectCatalogId: (id: string) => void;
}

export const CatalogLauncherBadges: React.FC<CatalogLauncherBadgesProps> = ({
  vin,
  searchQuery,
  onSelectCatalogId,
}) => (
  <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
    <span className="ml-1 shrink-0 text-[11px] font-bold text-slate-500 dark:text-slate-400">
      الكتالوجات المعتمدة:
    </span>
    {AUTO_PARTS_CATALOGS.map(cat => (
      <button
        key={cat.id}
        type="button"
        onClick={() => {
          onSelectCatalogId(cat.id);
          openCatalogSearch(cat.id, searchQuery !== '' ? searchQuery : (vin ?? ''));
        }}
        className={cn(
          'shadow-2xs inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all',
          cat.colorClass.bg,
          cat.colorClass.text,
          cat.colorClass.border,
          cat.colorClass.hoverBg
        )}
        title={`${cat.description} - انقر للبحث في ${cat.nameEn}`}
      >
        <span>{cat.badge}</span>
        <ExternalLink size={11} className="opacity-70" />
      </button>
    ))}
    {vin != null && vin !== '' && (
      <button
        type="button"
        onClick={() => {
          openCatalogVinSearch('partsouq', vin);
        }}
        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
        title="فحص شاصي هذه المركبة في PartSouq"
      >
        <span>🇦🇪 فحص الشاصي في PartSouq ({vin})</span>
        <ExternalLink size={11} className="opacity-70" />
      </button>
    )}
  </div>
);
