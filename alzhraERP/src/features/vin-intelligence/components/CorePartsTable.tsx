import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Wrench, ChevronDown, ChevronRight, Package } from 'lucide-react';
import type { VehicleCorePart } from '../types';
import { cn } from '../../../core/utils';
import { CATEGORY_LABELS, FITMENT_CONFIG } from './constants';
import { groupByCategory } from './utils';

interface CorePartsTableProps {
  parts: VehicleCorePart[];
  onPartClick?: (part: VehicleCorePart) => void;
}

const CorePartsTable: React.FC<CorePartsTableProps> = ({ parts, onPartClick }) => {
  const grouped = useMemo(() => groupByCategory(parts), [parts]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(Object.keys(grouped)));

  useEffect(() => {
    setExpanded(new Set(Object.keys(grouped)));
  }, [grouped]);

  const toggle = useCallback((cat: string) =>
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(cat) ? n.delete(cat) : n.add(cat);
      return n;
    }), []);

  return (
    <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl shadow-sm overflow-hidden">
      {Object.keys(grouped).map(cat => {
        const catParts = grouped[cat]; const isExp = expanded.has(cat);
        return (
          <div key={cat} className="border-b border-[var(--app-border)] last:border-b-0">
            <button onClick={() => toggle(cat)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--app-surface-hover)] transition-all">
              <div className="flex items-center gap-2">
                {isExp ? <ChevronDown size={12} className="text-[var(--app-text-secondary)]" /> : <ChevronRight size={12} className="text-[var(--app-text-secondary)]" />}
                <Wrench size={12} className="text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)]">{CATEGORY_LABELS[cat] || cat}</span>
              </div>
              <span className="text-[9px] font-bold text-[var(--app-text-secondary)]">{catParts.length} Parts</span>
            </button>
            {isExp && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-[var(--app-bg)] border-b border-[var(--app-border)]">
                    <th className="px-3 py-1.5 text-left text-[8px] font-black uppercase tracking-widest text-[var(--app-text-secondary)]">Part</th>
                    <th className="px-3 py-1.5 text-left text-[8px] font-black uppercase tracking-widest text-[var(--app-text-secondary)] w-20">Position</th>
                    <th className="px-3 py-1.5 text-left text-[8px] font-black uppercase tracking-widest text-[var(--app-text-secondary)] w-28">OEM</th>
                    <th className="px-3 py-1.5 text-center text-[8px] font-black uppercase tracking-widest text-[var(--app-text-secondary)] w-24">Fitment</th>
                    <th className="px-3 py-1.5 text-right text-[8px] font-black uppercase tracking-widest text-[var(--app-text-secondary)] w-16">Stock</th>
                    <th className="px-3 py-1.5 text-center text-[8px] font-black uppercase tracking-widest text-[var(--app-text-secondary)] w-20">Status</th>
                  </tr></thead>
                  <tbody>{catParts.map(part => {
                    const fm = FITMENT_CONFIG[part.fitmentStatus];
                    const qty = part.inventoryMatches.reduce((s, m) => s + m.quantity, 0);
                    return (
                      <tr key={part.id} onClick={() => onPartClick?.(part)} className="border-b border-[var(--app-border)] hover:bg-[var(--app-surface-hover)] transition-all cursor-pointer">
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0"><Package size={10} /></div>
                            <div className="min-w-0"><span className="font-bold text-[10px] text-[var(--app-text)] block truncate">{part.canonicalPartName}</span>
                              {part.side && part.side !== 'NONE' && <span className="text-[7px] font-bold text-indigo-500 uppercase">{part.side}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-1.5"><span className="text-[9px] font-mono font-bold text-[var(--app-text-secondary)] bg-slate-50 dark:bg-slate-900/40 px-1.5 py-0.5 rounded">{part.position || '—'}</span></td>
                        <td className="px-3 py-1.5"><span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[9px] bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded">{part.oemNumbers[0] || '—'}</span></td>
                        <td className="px-3 py-1.5 text-center"><span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-widest border", fm.cls)}>{fm.icon}{fm.label}</span></td>
                        <td className="px-3 py-1.5 text-right"><span className={cn("font-bold font-mono text-[10px] px-1.5 py-0.5 rounded-md", qty > 0 ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20')}>{qty}</span></td>
                        <td className="px-3 py-1.5 text-center">{qty > 0 ? <span className="text-[7px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded uppercase tracking-widest">IN STOCK</span> : part.fitmentStatus === 'NOT_COMPATIBLE' ? <span className="text-[7px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded uppercase tracking-widest">N/A</span> : <span className="text-[7px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded uppercase tracking-widest">OUT OF STOCK</span>}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CorePartsTable;
