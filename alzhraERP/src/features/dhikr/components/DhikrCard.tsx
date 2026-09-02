import React from 'react';
import { Copy, Check, Repeat, RotateCcw } from 'lucide-react';
import type { DhikrItem } from '../types';

interface DhikrCardProps {
  item: DhikrItem;
  idx: number;
  themeColor: string;
  copiedId: string | null;
  onCopy: (item: DhikrItem) => void;
  onSendToCounter: (item: DhikrItem) => void;
}

/** Single dhikr card (list item) — extracted from PrayerTimesModal. */
/* eslint-disable-next-line max-lines-per-function -- presentational card boundary; splitting a 57-line card hurts cohesion (same documented exemption pattern as VinsTab) */
export const DhikrCard: React.FC<DhikrCardProps> = ({
  item,
  idx,
  themeColor,
  copiedId,
  onCopy,
  onSendToCounter,
}) => (
  <div className="group relative rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:border-emerald-300 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-800">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${themeColor}`}
        >
          {idx + 1}
        </span>
        <div className="space-y-1.5">
          <p className="text-sm font-bold leading-relaxed text-slate-900 dark:text-slate-100">
            «{item.text}»
          </p>
          {Boolean(item.source) && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.source}</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {item.repeatCount != null && item.repeatCount > 0 && (
          <span className="flex items-center gap-0.5 rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Repeat size={11} />
            <span>{item.repeatCount} مرات</span>
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            onCopy(item);
          }}
          title="نسخ الذكر"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-700"
        >
          {copiedId === item.id ? (
            <Check size={14} className="text-emerald-600" />
          ) : (
            <Copy size={14} />
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            onSendToCounter(item);
          }}
          title="نقل إلى السبحة الإلكترونية"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950/40"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  </div>
);
