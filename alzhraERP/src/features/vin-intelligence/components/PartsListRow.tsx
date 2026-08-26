import React from 'react';
import { Sparkles, ExternalLink } from 'lucide-react';
import { cn } from '../../../core/utils';
import { AUTO_PARTS_CATALOGS, type AutoPartsCatalog } from '../constants/catalogs';
import type { ExtractedPart } from '../types';

export type UiPart = ExtractedPart & { _key: string };

interface SourceBadgeProps {
  matchedCatalog?: AutoPartsCatalog | undefined;
  source: string;
}

const SourceBadge: React.FC<SourceBadgeProps> = ({ matchedCatalog, source }) => (
  <span
    className={cn(
      'inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold',
      matchedCatalog
        ? cn(
            matchedCatalog.colorClass.bg,
            matchedCatalog.colorClass.text,
            matchedCatalog.colorClass.border
          )
        : 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
    )}
  >
    {matchedCatalog ? matchedCatalog.nameEn : source === 'manual' ? 'يدوي' : source}
  </span>
);

interface PartsListRowProps {
  part: UiPart;
  isSelected: boolean;
  catalogId: string;
  onToggle: (key: string, checked: boolean) => void;
  onInspect: (partNumber: string) => void;
  onOpenCatalog: (partNumber: string) => void;
}

interface RowActionsCellProps {
  partNumber: string;
  catalogId: string;
  onInspect: (partNumber: string) => void;
  onOpenCatalog: (partNumber: string) => void;
}

const RowActionsCell: React.FC<RowActionsCellProps> = ({
  partNumber,
  catalogId,
  onInspect,
  onOpenCatalog,
}) => (
  <div className="flex items-center justify-center gap-1">
    <button
      type="button"
      onClick={() => {
        if (partNumber) onInspect(partNumber);
      }}
      className="rounded-lg p-1 text-amber-500 transition-colors hover:bg-amber-50 hover:text-amber-700 dark:hover:text-amber-300"
      title="فحص ذكي للبدائل والسيارات المتوافقة ونسبة الثقة"
    >
      <Sparkles size={13} />
    </button>
    {partNumber && (
      <button
        type="button"
        onClick={() => {
          onOpenCatalog(partNumber);
        }}
        className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:hover:text-blue-400"
        title={`فحص في ${catalogId}`}
      >
        <ExternalLink size={13} />
      </button>
    )}
  </div>
);

export const PartsListRow: React.FC<PartsListRowProps> = ({
  part: p,
  isSelected,
  catalogId,
  onToggle,
  onInspect,
  onOpenCatalog,
}) => {
  const matchedCatalog = AUTO_PARTS_CATALOGS.find(c => c.id === p.source);
  return (
    <tr
      className={cn(
        isSelected
          ? 'bg-blue-50/40 dark:bg-blue-950/20'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      )}
    >
      <td className="p-2.5 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={e => {
            onToggle(p._key, e.target.checked);
          }}
          className="rounded text-blue-600 focus:ring-blue-500"
        />
      </td>
      <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
        {p.partNumber || '—'}
      </td>
      <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
        {(p.description ?? '') || '—'}
      </td>
      <td className="p-2.5 text-slate-600 dark:text-slate-400">{(p.manufacturer ?? '') || '—'}</td>
      <td className="p-2.5 text-center">
        <SourceBadge matchedCatalog={matchedCatalog} source={p.source} />
      </td>
      <td className="p-2.5 text-center">
        <RowActionsCell
          partNumber={p.partNumber}
          catalogId={catalogId}
          onInspect={onInspect}
          onOpenCatalog={onOpenCatalog}
        />
      </td>
    </tr>
  );
};
