/* eslint-disable max-lines-per-function -- sidebar listing saved vehicles with search and actions */
import React from 'react';
import { SavedVinCard } from '../SavedVinCard';
import type { VinAnalysisRecord } from '../../types';

export interface VinsListSidebarProps {
  filteredVins: VinAnalysisRecord[];
  selectedId: string | undefined;
  filterText: string;
  onFilterChange: (text: string) => void;
  onSelect: (record: VinAnalysisRecord) => void;
  onRequestDelete: (record: VinAnalysisRecord) => void;
  canDelete: boolean;
}

export const VinsListSidebar: React.FC<VinsListSidebarProps> = ({
  filteredVins,
  selectedId,
  filterText,
  onFilterChange,
  onSelect,
  onRequestDelete,
  canDelete,
}) => (
  <div className="space-y-2 lg:col-span-1">
    <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
          قائمة الشواصي ({filteredVins.length})
        </h4>
        {filterText !== '' && (
          <button
            type="button"
            onClick={() => {
              onFilterChange('');
            }}
            className="text-[10px] font-bold text-blue-600 hover:underline"
          >
            مسح الفلتر
          </button>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="بحث برقم الشاصي، الاسم (فيتز / Vitz)..."
          value={filterText}
          onChange={e => {
            onFilterChange(e.target.value);
          }}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
        />
      </div>

      <div className="custom-scrollbar max-h-[68vh] space-y-1.5 overflow-y-auto pr-0.5">
        {filteredVins.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">لا توجد نتائج مطابقة للبحث</p>
        ) : (
          filteredVins.map(v => (
            <SavedVinCard
              key={v.id}
              record={v}
              isActive={selectedId === v.id}
              onSelect={onSelect}
              onRequestDelete={onRequestDelete}
              canDelete={canDelete}
            />
          ))
        )}
      </div>
    </div>
  </div>
);
